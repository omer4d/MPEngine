define([], function() {
	function ispow2(x) {
		return (~x & (x - 1)) === (x - 1);
	}
	
	function loadTextures(dict, gl, pairs, done) {
		var count = 0;
		
		var successCallback = function(e) {
			var image = e.target;
			var texture = gl.createTexture();
			
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
			
			
			if(ispow2(image.width) && ispow2(image.height)) {
				//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
				//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 1);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
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
			
			dict[image.alias] = {handle: texture, width: image.width, height: image.height};
			
			++count;
			
			if(count === pairs.length)
				done(dict);
		};
		
		var errorCallback = function(e) {
			++count;
			
			dict[e.target.alias] = null;
			
			if(count === pairs.length)
				done(dict);
		}
		
		for(var i = 0; i < pairs.length; ++i) {
			var image = new Image();
			image.src = pairs[i].url;
			image.alias = pairs[i].alias;
			image.addEventListener('load', successCallback);
			image.addEventListener('error', errorCallback);
		}
	}
	
	function TextureManager(gl) {
		this.gl = gl;
		this.temp = {};
		this.oldTemp = {};
	}
	
	TextureManager.prototype.begin = function() {
		var self = this;
		self.oldTemp = {};
		
		Object.keys(self.temp).forEach(function(alias) {
			self.oldTemp[alias] = self.temp[alias];
		});
		
		self.temp = {};
	};
	
	TextureManager.prototype.add = function(alias, url) {
		this.temp[alias] = url;
	};
	
	TextureManager.prototype.end = function(done) {
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
		
		loadTextures(self.temp, self.gl, newPairs, done);
	};
	
	return TextureManager;
});