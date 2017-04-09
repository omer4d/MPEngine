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