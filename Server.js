// **********
// * Server *
// **********

function RemoteClient(handle, player) {
	this.handle = handle;
	this.player = player;
	this.outgoingQueue = [];
	this.lastAck = -1;
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
		};
		
		++nextId;
		return res;
	};
}

function Server(dispatcher) {
	this.sharedState = new SharedState();
	this.lastStateData = new SharedStateData();
	
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

Server.prototype.pumpReleaseEvents = function() {
	var queue = this.incomingQueues.release;
	var self = this;
	
	if(!queue || queue.length === 0)
		return;
	
	for(var i = 0; i < queue.length; ++i) {
		Object.keys(this.clients).forEach(function(key) {
			self.clients[key].outgoingQueue.push({
				updateNum: self.updateCount,
				type: "release",
				id: queue[i].index
			});
		});
	}
};

Server.prototype.handleReleases = function() {
	var queue = this.incomingQueues.release;
	var self = this;
	
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
	this.pumpReleaseEvents();
	
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
		
		
		if(client.lastAck < 0) {
			var dataCpy = new SharedStateData();
			dataCpy.copy(self.sharedState.data);
			var entCpy = Object.keys(self.sharedState.entities).reduce(function(ents, key) {
				ents[key] = self.sharedState.entities[key];
				return ents;
			}, {});
			
			console.log(self.updateCount, self.sharedState.entities);
			
			self.dispatcher.send(client.handle, {
				type: "fullUpdate",
				messages: client.outgoingQueue.slice(),
				updateNum: self.updateCount,
				data: dataCpy,
				entities: entCpy
			});
		}else {
			self.dispatcher.send(client.handle, {
				type: "update",
				messages: client.outgoingQueue.slice(),
				updateNum: self.updateCount,
				delta: self.sharedState.data.delta(self.lastStateData)
			});
		}
    });
	
	this.lastStateData.copy(this.sharedState.data);
	this.handleReleases();
	++this.updateCount;
};