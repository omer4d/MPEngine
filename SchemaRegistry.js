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
  
  obj.handles = handles;
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