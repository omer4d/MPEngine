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

	function ResourceEntry(url, data, cleanupFunc) {
	  this.url = url;
		this.data = data;
		this.cleanupFunc = cleanupFunc;
		this.deps = []; // Dependency ResourceEntries
	}

	ResourceEntry.prototype.get = function() {
		return this.data;
	};

	function ResourceManager() {
		this.extensions = {};
		this.queue = [];
		this.liveList = []; // urls (string)
		this.cache = {}; // url (string) -> ResourceEntry
		this.dict = {}; // key (string) -> ResourceEntry
		this.remaining = 0;
		this.userDoneCallback = null;
		this.state = STATE_DONE_LOADING;
		this.nextAutoId = 0;
		
		this.registerDefaultLoaders();
	}

	ResourceManager.prototype.registerDefaultLoaders = function() {
		var textLoader = makeGenericLoader("text");
		this.extensions.json = makeGenericLoader("json");
		this.extensions.txt = textLoader;
		this.extensions.frag = textLoader;
		this.extensions.vert = textLoader;
	};

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

	ResourceManager.prototype.registerLoader = function(ext, loader) {
		this.extensions[ext] = loader;
	};

	ResourceManager.prototype.get = function(key) {
		if(this.state !== STATE_DONE_LOADING)
			this.die();
		
		var entry = this.dict[key];
		return entry ? entry.data : null;
	};

	ResourceManager.prototype.begin = function() {
		if(this.state !== STATE_DONE_LOADING)
			this.die();
		
		this.queue = [];
		this.liveList = [];
		this.userDoneCallback = null;
		this.dict = {};
		
		this.state = STATE_REGISTERING_RESOURCES;
	};

	ResourceManager.prototype.markDepTree = function(entry) {
		for(var i = 0; i < entry.deps.length; ++i) {
			this.liveList.push(entry.deps[i].url);
			this.markDepTree(entry.deps[i]);
		}
	};

	ResourceManager.prototype.add = function(key, url) {
	  if(this.state !== STATE_REGISTERING_RESOURCES)
			this.die();
	  
		key = key || ("__anonymous" + (this.nextAutoId++));
		url = url || key;
		
		var entry = this.dict[key] || this.cache[url] || new ResourceEntry(url, null, null);
		
		if(entry.url !== url)
		  throw new Error("ResourceManager: conflicting URLs for '" + key + "': " + entry.url + " (old) vs. " + url + " (new)");

		this.dict[key] = entry;
		this.liveList.push(url);

		if(!this.cache[url]) {
		  this.cache[url] = entry;
		  this.queue.push(url);
		}else {
			this.markDepTree(entry);
		}
		return entry;
	};

	// To be called only by loaders!
	ResourceManager.prototype.addDep = function(parentUrl, key, url) {
		if(this.state !== STATE_LOADING)
			this.die();
		
		key = key || ("__anonymous" + (this.nextAutoId++));
		url = url || key;
		
		var entry = this.dict[key] || this.cache[url] || new ResourceEntry(url, null, null);
		
		if(entry.url !== url)
		  throw new Error("ResourceManager: conflicting URLs for '" + key + "': " + entry.url + " (old) vs. " + url + " (new)");

		this.dict[key] = entry;
		this.liveList.push(url);
	  
		if(!this.cache[url]) {
		  this.cache[url] = entry;
		  var ext = url.slice(url.lastIndexOf(".") + 1).toLowerCase();
			if(ext in this.extensions) {
				this.extensions[ext](this, url);
				++this.remaining;
			}
			else
				throw new Error("ResourceManager: Unregistered extension '." + ext + "'");
		}else {
			this.markDepTree(entry);
		}
		
		this.cache[parentUrl].deps.push(entry);
		return entry;
	};

	ResourceManager.prototype.gc = function() {
		var killList = {};
		var urls = Object.keys(this.cache);
		var i;
		
		for(i = 0; i < urls.length; ++i)
			killList[urls[i]] = true;
		
		for(i = 0; i < this.liveList.length; ++i)
			delete killList[this.liveList[i]];
		
		urls = Object.keys(killList);
		for(i = 0; i < urls.length; ++i) {
			var entry = this.cache[urls[i]];
			
			entry.data = null;
			if(entry.cleanupFunc)
				entry.cleanupFunc(entry.data);
			
			delete this.cache[urls[i]];
		}
	}

	ResourceManager.prototype.onDone = function(url, data, cleanupFunc) {
		this.cache[url].data = data;
		this.cache[url].cleanupFunc = cleanupFunc;
		
		if(data === null || data === undefined)
			console.log("Failed to load '" + url + "'");
		
		--this.remaining;
		if(this.remaining === 0) {
			this.gc();
			this.state = STATE_DONE_LOADING;
			this.userDoneCallback();
		}
	};

	ResourceManager.prototype.end = function(done) {
		if(this.state !== STATE_REGISTERING_RESOURCES)
			this.die();
		
		this.userDoneCallback = done;
		this.state = STATE_LOADING;
		
		if(this.queue.length === 0) {
			this.gc();
			this.state = STATE_DONE_LOADING;
			
			setTimeout(function() {
				done();
			}, 0); // Allows nested loads by returning immediately and postponing the callback.
		}
		
		for(var i = 0; i < this.queue.length; ++i) {
			var url = this.queue[i];
			var ext = url.slice(url.lastIndexOf(".") + 1).toLowerCase();
			if(ext in this.extensions) {
				this.extensions[ext](this, url);
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