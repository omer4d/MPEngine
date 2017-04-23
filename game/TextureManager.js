define([], function() {
	function ispow2(x) {
		return (~x & (x - 1)) === (x - 1);
	}
	
	function loadTextures(dict, gl, urls, done) {
		var count = 0;
		
		var successCallback = function(e) {
			var image = e.target;
			var texture = gl.createTexture();
			
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
			
			
			if(ispow2(image.width) && ispow2(image.height)) {
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
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
			
			dict[image.src] = {handle: texture, width: image.width, height: image.height};
			
			++count;
			
			if(count === urls.length)
				done(dict);
		};
		
		var errorCallback = function(e) {
			++count;
			if(count === urls.length)
				done(dict);
		}
		
		for(var i = 0; i < urls.length; ++i) {
			var image = new Image();
			image.src = urls[i];
			image.key = relUrls[i].slice(0, relUrls[i].lastIndexOf("."));
			image.addEventListener('load', successCallback);
			image.addEventListener('error', errorCallback);
		}
	}
	
	function TextureManager(gl) {
		this.gl = gl;
		this.temp = {};
		this.oldTemp = {};
		this.baseUrl = "";
	}
	
	TextureManager.prototype.setBaseUrl = function(baseUrl) {
		this.baseUrl = baseUrl;
	};
	
	TextureManager.prototype.begin = function() { 
		this.oldTemp = {};
		
		Object.keys(temp).forEach(function(url) {
			oldTemp[url] = temp[url];
		});
		
		this.temp = {};
	};
	
	TextureManager.prototype.add = function(url) {
		this.temp[url] = null;
	};
	
	TextureManager.prototype.end = function(done) {
		var self = this;
		var newUrls = [];
		
		Object.keys(oldTemp).forEach(function(url) {
			// Delete textures that weren't requested again:
			if(self.oldTemp[url] && !(url in temp)) {
				self.gl.deleteTexture(self.oldTemp[url]);
			}
		});
		
		Object.keys(temp).forEach(function(url) {
			// Recycle already loaded textures:
			if(url in self.oldTemp)
				self.temp[url] = self.oldTemp[url];
			else
				newUrls.push(url);
		});
		
		loadTextures(self.temp, self.gl, newUrls, done);
	};
	
	return TextureManager;
});