//var SERVER_TICKRATE = 30;
//var FAKE_LAG = 50;
//var FAKE_LAG_STDEV = 30;
//var FAKE_LOSS = 0.2;
//var LERP_TIME = 100;


var SERVER_TICKRATE = 30;
var FAKE_LAG = 0;
var FAKE_LAG_STDEV = 0;
var FAKE_LOSS = 0;
var LERP_TIME = 0;

//(BUFFERING/SERVER_TICKRATE);

window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

function randf(min, max) {
	if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    return min + Math.random() * (max - min);
}

function nrandf(mean, stdev) {
  return mean + (randf() + randf() + randf()) * stdev;
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

// ********
// * Pool *
// ********

function createHandlePropertyDescriptor(offs) {
  return {
    enumerable: true,
    configurable: false,
    get: function() {
      return this.data[this.index + offs];
    },
    set: function(x) {
      this.data[this.index + offs] = x;
    }
  };
}

function SimplePoolHandle(index, data) {
  this.index = index;
  this.data = data;
}

SimplePoolHandle.prototype.valueOf = function() {
  return this.data[this.index];
};

function CompoundPoolHandle(index, data, props) {
  this.index = index;
  this.data = data;
  
  for(var i = 0; i < props.length; ++i)
    Object.defineProperty(this, props[i], createHandlePropertyDescriptor(i));
}

function Pool(data, props) {
  this.props = props;
  this.data = data;
  this.handles = [];
  this.used = 0;
}

Pool.prototype.debug = function() {
  var n = this.used;
  console.log("Handle num:", n);
  
  for(var i = 0; i < n; ++i) {
    console.log(this.handles[i].index);
  }
};

Pool.prototype.borrow = function() {
  var pn = this.props ? this.props.length : 1;
  
  if(this.handles.length >= this.data.length / pn)
    throw new Error("Exceeded pool capacity!");
  
  var handle = this.props ? new CompoundPoolHandle(this.used * pn, this.data, this.props) :
                            new SimplePoolHandle(this.used, this.data);
  
  if(this.used < this.handles.length)
    this.handles[this.used] = handle;
  else
    this.handles.push(handle);
  
  ++this.used;
  
  return handle;
};

Pool.prototype.release = function(handle) {
  var i, pn = this.props ? this.props.length : 1;
  
  for(i = handle.index; i < (this.used - 1) * pn; ++i)
    this.data[i] = this.data[i + pn];
  
  for(i = handle.index / pn; i < this.used - 1; ++i) {
    var next = this.handles[i + 1];
    next.index = i * pn;
    this.handles[i] = next;
  }
  
  --this.used;
};


// *******************
// * Schema Registry *
// *******************

function SchemaRegistry() {
	this.schemaCount = 0;
	this.schemaByName = {};
	this.nameById = {};
	this.idByName = {};
}

SchemaRegistry.prototype.registerSchema = function(name, schema) {
	var id = ++this.schemaCount;
	this.schemaByName[name] = schema;
	this.nameById[id] = name;
	this.idByName[name] = id;
};
	
SchemaRegistry.prototype.lookupByName = function(name) {
	return this.schemaByName[name];
};

SchemaRegistry.prototype.lookupById = function(id) {
	return this.schemaByName[this.nameById[id]];
};

SchemaRegistry.prototype.lookupIdByName = function(name) {
	return this.idByName[name];
};

SchemaRegistry.prototype.lookupNameById = function(id) {
	return this.nameById[id];
};

SchemaRegistry.prototype.instantiateByName = function(schemaName, obj) {
  var handles = {};
  var schema = this.lookupByName(schemaName);
  
  obj = obj || {};
  
  Object.keys(schema).forEach(function(key) {
    var handle = schema[key].borrow();
    handles[key] = handle;
    
    if(handle.constructor === SimplePoolHandle) {
      Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: false,
        get: function() {
          return handle.data[handle.index];
        },
        set: function(x) {
          handle.data[handle.index] = x;
        }
      });
    }
    else
      obj[key] = handle;
  });
  
  obj.release = function() {
    Object.keys(schema).forEach(function(key) {
      schema[key].release(handles[key]);
    });
  };
  
  obj.schema = schemaName;
  
  return obj;
}

SchemaRegistry.prototype.instantiateById = function(schemaId, obj) {
	return this.instantiateByName(this.lookupNameById(schemaId), obj);
}

// *************
// * GameState *
// *************

function GameState(netSpawn, arenaWidth, arenaHeight) {
	this.netSpawn = netSpawn;
    this.balls = [];
    this.players = [];
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
	
    for (var i = 0; i < 10; ++i) {
		this.addBall();
    }
}

GameState.prototype.addBall = function() {
	var ball = this.netSpawn("ball", {
		vel: vec2(randf(100, 300) * (randf() < 0.5 ? -1 : 1), randf(100, 300) * (randf() < 0.5 ? -1 : 1))
	});
	
	var r = randf(15, 30);
	ball.r = r;
	ball.pos.x = randf(r, this.arenaWidth - r);
	ball.pos.y = randf(r, this.arenaHeight - r);
	
	this.balls.push(ball);
	return ball;
};

GameState.prototype.addPlayer = function() {
	var r = 15;
    var player = this.netSpawn("player", {
        r: r,
        vel: vec2(0, 0),
        handleCommands: function(commands) {
            this.vel.x += commands.moveX * 35;
            this.vel.y += commands.moveY * 35;
        }
    });

	player.pos.x = randf(r, this.arenaWidth - r);
	player.pos.y = randf(r, this.arenaHeight - r);
	
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
		if(this.balls[i].remFlag) {
			this.balls[i].release();
			this.balls.splice(i, 1);
		}
		else
			this.moveBall(this.balls[i], dt, 0.95, 0.8);
	}

    for (i = this.players.length - 1; i >= 0; --i) {
		if(this.players[i].remFlag) {
			this.players[i].release();
			this.players.splice(i, 1);
		}
		else
			this.moveBall(this.players[i], dt, 0.87, 0);
	}

    for (i = 0; i < this.balls.length; ++i)
        for (j = i + 1; j < this.balls.length; ++j)
            if (collisionTest(this.balls[i], this.balls[j]))
                collisionResponse(this.balls[i], this.balls[j], 0.8);

    for (i = 0; i < this.balls.length; ++i)
        for (j = 0; j < this.players.length; ++j)
            if (collisionTest(this.balls[i], this.players[j])) {
                collisionResponse(this.balls[i], this.players[j], 0.8);
				this.balls[i].r -= 5;
				if(this.balls[i].r < 1) {
					this.balls[i].r = 1;
					this.balls[i].remFlag = true;
				}
					
				//Math.max(this.balls[i].r - 5, 0);
			}
}

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

                if (Math.random() < (1 - FAKE_LOSS)) {
                    var targetObj = router[entry.targetHandle];
                    if (entry.message.type in targetObj)
                        targetObj[entry.message.type](sourceHandle, entry.message);
                    else
                        targetObj.onMessage(sourceHandle, entry.message);
                }
            }
        }
    }, 5);

    this.messageBuffer = messageBuffer;
}

FakeDispatcher.prototype.send = function(targetHandle, msg) {
    this.messageBuffer.push({
        delay: nrandf(FAKE_LAG / 2 / 1000, FAKE_LAG_STDEV / 2 / 1000),
        targetHandle: targetHandle,
        message: msg
    });
};

// ***************
// * SharedState *
// ***************

function createPatch(older, newer) {
  var data1 = older;
  var data2 = newer;
  var lastMode = Math.abs(data1[0] - data2[0]) > 0.03;
  var out = [lastMode ? 1 : 0, 0];
  var lastCounterIdx = 1;
  
  for(var i = 0; i < data1.length; ++i) {
    var mode = Math.abs(data2[i] - data1[i]) > 0.03;
    if(mode === lastMode)
      ++out[lastCounterIdx];
    else {
      lastCounterIdx = out.length;
      out.push(1);
    }
    if(mode)
      out.push(data2[i]);
      
    lastMode = mode;
  }
  
  return out;
}

function applyPatch(data, patch) {
  var mode = patch[0] !== 0;
  var counter = patch[1], patchIdx = 2;
  
  for(var i = 0; i < data.length; ++i) {
    if(counter === 0) {
      mode = !mode;
      counter = patch[patchIdx++];
    }
    
    if(mode) {
      data[i] = patch[patchIdx++];
    }
    
    --counter;
  }
}

function SharedState() {
	var vecPoolBytes = new ArrayBuffer(2048*2*4 * 4);
	var floatPoolBytes = new ArrayBuffer(2048*8 * 4);
	
	//this.vecPoolData = new Int8Array(vecPoolBytes);
	//this.floatPoolData = new Int8Array(floatPoolBytes);
	
	this.vecPoolData = new Float32Array(vecPoolBytes);
	this.floatPoolData = new Float32Array(floatPoolBytes);
	
	var vecPool = new Pool(this.vecPoolData, ["x", "y"]);
	var floatPool = new Pool(this.floatPoolData);
	
	this.entities = {};
	this.reg = new SchemaRegistry();
	
	this.reg.registerSchema("ball", {
		pos: vecPool,
		r: floatPool
	});
	
	this.reg.registerSchema("player", {
		pos: vecPool,
	});
}

SharedState.prototype.copy = function(source) {
	this.vecPoolData.set(source.vecPoolData);
	this.floatPoolData.set(source.floatPoolData);
};

SharedState.prototype.delta = function(previous) {
	return {
		floatPoolData: createPatch(previous.floatPoolData, this.floatPoolData),
		vecPoolData: createPatch(previous.vecPoolData, this.vecPoolData)
	};
};

SharedState.prototype.applyFullUpdate = function(msg) {
	var i;
	
	var keys = Object.keys(this.entities);
	
	for(i = 0; i < keys.length; ++i)
		this.entities[keys[i]].release();
	
	this.entities = {};
	
	this.floatPoolData.set(msg.sharedState.floatPoolData);
	this.vecPoolData.set(msg.sharedState.vecPoolData);
	
	keys = Object.keys(msg.sharedState.entities);
	for(i = 0; i < keys.length; ++i)
		this.entities[keys[i]] = this.reg.instantiateById(msg.sharedState.entities[keys[i]]);
};

SharedState.prototype.applyDelta = function(msg) {
	applyPatch(this.floatPoolData, msg.delta.floatPoolData);
	applyPatch(this.vecPoolData, msg.delta.vecPoolData);
};

SharedState.prototype.lerp = function(a, b, k) {
	var i;
	
	for(i = 0; i < this.floatPoolData.length; ++i)
		this.floatPoolData[i] = a.floatPoolData[i] * (1 - k) + b.floatPoolData[i] * k;
	
	for(i = 0; i < this.vecPoolData.length; ++i)
		this.vecPoolData[i] = a.vecPoolData[i] * (1 - k) + b.vecPoolData[i] * k;
}

// **********
// * Server *
// **********

function RemoteClient(handle, player) {
	this.handle = handle;
	this.player = player;
	this.outgoingQueue = [];
	this.lastAck = -1;
	this.lastAckState = new SharedState();
}

function buildNetSpawner(server) {
	var entities = server.sharedState.entities;
	var reg = server.sharedState.reg;
	var nextId = 0;
	
	return function(schemaName, obj) {
		var res = reg.instantiateByName(schemaName, obj);
		var oldRelease = res.release;
		var tmp = nextId;
		
		entities[tmp] = reg.lookupIdByName(schemaName);
		
		res.release = function() {
			if(!server.incomingQueues.release)
				server.incomingQueues.release = [];
			
			server.incomingQueues.release.push({
				oldRelease: oldRelease,
				index: tmp
			});
			
			//entities.splice(idx, 1);
			//oldRelease();
		};
		
		++nextId;
		return res;
	};
}

function Server(dispatcher) {
	this.sharedState = new SharedState();
	
    this.dispatcher = dispatcher;
	this.incomingQueues = {};
    this.clients = {};
    this.lastUpdateTime = performance.now();
    this.gameState = new GameState(buildNetSpawner(this), 512, 512);
	this.updateCount = 0;

	this.updateAccum = 0;
	
	var lastTime = performance.now();
    var self = this;
	
    setInterval(function() {
		var t = performance.now();
		var dt = (t - lastTime) / 1000;
		lastTime = t;
		
		self.updateAccum += dt * SERVER_TICKRATE;
		var n = Math.floor(self.updateAccum);
		
		for(var i = 0; i < n; ++i) {
			self.update();
			//self.gameState.logic(1/SERVER_TICKRATE);
			//++self.updateCount;
		}
		
		self.updateAccum -= n;
    }, 1000 / SERVER_TICKRATE);
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

Server.prototype.handleReleases = function() {
	var queue = this.incomingQueues.release;

	if(!queue || queue.length === 0)
		return;
	
	for(var i = 0; i < queue.length; ++i) {
		queue[i].oldRelease();
		delete this.sharedState.entities[queue[i].index];
	}
	
	this.incomingQueues.release = [];
};

Server.prototype.update = function() {
    var t = performance.now();
    var dt = (t - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = t;
	
	this.handleDisconnections();
	this.handlePlayerCommands();
    this.gameState.logic(1/SERVER_TICKRATE);
	this.handleConnections();
	
    var self = this;
    Object.keys(this.clients).forEach(function(key) {
		var client = self.clients[key];
		
		/*
		if(self.updateCount % 10 === 0) {
			self.clients[key].outgoingQueue.push({
				updateNum: self.updateCount,
				message: {
					type: "ping",
					serial: self.updateCount / 10
				},
			});
		}*/
		
		
		if(client.lastAck < 0 || 1) {
			var cpy = new SharedState();
			cpy.copy(self.sharedState);
			cpy.entities = Object.keys(self.sharedState.entities).reduce(function(ents, key) {
				ents[key] = self.sharedState.entities[key];
				return ents;
			}, {});
			
			console.log(self.updateCount, self.sharedState.entities);
			
			self.dispatcher.send(client.handle, {
				type: "fullUpdate",
				messages: client.outgoingQueue.map(function(e) {
					return e.message;
				}),
				updateNum: self.updateCount,
				sharedState: cpy
			});
		}/*else {
			self.dispatcher.send(client.handle, {
				type: "update",
				updateNum: self.updateCount,
				delta: self.sharedState.delta(client.lastAckState)
			});
		}*/
		
		client.lastAckState.copy(self.sharedState);
    });
	
	this.handleReleases();
	
	++this.updateCount;
};

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

Renderer.prototype.render = function(entities) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	var keys = Object.keys(entities);
	
	for(var i = 0; i < keys.length; ++i) {
		var ent = entities[keys[i]];
		
		if(ent.schema === "ball")
			drawCircle(this.context, ent.pos.x, ent.pos.y, ent.r, "green");
		else
			drawCircle(this.context, ent.pos.x, ent.pos.y, 15, "blue");
	}
};

// **********
// * Client *
// **********

// return the index of the state to interpolate towards
// -1 if there is none (t is ahead of last state)
// 0 if t is behind first state

function findInterpolationDest(buffer, firstUpdate, secsPerTick, t) {
  for(var i = 0; i < buffer.length; ++i) {
    if((buffer[i].updateNum - firstUpdate) * secsPerTick > t)
      return i;
  }
  return -1;
}

function buffLerp(dest, buffer, firstUpdate, secsPerTick, t) {
	
/*
  var pos = findInterpolationDest(buffer, firstUpdate, secsPerTick, t);
  
  if(pos < 0) {
	  //console.log("ZOMG!", t, (buffer[buffer.length - 1].updateNum - firstUpdate) * secsPerTick);
	  console.log("ahead of server", buffer.length);
	  dest.copy(buffer[buffer.length - 1].state);
	  buffer.splice(0, buffer.length - 1);
  }
  else if(pos === 0) {
	//console.log("behind server", buffer.length);
	dest.copy(buffer[0].state);
  }
  else {
	  //console.log("interpolating", buffer.length);
	var k = (t - (buffer[pos - 1].updateNum - firstUpdate) * secsPerTick) /
		  ((buffer[pos].updateNum - buffer[pos - 1].updateNum) * secsPerTick);
	
	dest.lerp(buffer[pos - 1].state, buffer[pos].state, k);
	
	if(pos > 1)
	  buffer.splice(0, pos - 1);
  }
*/

	dest.copy(buffer[buffer.length - 1].state);
	dest.entities = buffer[buffer.length - 1].state.entities;
}

function Client(renderer, dispatcher) {
	this.bufferedStates = [];
	this.sharedState = new SharedState();

    this.renderer = renderer;
    this.renderingEnabled = true;
    this.dispatcher = dispatcher;
    this.serverHandle = null;
	
	this.firstUpdateNum = -1;
	this.lastUpdateNum = -1;
	this.time = 0;
	
    var self = this;
	
    this.renderLoop = function() {
        if (self.renderingEnabled) {
			var t = performance.now();
			var dt = (t - self.lastTime) / 1000;
			self.lastTime = t;
			self.time += dt;
			
            self.dispatcher.send(self.serverHandle, {
                type: "playerCommands",
                commands: self.generateCommands(),
				ack: self.lastUpdateNum
            });
			
			
			buffLerp(self.sharedState, self.bufferedStates, self.firstUpdateNum, 1/SERVER_TICKRATE, self.time - LERP_TIME/1000);
			
            renderer.render(self.sharedState.entities);
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

	//console.log(moveX, moveY);
	
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

Client.prototype.fullUpdate = function(sender, msg) {
	if(msg.updateNum <= this.lastUpdateNum)
		return;
	
	var state = new SharedState();
	state.applyFullUpdate(msg);
	this.bufferedStates.push({state: state, updateNum: msg.updateNum});

	//this.sharedState.applyFullUpdate(msg);
	
	if(!this.serverHandle) {
		console.log("Connection accepted!");
		this.serverHandle = sender;
		this.sharedState.applyFullUpdate(msg);
		this.firstUpdateNum = msg.updateNum;
		this.lastTime = performance.now();
		requestAnimFrame(this.renderLoop);
	}

	this.lastUpdateNum = msg.updateNum;
};

Client.prototype.update = function(sender, msg) {
	if(msg.updateNum <= this.lastUpdateNum)
		return;
	
	console.log("WTF!");
	
	var state = new SharedState();
	state.copy(this.bufferedStates[this.bufferedStates.length - 1].state);
	state.applyDelta(msg);
	
	this.bufferedStates.push({state: state, updateNum: msg.updateNum});
	this.lastUpdateNum = msg.updateNum;
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