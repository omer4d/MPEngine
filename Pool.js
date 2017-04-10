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
  this.used = [];
  this.lastUsed = -1;
  
  var pn = props ? props.length : 1;
  for(var i = 0; i < data.length / pn; ++i)
    this.used.push(false);
}

Pool.prototype.borrow = function() {
  var pn = this.props ? this.props.length : 1;
  var idx = (this.lastUsed + 1) * pn;
  
  if(idx >= this.data.length)
    throw new Error("Exceeded pool capacity!");
  
  var handle = this.props ? new CompoundPoolHandle(idx, this.data, this.props) :
                            new SimplePoolHandle(idx, this.data);
                            
  ++this.lastUsed;
  this.used[this.lastUsed] = true;
  
  return handle;
};

Pool.prototype.release = function(handle) {
	var pn = this.props ? this.props.length : 1;
	var i = handle.index / pn;
	this.used[i] = false;
	
	if(i === this.lastUsed) {
		while(this.lastUsed >= 0 && !this.used[this.lastUsed]) {
			--this.lastUsed;
		}
	}
	
	//console.log(this.props, this.lastUsed);
};