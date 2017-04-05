window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) { window.setTimeout(callback, 1000 / 60); };

function randf(min, max) {
	if(min === undefined) 	min = 0;
	if(max === undefined)	max = 1;
	return min + Math.random() * (max - min);
}

function inRange(x, min, max) {
	return x >= min && x <= max;
}

function clamp(x, min, max) {
	return x < min ? min : (x > max ? max : x);
}


function vec2(x, y) {
	return {x: x, y: y};
}

function GameState() {
	var balls = [];
	
	for(var i = 0; i < 10; ++i) {
		var r = randf(10, 60);
		
		balls.push({
			r: r,
			pos: vec2(randf(r, canvas.width - r), randf(r, canvas.height - r)),
			vel: vec2(randf(100, 300) * (randf() < 0.5 ? -1 : 1), randf(100, 300) * (randf() < 0.5 ? -1 : 1))
		});
	}

	this.balls = balls;
}

GameState.prototype.logic = function(dt) {
	for(var i = 0; i < this.balls.length; ++i) {
		var ball = this.balls[i];
		ball.pos.x += ball.vel.x * dt;
		ball.pos.y += ball.vel.y * dt;
		ball.vel.x *= inRange(ball.pos.x, ball.r, canvas.width - ball.r) ? 1 : -1;
		ball.vel.y *= inRange(ball.pos.y, ball.r, canvas.height - ball.r) ? 1 : -1;
		ball.pos.x = clamp(ball.pos.x, ball.r, canvas.width - ball.r);
		ball.pos.y = clamp(ball.pos.y, ball.r, canvas.height - ball.r);
	}
}


function Renderer(canvas, context) {
	this.canvas = canvas;
	this.context = context;
}

function drawCircle(context, x, y, r, col) {
	context.beginPath();
	context.arc(x, y, r, 0, 2 * Math.PI, false);
	context.fillStyle = col;
	context.fill();
}

Renderer.prototype.render = function(gameState) {
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	for(var i = 0; i < gameState.balls.length; ++i)
		drawCircle(this.context, gameState.balls[i].pos.x, gameState.balls[i].pos.y, gameState.balls[i].r, "green");
};






function FakeDispatcher(router, sourceHandle) {
  this.router = router;
  this.sourceHandle = sourceHandle;
}

FakeDispatcher.prototype.send = function(targetHandle, msg) {
  var targetObj = this.router[targetHandle];
  
  if(msg.type in targetObj)
    targetObj[msg.type](this.sourceHandle, msg);
  else
    targetObj.onMessage(this.sourceHandle, msg);
};





function Server(dispatcher) {
  this.dispatcher = dispatcher;
  this.clients = {};
  this.lastUpdateTime = performance.now();
  this.gameState = new GameState();
  
  var self = this;
  setInterval(function() {
	  self.deliverUpdates();
  }, 1000/30);
}

Server.prototype.connect = function(senderHandle, msg) {
  this.clients[senderHandle] = {
	  handle: senderHandle
  };
  
  this.dispatcher.send(senderHandle, {
	  type: "connectionAccepted",
	  gameState: this.gameState
  });
};

Server.prototype.disconnect = function(senderHandle, msg) {
	delete this.clients[senderHandle];
};

Server.prototype.onMessage = function(senderHandle, msg) {
	throw new Error("Unhandled message type: " + msg.type);
};

Server.prototype.deliverUpdates = function() {
	var t = performance.now();
	var dt = (t - this.lastUpdateTime) / 1000;
	
	this.lastUpdateTime = t;
	this.gameState.logic(dt);
	
	var self = this;
	Object.keys(this.clients).forEach(function(key) {
		self.dispatcher.send(self.clients[key].handle, {
			type: "update",
			gameState: self.gameState
		});
	});
};



function Client(renderer, dispatcher) {
	this.gameState = null;
	this.renderer = renderer;
	this.renderingEnabled = true;
	this.dispatcher = dispatcher;
	
	var self = this;
	
	this.renderLoop = function() {
		if(self.renderingEnabled) {
			renderer.render(self.gameState);
			requestAnimFrame(self.renderLoop);
		}
	};
	
	console.log("Constructed!");
}

Client.prototype.connectTo = function(serverHandle) {
	this.dispatcher.send(serverHandle, {
		type: "connect"
	});
};

Client.prototype.connectionAccepted = function(sender, msg) {
	console.log("Connection accepted!");
	this.gameState = msg.gameState;
	requestAnimFrame(this.renderLoop);
};

Client.prototype.update = function(sender, msg) {
	this.gameState = msg.gameState;
};

Client.prototype.onMessage = function(sender, msg) {
	throw new Error("Unhandled message type: " + msg.type);
};

Client.prototype.setRenderingEnabled = function(renderingEnabled) {
	this.renderingEnabled = renderingEnabled;
};










var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var router = {};
var server = new Server(new FakeDispatcher(router, "server"));
var client = new Client(new Renderer(canvas, context), new FakeDispatcher(router, "client"));

router.client = client;
router.server = server;

client.connectTo("server");