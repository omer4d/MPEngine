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
	
	function ResourceManager() {
		this.extensions = {};
		this.temp = {};
		this.oldTemp = {};
		this.ready = true;
	}
	
	ResourceManager.prototype.registerTextureLoader = function(gl) {
		var loader = function(url, alias, loaderCallback) {
			var image = new Image();
			image.src = url;
			image.addEventListener('load', function(e) {
				loaderCallback(alias, textureFromImage(gl, e.target));
			});
			image.addEventListener('error', function(e) {
				loaderCallback(alias, null);
			});
		};
		
		this.extensions.png = loader;
		this.extensions.bmp = loader;
		this.extensions.jpg = loader;
		this.extensions.jpeg = loader;
		this.extensions.gif = loader;
	};
	
	ResourceManager.prototype.get = function(alias) {
		return this.ready ? this.temp[alias] : null;
	};
	
	ResourceManager.prototype.begin = function() {
		var self = this;
		self.oldTemp = {};
		
		Object.keys(self.temp).forEach(function(alias) {
			self.oldTemp[alias] = self.temp[alias];
		});
		
		self.temp = {};
		self.ready = false;
	};
	
	ResourceManager.prototype.add = function(alias, url) {
		this.temp[alias] = url;
	};
	
	ResourceManager.prototype.end = function(done) {
		var self = this;
		var newPairs = [];
		
		Object.keys(self.oldTemp).forEach(function(alias) {
			// Delete textures that weren't requested again:
			if(self.oldTemp[alias] && !(alias in self.temp)) {
				self.gl.deleteTexture(self.oldTemp[alias]);
			}
		});
		
		Object.keys(self.temp).forEach(function(alias) {
			// Recycle already loaded textures:
			if(alias in self.oldTemp)
				self.temp[alias] = self.oldTemp[alias];
			else
				newPairs.push({alias: alias, url: self.temp[alias]});
		});
		
		self.ready = true;
		
		var count = 0;
		
		var resultHandler = function(alias, data) {
			self.temp[alias] = data;
			
			++count;
			if(count === newPairs.length)
				done();
		};
		
		for(var i = 0; i < newPairs.length; ++i) {
			this.extensions.png(newPairs[i].url, newPairs[i].alias, resultHandler);
		}
	};
	
	return ResourceManager;
});