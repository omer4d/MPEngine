define([], function() {
	var STATE_DONE_LOADING = 0;
	var STATE_REGISTERING_RESOURCES = 1;
	var STATE_LOADING = 2;
	
	function makeGenericLoader(responseType) {
		return function(rm, url, alias) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = responseType;
			
			request.onload = function() {
				rm.onDone(alias, request.status >= 200 && request.status < 400 ? request.response : null);
			};

			request.onerror = function() {
				rm.onDone(alias, null);
			};

			request.send();
		};
	}
	
	function ResourceEntry(alias, data, cleanupFunc) {
		this.data = data;
		this.cleanupFunc = cleanupFunc;
		this.alias = alias;
		this.deps = [];
	}
	
	ResourceEntry.prototype.get = function() {
		return this.data;
	};
	
	function ResourceManager() {
		this.extensions = {};
		this.queue = [];
		this.liveList = [];
		this.dict = {};
		this.remaining = 0;
		this.userDoneCallback = null;
		this.state = STATE_DONE_LOADING;
		this.nextAutoId = 0;
		
		this.registerDefaultLoaders();
	}
	
	ResourceManager.prototype.die = function() {
		var currState;
		switch(this.state) {
			case STATE_DONE_LOADING:
				currState = "STATE_DONE_LOADING";
				break;
			case STATE_REGISTERING_RESOURCES:
				currState = "STATE_REGISTERING_RESOURCES";
				break;
			case STATE_LOADING:
				currState = "STATE_LOADING";
				break;
			default:
				currState = "INVALID STATE";
		}
		
		throw new Error("ResourceManager: invalid operation! Current state: " + currState);
	};
	
	ResourceManager.prototype.registerDefaultLoaders = function() {
		var textLoader = makeGenericLoader("text");
		this.extensions.json = makeGenericLoader("json");
		this.extensions.txt = textLoader;
		this.extensions.frag = textLoader;
		this.extensions.vert = textLoader;
	};
	
	ResourceManager.prototype.registerLoader = function(ext, loader) {
		this.extensions[ext] = loader;
	};
	
	ResourceManager.prototype.get = function(alias) {
		if(this.state !== STATE_DONE_LOADING)
			this.die();
		
		var entry = this.dict[alias];
		return entry ? entry.data : null;
	};
	
	ResourceManager.prototype.begin = function() {
		if(this.state !== STATE_DONE_LOADING)
			this.die();
		
		this.queue = [];
		this.liveList = [];
		this.userDoneCallback = null;
		
		this.state = STATE_REGISTERING_RESOURCES;
	};
	
	ResourceManager.prototype.markDepTree = function(entry) {
		for(var i = 0; i < entry.deps.length; ++i) {
			this.liveList.push(entry.deps[i].alias);
			this.markDepTree(entry.deps[i]);
		}
	};
	
	ResourceManager.prototype.add = function(alias, url) {
		if(this.state !== STATE_REGISTERING_RESOURCES)
			this.die();
		
		if(!alias)
			alias = "__anonymous" + (this.nextAutoId++);
		url = url || alias;
		
		var item = {alias: alias, url: url};
		this.liveList.push(alias);
		
		var entry = this.dict[alias];
		
		if(!entry) {
			entry = new ResourceEntry(alias, null, null);
			this.queue.push(item);
			this.dict[alias] = entry;
		}else {
			
		}
		
		return entry;
	};
	
	// To be called only by loaders!
	ResourceManager.prototype.loadDep = function(parentAlias, alias, url) {
		if(this.state !== STATE_LOADING)
			this.die();
		
		if(!alias)
			alias = "__anonymous" + (this.nextAutoId++);
		url = url || alias;
		
		var item = {alias: alias, url: url};
		this.liveList.push(item.alias);
		
		var entry = this.dict[alias];
		
		if(!entry) {
			entry = new ResourceEntry(alias, null, null);
			this.dict[alias] = entry;
			
			var ext = url.slice(url.lastIndexOf(".") + 1).toLowerCase();
			if(ext in this.extensions) {
				this.extensions[ext](this, url, alias);
				++this.remaining;
			}
			else
				throw new Error("ResourceManager: Unregistered extension '." + ext + "'");
		}
		
		this.dict[parentAlias].deps.push(entry);
		
		return entry;
	};
	
	ResourceManager.prototype.onDone = function(alias, data, cleanupFunc) {
		this.dict[alias].data = data;
		this.dict[alias].cleanupFunc = cleanupFunc;
		
		if(!data)
			console.log("Failed to load '" + alias + "'");
		
		--this.remaining;
		if(this.remaining === 0) {
			// Perform GC:
			var killList = {};
			var aliases = Object.keys(this.dict);
			var i;
			
			for(i = 0; i < aliases.length; ++i)
				killList[aliases[i]] = true;
			
			for(i = 0; i < this.liveList.length; ++i)
				delete killList[this.liveList[i]];
			
			aliases = Object.keys(killList);
			for(i = 0; i < aliases.length; ++i) {
				var entry = this.dict[aliases[i]];
				
				entry.data = null;
				if(entry.cleanupFunc)
					entry.cleanupFunc(entry.data);
				
				delete this.dict[aliases[i]];
			}
			
			// User callback:
			this.state = STATE_DONE_LOADING;
			this.userDoneCallback();
		}
	};
	
	ResourceManager.prototype.end = function(done) {
		if(this.state !== STATE_REGISTERING_RESOURCES)
			this.die();
		
		this.userDoneCallback = done;
		this.state = STATE_LOADING;
		
		for(var i = 0; i < this.queue.length; ++i) {
			var item = this.queue[i];
			var ext = item.url.slice(item.url.lastIndexOf(".") + 1).toLowerCase();
			if(ext in this.extensions) {
				this.extensions[ext](this, item.url, item.alias);
				++this.remaining;
			}
			else
				throw new Error("ResourceManager: Unregistered extension '." + ext + "'");
		}
	};
	
	ResourceManager.prototype.getResourceList = function() {
		var list = [];
		var keys = Object.keys(this.dict);
		for(var i = 0; i < keys.length; ++i)
			list.push(this.dict[keys[i]]);
		return list;
	};
	
	return ResourceManager;
});