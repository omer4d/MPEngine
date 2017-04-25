define(["Level", "Wad", "SpriteAtlas"], function(Level, Wad, SpriteAtlas) {
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
	
	function registerTextureLoader(rm, gl) {
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
		
		rm.registerLoader("png", loader);
		rm.registerLoader("bmp", loader);
		rm.registerLoader("jpg", loader);
		rm.registerLoader("jpeg", loader);
		rm.registerLoader("gif", loader);
	};
	
	function registerLevelLoader(rm) {
		rm.registerLoader("wad", function(rm, url, alias) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = "arraybuffer";
				
			request.onload = function() {
				var level = new Level(Wad.read(request.response));
				console.log(level.lumps);
				var texList = level.genTextureNameList();
				
				for(var i = 0; i < texList.length; ++i)
					rm.load(texList[i], "data/textures/" + texList[i] + ".png");
				
				rm.onDone(alias, request.status >= 200 && request.status < 400 ? level : null);
			};

			request.onerror = function() {
				rm.onDone(alias, null);
			};

			request.send();
		});
	}
	
	function registerAtlasLoader(rm) {
		rm.registerLoader("atlas", function(rm, url, alias) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = "json";
			
			request.onload = function() {
				var sheets = request.response;
				var atlas = {};
				var lastSlash = url.lastIndexOf("/");
				var base = url.slice(0, lastSlash < 0 ? 0 : (lastSlash + 1));
				
				for(var i = 0; i < sheets.length; ++i)
					rm.load(sheets[i].meta.image, base + sheets[i].meta.image);
				
				rm.onDone(alias, request.status >= 200 && request.status < 400 ? new SpriteAtlas(rm, sheets) : null);
			};

			request.onerror = function() {
				rm.onDone(alias, null);
			};

			request.send();
		});
	}
	
	return {
		register: function(rm, gl) {
			registerTextureLoader(rm, gl);
			registerLevelLoader(rm);
			registerAtlasLoader(rm);
		}
	};
});