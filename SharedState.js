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

SharedState.prototype.fullCopy = function(other) {
	var i;
	
	var keys = Object.keys(this.entities);
	
	for(i = 0; i < keys.length; ++i)
		this.entities[keys[i]].release();
	
	this.entities = {};
	
	this.floatPoolData.set(other.floatPoolData);
	this.vecPoolData.set(other.vecPoolData);
	
	keys = Object.keys(other.entities);
	for(i = 0; i < keys.length; ++i)
		this.entities[keys[i]] = this.reg.instantiateByName(other.entities[keys[i]].schema);
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