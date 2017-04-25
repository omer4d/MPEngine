define([], function() {
	var ResourceLoader = {};

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
	
	ResourceLoader.registerTextureLoader = function(gl) {
		var loader = function(url, loaderCallback) {
			var image = new Image();
			image.src = url;
			image.addEventListener('load', function(e) {
				loaderCallback(url, textureFromImage(gl, e.target));
			});
			image.addEventListener('error', function(e) {
				loaderCallback(url, null);
			});
		};
		
		this.extensions.png = loader;
		this.extensions.bmp = loader;
		this.extensions.jpg = loader;
		this.extensions.jpeg = loader;
		this.extensions.gif = loader;
	};
	
	ResourceLoader.extensions = {
	};
	
	ResourceLoader.load = function(list, done) {
		var count = 0;
		var resDict = {};
		
		var resultHandler = function(url, data) {
			if(data)
				resDict[url] = data;
			
			++count;
			if(count === list.length)
				done(resDict);
		};
		
		for(var i = 0; i < list.length; ++i) {
			this.extensions.png(list[i], resultHandler);
		}
	};
	
	return ResourceLoader;
});