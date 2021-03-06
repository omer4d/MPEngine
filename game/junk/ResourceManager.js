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
	
	function ResourceManager() {
		this.extensions = {};
		this.queue = [];
		this.liveList = [];
		this.dict = {};
		this.remaining = 0;
		this.userDoneCallback = null;
		this.state = STATE_DONE_LOADING;
		
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
		
		return this.dict[alias];
	};
	
	ResourceManager.prototype.begin = function() {
		if(this.state !== STATE_DONE_LOADING)
			this.die();
		
		this.queue = [];
		this.liveList = [];
		this.userDoneCallback = null;
		
		this.state = STATE_REGISTERING_RESOURCES;
	};
	
	ResourceManager.prototype.add = function(alias, url) {
		if(this.state !== STATE_REGISTERING_RESOURCES)
			this.die();
		
		url = url || alias;
		
		var item = {alias: alias, url: url};
		this.liveList.push(item);
		
		if(!(alias in this.dict))
			this.queue.push(item);
	};
	
	// To be called only by loaders (to load dependencies)!
	ResourceManager.prototype.load = function(alias, url) {
		if(this.state !== STATE_LOADING)
			this.die();
		
		url = url || alias;
		
		var item = {alias: alias, url: url};
		this.liveList.push(item);
		
		if(!(alias in this.dict)) {
			var ext = url.slice(url.lastIndexOf(".") + 1).toLowerCase();
			if(ext in this.extensions) {
				this.extensions[ext](this, url, alias);
				++this.remaining;
			}
			else
				throw new Error("ResourceManager: Unregistered extension '." + ext + "'");
		}
	};
	
	ResourceManager.prototype.onDone = function(alias, data) {
		this.dict[alias] = data;
		
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
				delete killList[this.liveList[i].alias];
			
			aliases = Object.keys(killList);
			for(i = 0; i < aliases.length; ++i) {
				console.log("Killing resource:" + alias);
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
	
	return ResourceManager;
});