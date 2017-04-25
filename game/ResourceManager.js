define([], function() {
	function ispow2(x) {
		return (~x & (x - 1)) === (x - 1);
	}
	
	function textureFromImage(gl, image) {
		var texture = gl.createTexture();
		
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
		
		if(ispow2(image.width) && ispow2(image.height)) {
			//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
			//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 1);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);//_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		}
		
		else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			
			//if(!ispow2(image.height))
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			//if(!ispow2(image.width))
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			
			//console.log("Warning: " + image.name + " is a non-pow2 texture.");
		}
		
		return {handle: texture, width: image.width, height: image.height};
	}
	
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
		
		this.registerDefaultLoaders();
	}
	
	ResourceManager.prototype.registerDefaultLoaders = function() {
		var textLoader = makeGenericLoader("text");
		this.extensions.json = makeGenericLoader("json");
		this.extensions.txt = textLoader;
		this.extensions.frag = textLoader;
		this.extensions.vert = textLoader;
	};
	
	ResourceManager.prototype.registerTextureLoader = function(gl) {
		var loader = function(rm, url, alias) {
			var image = new Image();
			image.src = url;
			image.addEventListener('load', function(e) {
				rm.onDone(alias, textureFromImage(gl, e.target));
			});
			image.addEventListener('error', function(e) {
				rm.onDone(alias, null);
			});
		};
		
		this.extensions.png = loader;
		this.extensions.bmp = loader;
		this.extensions.jpg = loader;
		this.extensions.jpeg = loader;
		this.extensions.gif = loader;
	};
	
	ResourceManager.prototype.registerLoader = function(ext, loader) {
		this.extensions[ext] = loader;
	};
	
	ResourceManager.prototype.get = function(alias) {
		if(this.remaining > 0)
			throw new Error("ResourceManager: tried to call 'get' beforce loading was finished!");
		
		return this.dict[alias];
	};
	
	ResourceManager.prototype.begin = function() {
		if(this.remaining > 0)
			throw new Error("ResourceManager: tried to call 'begin' beforce loading was finished!");
		
		this.queue = [];
		this.liveList = [];
		this.userDoneCallback = null;
	};
	
	ResourceManager.prototype.add = function(alias, url) {
		if(this.remaining > 0)
			throw new Error("ResourceManager: tried to call 'queue' beforce loading was finished!");
		
		url = url || alias;
		
		var item = {alias: alias, url: url};
		this.liveList.push(item);
		
		if(!(alias in this.dict))
			this.queue.push(item);
	};
	
	// To be called only by loaders (to load dependencies)!
	ResourceManager.prototype.load = function(alias, url) {
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
			this.userDoneCallback();
		}
	};
	
	ResourceManager.prototype.end = function(done) {
		this.userDoneCallback = done;
		
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