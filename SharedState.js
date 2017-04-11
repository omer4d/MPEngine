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

function SharedStateData() {
	var vecPoolBytes = new ArrayBuffer(2048*2*4 * 4);
	var floatPoolBytes = new ArrayBuffer(2048*8 * 4);
	
	//this.vecPoolData = new Int8Array(vecPoolBytes);
	//this.floatPoolData = new Int8Array(floatPoolBytes);
	
	this.vecPoolData = new Float32Array(vecPoolBytes);
	this.floatPoolData = new Float32Array(floatPoolBytes);
}

SharedStateData.prototype.delta = function(previous) {
	return {
		floatPoolData: createPatch(previous.floatPoolData, this.floatPoolData),
		vecPoolData: createPatch(previous.vecPoolData, this.vecPoolData)
	};
};

SharedStateData.prototype.applyDelta = function(delta) {
	applyPatch(this.floatPoolData, delta.floatPoolData);
	applyPatch(this.vecPoolData, delta.vecPoolData);
};


SharedStateData.prototype.copy = function(source) {
	this.vecPoolData.set(source.vecPoolData);
	this.floatPoolData.set(source.floatPoolData);
};

SharedStateData.prototype.lerp = function(a, b, k) {
	var i;
	
	for(i = 0; i < this.floatPoolData.length; ++i)
		this.floatPoolData[i] = a.floatPoolData[i] * (1 - k) + b.floatPoolData[i] * k;
	
	for(i = 0; i < this.vecPoolData.length; ++i)
		this.vecPoolData[i] = a.vecPoolData[i] * (1 - k) + b.vecPoolData[i] * k;
};



function SharedState() {
	this.data = new SharedStateData();
	
	var vecPool = new Pool(this.data.vecPoolData, ["x", "y"]);
	var floatPool = new Pool(this.data.floatPoolData);
	
	this.entities = {};
	this.reg = new SchemaRegistry();
	
	this.reg.registerSchema("ball", {
		pos: vecPool,
		r: floatPool
	});
	
	this.reg.registerSchema("player", {
		pos: vecPool,
		vel: vecPool
	});
}

SharedState.prototype.updateEntities = function(entities) {
	var i, keys = Object.keys(this.entities);
	
	for(i = 0; i < keys.length; ++i)
		this.entities[keys[i]].release();
	
	keys = Object.keys(entities);
	
	for(i = 0; i < keys.length; ++i) {
		var id = entities[keys[i]];
		if(id >= 0)
			this.entities[keys[i]] = this.reg.instantiateById(id);
		else
			this.reg.instantiateById(-id);
	}
}

SharedState.prototype.applyDeltaUpdate = function(msg) {
	this.data.applyDelta(msg.delta);
	
		/*
	for(var i = 0; i < msg.messages.length; ++i) {
		var e = msg.messages[i];
		
		if(e.type === "release" && this.entities[e.id]) {
			this.entities[e.id].release();
			delete this.entities[e.id];
		}
	}*/
}