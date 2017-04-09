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

function buffLerp(dest, buffer, firstUpdate, secsPerTick, t, server) {
  var pos = findInterpolationDest(buffer, firstUpdate, secsPerTick, t);
  
  if(pos < 0) {
	var last = buffer[buffer.length - 2];
	  
	  if(last)
	  for(var i = 0; i < last.events.length; ++i) {
		  if(last.events[i].type === "release") {
			  if(dest.entities[last.events[i].id]) {
				  dest.entities[last.events[i].id].release();
				  delete dest.entities[last.events[i].id];
			  }
		  }
	  }
	
	last =  buffer[buffer.length - 1];
	dest.copy(last.state);
	
	 buffer.splice(0, buffer.length - 1);
  }
  else if(pos === 0) {
	console.log("behind server", buffer.length);
	dest.copy(buffer[0].state);
  }
  else {
	  //console.log("interpolating", buffer.length);
	  var last;
	  
	  if(pos > 1) {
		  last = buffer[pos - 1];
		  var next = buffer[pos];
		
		  if(last) {			  
			  for(var i = 0; i < last.events.length; ++i) {
				  console.log(last.events[i].updateNum, server.lastHandledUpdateNum);
				  
				  if(last.events[i].type === "release" && last.events[i].updateNum >= server.lastHandledUpdateNum) {
					  console.log("FUCK YES!", last.events[i].id);
					  
					  server.lastHandledUpdateNum = last.events[i].updateNum;
					  
					  //if(dest.entities[last.events[i].id]) {
						  
						  
						  //console.log("BEFORE:");
						  //for(var z = 0; z < 22; ++z) {
							//  console.log("last", last.state.vecPoolData[z]);
							//  console.log("dest", next.state.vecPoolData[z]);
							//  console.log("\n");
						  //}
						  console.log("-------------------------");
						  
						  
						  dest.entities[last.events[i].id].release();
						  delete dest.entities[last.events[i].id];
						  
						  //console.log(last.state.entities);
						  
						  //console.log(last.state.vecPoolData);
						  
						  last.state.entities[last.events[i].id].release();
						  delete last.state.entities[last.events[i].id];
						  
						  
						  //console.log("AFTER:");
						  //for(var z = 0; z < 22; ++z) {
							//  console.log("last", last.state.vecPoolData[z]);
							///  console.log("dest", next.state.vecPoolData[z]);
							//  console.log("\n");
						  //}
						  //console.log("====================================\n\n\n\n\n");
						  
						  
						  
						 // console.log(last.state.vecPoolData);
					  //}
					
				  }
			  }
		  }
	}
	  
	  
	var k = (t - (buffer[pos - 1].updateNum - firstUpdate) * secsPerTick) /
		  ((buffer[pos].updateNum - buffer[pos - 1].updateNum) * secsPerTick);
	
	dest.lerp(buffer[pos - 1].state, buffer[pos].state, k);
	
	if(pos > 1)
		buffer.splice(0, pos - 1);
  }

	//dest.copy(buffer[buffer.length - 1].state);
	//dest.entities = buffer[buffer.length - 1].state.entities;
}

function Client(keystates, renderer, dispatcher) {
	this.bufferedStates = [];
	this.sharedState = new SharedState();

	this.keystates = keystates;
    this.renderer = renderer;
    this.renderingEnabled = true;
    this.dispatcher = dispatcher;
    this.serverHandle = null;
	
	this.firstUpdateNum = -1;
	this.lastUpdateNum = -1;
	this.lastHandledUpdateNum = -1;
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
			
			
			buffLerp(self.sharedState, self.bufferedStates, self.firstUpdateNum, 1/SERVER_TICKRATE, self.time - LERP_TIME/1000, self);
			
            renderer.render(self.sharedState.entities);
            requestAnimFrame(self.renderLoop);
        }
    };
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
	this.bufferedStates.push({state: state, updateNum: msg.updateNum, events: msg.messages});

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
	
	//console.log(msg.messages);
	
	var state = new SharedState();
	state.fullCopy(this.bufferedStates[this.bufferedStates.length - 1].state);
	state.applyDelta(msg);
	
	this.bufferedStates.push({state: state, updateNum: msg.updateNum, events: msg.messages});
	this.lastUpdateNum = msg.updateNum;
};

Client.prototype.onMessage = function(sender, msg) {
    throw new Error("Unhandled message type: " + msg.type);
};

Client.prototype.setRenderingEnabled = function(renderingEnabled) {
    this.renderingEnabled = renderingEnabled;
};