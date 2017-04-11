window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

function randf(min, max) {
	if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    return min + Math.random() * (max - min);
}

function inRange(x, min, max) {
    return x >= min && x <= max;
}

function clamp(x, min, max) {
    return x < min ? min : (x > max ? max : x);
}


function vec2(x, y) {
    return {
        x: x,
        y: y
    };
}

var keystates = {};

document.body.addEventListener('keydown', function(e) {
    keystates[e.key] = true;
});


document.body.addEventListener('keyup', function(e) {
    keystates[e.key] = false;
});

// *************
// * GameState *
// *************

function GameState(arenaWidth, arenaHeight) {
    var balls = [];
    var w = arenaWidth,
        h = arenaHeight;

    for (var i = 0; i < 10; ++i) {
        var r = randf(15, 30);

        balls.push({
            r: r,
            pos: vec2(randf(r, w - r), randf(r, h - r)),
            vel: vec2(randf(100, 300) * (randf() < 0.5 ? -1 : 1), randf(100, 300) * (randf() < 0.5 ? -1 : 1))
        });
    }

    this.balls = balls;
    this.players = [];
    this.arenaWidth = w;
    this.arenaHeight = h;
}

GameState.prototype.addPlayer = function() {
    var r = 15;
    var player = {
        r: r,
        pos: vec2(randf(r, this.arenaWidth - r), randf(r, this.arenaHeight - r)),
        vel: vec2(0, 0),
        handleCommands: function(commands) {
            this.vel.x += commands.moveX * 35;
            this.vel.y += commands.moveY * 35;
        }
    };

    this.players.push(player);
    return player;
};

function collisionTest(a, b) {
    var dx = b.pos.x - a.pos.x;
    var dy = b.pos.y - a.pos.y;
    var rsum = a.r + b.r;
    return dx * dx + dy * dy <= rsum * rsum;
}

function collisionResponse(a, b, bounciness) {
    var dx = b.pos.x - a.pos.x;
    var dy = b.pos.y - a.pos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var mtd = (dist - (a.r + b.r));
    var lenVa = Math.sqrt(a.vel.x * a.vel.x + a.vel.y * a.vel.y) * bounciness;
    var lenVb = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y) * bounciness;

    dx /= dist;
    dy /= dist;

    a.pos.x += dx * mtd * 0.5;
    a.pos.y += dy * mtd * 0.5;
    b.pos.x -= dx * mtd * 0.5;
    b.pos.y -= dy * mtd * 0.5;

    a.vel.x = -dx * lenVb;
    a.vel.y = -dy * lenVb;
    b.vel.x = dx * lenVa;
    b.vel.y = dy * lenVa;
}

GameState.prototype.moveBall = function(ball, dt, friction, bounciness) {
    var w = this.arenaWidth,
        h = this.arenaHeight;

    ball.pos.x += ball.vel.x * dt;
    ball.pos.y += ball.vel.y * dt;
    ball.vel.x *= inRange(ball.pos.x, ball.r, w - ball.r) ? friction : -bounciness;
    ball.vel.y *= inRange(ball.pos.y, ball.r, h - ball.r) ? friction : -bounciness;
    ball.pos.x = clamp(ball.pos.x, ball.r, w - ball.r);
    ball.pos.y = clamp(ball.pos.y, ball.r, h - ball.r);
}

GameState.prototype.logic = function(dt) {
    var w = this.arenaWidth,
        h = this.arenaHeight;
    var i, j;

    for (i = this.balls.length - 1; i >= 0; --i) {
		if(this.balls[i].remFlag)
			this.balls.splice(i, 1);	
		else
			this.moveBall(this.balls[i], dt, 0.95, 0.8);
	}

    for (i = this.players.length - 1; i >= 0; --i) {
		if(this.players[i].remFlag)
			this.players.splice(i, 1);	
		else
			this.moveBall(this.players[i], dt, 0.87, 0);
	}

    for (i = 0; i < this.balls.length; ++i)
        for (j = i + 1; j < this.balls.length; ++j)
            if (collisionTest(this.balls[i], this.balls[j]))
                collisionResponse(this.balls[i], this.balls[j], 0.8);

    for (i = 0; i < this.balls.length; ++i)
        for (j = 0; j < this.players.length; ++j)
            if (collisionTest(this.balls[i], this.players[j]))
                collisionResponse(this.balls[i], this.players[j], 0.8);
}

// ************
// * Renderer *
// ************

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
    var i;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (i = 0; i < gameState.balls.length; ++i)
        drawCircle(this.context, gameState.balls[i].pos.x, gameState.balls[i].pos.y, gameState.balls[i].r, "green");

    for (i = 0; i < gameState.players.length; ++i)
        drawCircle(this.context, gameState.players[i].pos.x, gameState.players[i].pos.y, gameState.players[i].r, "blue");
};

// ******************
// * FakeDispatcher *
// ******************

function FakeDispatcher(router, sourceHandle) {
    var messageBuffer = [];
    var lastTickTime = performance.now();

    setInterval(function() {
        var t = performance.now();
        var dt = (t - lastTickTime) / 1000;
        lastTickTime = t;

        for (var i = messageBuffer.length - 1; i >= 0; --i) {
            var entry = messageBuffer[i];
            entry.delay -= dt;

            if (entry.delay <= 0) {
                messageBuffer.splice(i, 1);

                if (Math.random() < 0.6) {
                    var targetObj = router[entry.targetHandle];
                    if (entry.message.type in targetObj)
                        targetObj[entry.message.type](sourceHandle, entry.message);
                    else
                        targetObj.onMessage(sourceHandle, entry.message);
                }
            }
        }
    }, 10);

    this.messageBuffer = messageBuffer;
    this.lag = 0.2;
}

FakeDispatcher.prototype.send = function(targetHandle, msg) {
    this.messageBuffer.push({
        delay: this.lag,
        targetHandle: targetHandle,
        message: msg
    });
};

// **********
// * Server *
// **********

function RemoteClient(handle, player) {
	this.handle = handle;
	this.player = player;
	this.outgoingQueue = [];
	this.lastAck = -1;
}

function Server(dispatcher) {
    this.dispatcher = dispatcher;
	this.incomingQueues = {};
    this.clients = {};
    this.lastUpdateTime = performance.now();
    this.gameState = new GameState(512, 512);
	this.updateCount = 0;

    var self = this;
    setInterval(function() {
        self.update();
    }, 1000 / 100);
}

Server.prototype.onMessage = function(senderHandle, msg) {
	if(!(msg.type in this.incomingQueues))
		this.incomingQueues[msg.type] = [];
	
	this.incomingQueues[msg.type].push({
		senderHandle: senderHandle,
		message: msg
	});
};

Server.prototype.handleConnections = function() {
	var queue = this.incomingQueues.connect;
	
	if(!queue || queue.length === 0)
		return;
	
	for(var i = 0; i < queue.length; ++i) {
		var senderHandle = queue[i].senderHandle;
		var msg = queue[i].message;
		
		if (!(senderHandle in this.clients))
			this.clients[senderHandle] = new RemoteClient(senderHandle, this.gameState.addPlayer());
		else
			console.log(senderHandle, "is already connected!");
	}
	
	this.incomingQueues.connect = [];
};

Server.prototype.handleDisconnections = function() {
	var queue = this.incomingQueues.disconnect;
	
	if(!queue || queue.length === 0)
		return;
	
	for(var i = 0; i < queue.length; ++i) {
		var senderHandle = queue[i].handle;
		this.clients[senderHandle].player.remFlag = true;
		delete this.clients[senderHandle];
	}
	
	this.incomingQueues.disconnect = [];
};

Server.prototype.handlePlayerCommands = function() {
	var queue = this.incomingQueues.playerCommands;

	if(!queue || queue.length === 0)
		return;
	
	for(var i = 0; i < queue.length; ++i) {
		var senderHandle = queue[i].senderHandle;
		var msg = queue[i].message;
		var client = this.clients[senderHandle];
		client.lastAck = msg.ack;
		
		//console.log("received ack: ", msg.ack, "on", this.updateCount);
		for(var j = 0; j < client.outgoingQueue.length; ++j)
			if(client.outgoingQueue[j].updateNum > client.lastAck)
				break;
		
		client.outgoingQueue.splice(0, j);
		client.player.handleCommands(msg.commands);
	}
	
	this.incomingQueues.playerCommands = [];
};

Server.prototype.update = function() {
    var t = performance.now();
    var dt = (t - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = t;
	
	this.handleDisconnections();
	this.handlePlayerCommands();
    this.gameState.logic(dt);
	this.handleConnections();
	
    var str = JSON.stringify(this.gameState);
	
    var self = this;
    Object.keys(this.clients).forEach(function(key) {
		if(self.updateCount % 10 === 0) {
			self.clients[key].outgoingQueue.push({
				updateNum: self.updateCount,
				message: {
					type: "ping",
					serial: self.updateCount / 10
				},
			});
		}
		
        self.dispatcher.send(self.clients[key].handle, {
            type: "update",
			messages: self.clients[key].outgoingQueue.map(function(e) {
				return e.message;
			}),
			updateNum: self.updateCount,
            gameState: str
        });
		
    });
	
	++this.updateCount;
};

// **********
// * Client *
// **********

function Client(renderer, dispatcher) {
    this.gameState = null;
    this.renderer = renderer;
    this.renderingEnabled = true;
    this.dispatcher = dispatcher;
    this.serverHandle = null;
	this.lastUpdateNum = -1;
	
    var self = this;

    this.renderLoop = function() {
        if (self.renderingEnabled) {
            self.dispatcher.send(self.serverHandle, {
                type: "playerCommands",
                commands: self.generateCommands(),
				ack: self.lastUpdateNum
            });

            renderer.render(self.gameState);
            requestAnimFrame(self.renderLoop);
        }
    };
}

Client.prototype.generateCommands = function() {
    var moveX = 0,
        moveY = 0;

    if (keystates["a"])
        moveX = -1;
    else if (keystates["d"])
        moveX = 1;
    if (keystates["w"])
        moveY = -1;
    else if (keystates["s"])
        moveY = 1;

    return {
        moveX: moveX,
        moveY: moveY
    };
}

Client.prototype.connectTo = function(serverHandle) {
    var self = this;
    var attemptConnection = function() {
        console.log("Connecting...");

        if (!self.serverHandle) {
			self.dispatcher.send(serverHandle, {
                type: "connect"
            });
            setTimeout(attemptConnection, 500);
        }
    };
    attemptConnection();
};

Client.prototype.update = function(sender, msg) {
	if(!this.serverHandle) {
		console.log("Connection accepted!");
		this.serverHandle = sender;
		this.gameState = JSON.parse(msg.gameState);
		requestAnimFrame(this.renderLoop);
	}
	
	//console.log("extra:", msg.messages.map(function(m) {
	//	return m.serial;
	//}), msg.updateNum);
	
	this.lastUpdateNum = msg.updateNum;
    this.gameState = JSON.parse(msg.gameState);
};

Client.prototype.onMessage = function(sender, msg) {
    throw new Error("Unhandled message type: " + msg.type);
};

Client.prototype.setRenderingEnabled = function(renderingEnabled) {
    this.renderingEnabled = renderingEnabled;
};

// *********
// * Misc. *
// *********

var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var router = {};
var server = new Server(new FakeDispatcher(router, "server"));
var client = new Client(new Renderer(canvas, context), new FakeDispatcher(router, "client"));

router.client = client;
router.server = server;

client.connectTo("server");