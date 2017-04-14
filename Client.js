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

function Client(keystates, renderer, dispatcher) {
	this.bufferedStates = [];
	this.lastBufferedState = null;
	this.lastHandledEventUpdateNum = -1;
	this.sharedState = new SharedState();
	this.updateAccum = 0;

	this.playerEntId = -1;
	
	this.keystates = keystates;
    this.renderer = renderer;
    this.renderingEnabled = true;
    this.dispatcher = dispatcher;
    this.serverHandle = null;
	
	this.firstUpdateNum = -1;
	this.lastUpdateNum = -1;
	this.lastHandledUpdateNum = -1;
	this.time = 0;
	
	this.nextCmdNum = 0;
	this.cmdBuffer = [];
	
	this.updateFlag = false;
	this.lastServerAck = -1;
	this.px = 0;
	this.py = 0;
	this.vx = 0;
	this.vy = 0;
	
	var player = {
		pos: vec2(0, 0),
		vel: vec2(0, 0),
		moveVec: vec2(0, 0),
		r: 15
	};
	
	this.player = player;
	
	//console.log("PPOS: ", player.pos);
	//debugger;
	
    var self = this;
	
    this.renderLoop = function() {
        if (self.renderingEnabled) {
			var t = performance.now();
			var dt = (t - self.lastTime) / 1000;
			self.lastTime = t;
			self.time += dt;
			self.updateAccum += CLIENT_TICKRATE * dt;

			var ups = Math.floor(self.updateAccum);
			
			for(var i = 0; i < ups; ++i) {
				if(self.updateFlag) {
					for(var j = 0; j < self.cmdBuffer.length; ++j)
						if(self.cmdBuffer[j].cmdNum > self.lastServerAck)
							break;
				
					self.cmdBuffer.splice(0, j);// = self.cmdBuffer.slice(j);
					self.player.pos.x = self.px;
					self.player.pos.y = self.py;
					self.player.vel.x = self.vx;
					self.player.vel.y = self.vy;
					
					for(var z = 0; z < self.cmdBuffer.length; ++z) {
						//console.log("WEW!");
						self.player.moveVec.x = self.cmdBuffer[z].moveX;
						self.player.moveVec.y = self.cmdBuffer[z].moveY;
						movePlayer(self.player, 512, 512, 1/CLIENT_TICKRATE);
					}
					
					self.updateFlag = false;
				}
				
				var cmds = self.generateCommands();
				
				self.cmdBuffer.push(cmds);
				
				player.moveVec.x = cmds.moveX;
				player.moveVec.y = cmds.moveY;
				movePlayer(player, 512, 512, 1/CLIENT_TICKRATE);
				
				self.dispatcher.send(self.serverHandle, {
					type: "playerCommands",
					commands: cmds,
					ack: self.lastUpdateNum,
				});
			}
			
			self.buffLerp();
			self.updateAccum -= ups;
			
            renderer.render(self.sharedState.entities, self.player);
            requestAnimFrame(self.renderLoop);
        }
    };
}

Client.prototype.buffLerp = function() {
  var dest = this.sharedState;
  var buffer = this.bufferedStates;
  var firstUpdate = this.firstUpdateNum;
  var secsPerTick = 1/SERVER_TICKRATE;
  var t = this.time - LERP_TIME/1000;
	
  var pos = findInterpolationDest(buffer, firstUpdate, secsPerTick, t);
  
  if(pos < 0) {
	  //console.log("ahead of server");
	 dest.data.copy(buffer[buffer.length - 1].data);
	 buffer.splice(0, buffer.length - 1);
	 
	 if(this.lastBufferedState !== buffer[buffer.length - 1]) {
		 buffer[buffer.length - 1].action();
		 this.lastBufferedState = buffer[buffer.length - 1];
	 }
  }
  else if(pos === 0) {
	  //console.log("behind server");
	dest.data.copy(buffer[0].data);
  }
  else {
	  //console.log("interpolating");
	var k = (t - (buffer[pos - 1].updateNum - firstUpdate) * secsPerTick) /
		  ((buffer[pos].updateNum - buffer[pos - 1].updateNum) * secsPerTick);
	
	dest.data.lerp(buffer[pos - 1].data, buffer[pos].data, k);
	
	if(this.lastBufferedState !== buffer[pos - 1]) {
		 buffer[pos - 1].action();
		 this.lastBufferedState = buffer[pos - 1];
	}
	
	if(pos > 1)
		buffer.splice(0, pos - 1);
  }
}

Client.prototype.generateCommands = function() {
    var moveX = 0,
        moveY = 0;

    if (this.keystates["a"])
        moveX = -1;
    else if (this.keystates["d"])
        moveX = 1;
    if (this.keystates["w"])
        moveY = -1;
    else if (this.keystates["s"])
        moveY = 1;

	//console.log(moveX, moveY);
	
    return {
        moveX: moveX,
        moveY: moveY,
		cmdNum: this.nextCmdNum++
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

Client.prototype.handleEvents = function(events) {
	var umax = this.lastHandledEventUpdateNum;
	
	//console.log(events);
	
	for(var i = 0; i < events.length; ++i) {
		var e = events[i];
		
		if(e.updateNum > this.lastHandledEventUpdateNum) {
			if(e.type === "release") {
				//console.log("ZOMG!");
				this.sharedState.entities[e.id].release();
				delete this.sharedState.entities[e.id];
			}
			
			umax = Math.max(umax, e.updateNum);
		}
	}
	
	this.lastHandledEventUpdateNum = umax;
};

Client.prototype.fullUpdate = function(sender, msg) {
	if(msg.updateNum <= this.lastUpdateNum)
		return;
	
	var self = this;
	
	this.bufferedStates.push({data: msg.data, updateNum: msg.updateNum, action: function() {
		self.sharedState.updateEntities(msg.entities);
		self.handleEvents(msg.messages);
	}});
	
	if(!this.serverHandle) {
		console.log("Connection accepted!");
		this.serverHandle = sender;
		//this.sharedState.updateEntities(msg.entities);
		//this.sharedState.data.copy(msg.data);
		this.playerEntId = msg.playerEntId;
		this.firstUpdateNum = msg.updateNum;
		this.lastTime = performance.now();
		requestAnimFrame(this.renderLoop);
	}

	//this.player.pos.x = this.sharedState.entities[this.playerEntId].pos.x;
	//this.player.pos.y = this.sharedState.entities[this.playerEntId].pos.y;
	//this.player.vel.x = this.sharedState.entities[this.playerEntId].vel.x;
	//this.player.vel.y = this.sharedState.entities[this.playerEntId].vel.y;
	this.lastUpdateNum = msg.updateNum;
};

Client.prototype.update = function(sender, msg) {
	if(msg.updateNum <= this.lastUpdateNum)
		return;
	
	//console.log("CMD BUFF LEN", this.cmdBuffer.length, msg.cmdAck, this.cmdBuffer[this.cmdBuffer.length - 1].cmdNum);
	var data = new SharedStateData();
	data.copy(this.bufferedStates[this.bufferedStates.length - 1].data);
	data.applyDelta(msg.delta);
	
	var self = this;
	
	this.bufferedStates.push({data: data, updateNum: msg.updateNum, action: function() {
		self.handleEvents(msg.messages);
	}});

	this.updateFlag = true;
	this.lastServerAck = msg.cmdAck;
	this.px = data.vecPoolData[20];
	this.py = data.vecPoolData[21];
	this.vx = data.vecPoolData[22];
	this.vy = data.vecPoolData[23];
	
	this.lastUpdateNum = msg.updateNum;
};

Client.prototype.onMessage = function(sender, msg) {
    throw new Error("Unhandled message type: " + msg.type);
};

Client.prototype.setRenderingEnabled = function(renderingEnabled) {
    this.renderingEnabled = renderingEnabled;
};