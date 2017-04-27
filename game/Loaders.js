define(["ConVars", "Level", "Wad", "SpriteAtlas", "GLUtil"], function(cvars, Level, Wad, SpriteAtlas, GLUtil) {
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
			if(cvars.r_use_mipmaps) {
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			}else {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}
			
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
	
	function makeGenericLoader(responseType, processor) {
		return function(rm, url) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = responseType;
			
			request.onload = function() {
				rm.onDone(url, request.status >= 200 && request.status < 400 ? processor(request.response) : null);
			};

			request.onerror = function() {
				rm.onDone(url, null);
			};

			request.send();
		};
	}
	
	function registerTextureLoader(rm, gl) {
		var cleanup = function(handle) {
			gl.deleteTexture(handle);
		};
		
		var loader = function(rm, url) {
			var image = new Image();
			image.src = url;
			image.addEventListener('load', function(e) {
				rm.onDone(url, textureFromImage(gl, e.target), cleanup);
			});
			image.addEventListener('error', function(e) {
				rm.onDone(url, null);
			});
		};
		
		rm.registerLoader("png", loader);
		rm.registerLoader("bmp", loader);
		rm.registerLoader("jpg", loader);
		rm.registerLoader("jpeg", loader);
		rm.registerLoader("gif", loader);
	};
	
	/*
	function registerShaderLoaders(rm, gl) {
		rm.registerLoader("frag", makeGenericLoader(function(src) {
			return GLUtil.createShader(gl, gl.FRAGMENT_SHADER, src);
		});
		
		rm.registerLoader("vert", makeGenericLoader(function(src) {
			return GLUtil.createShader(gl, gl.VERTEX_SHADER, src);
		});
	}*/
	
	function registerMaterialLoader(rm, gl) {
		/*
		rm.registerLoader("mat", function(rm, url) {
			setTimeout(function() {
				var texRes = rm.addDep(url, null, "data/textures/" + url + ".png");
				var fragRes = rm.addDep(url, "shaders/illuminated.frag", "data/shaders/illuminated.frag");
				var vertRes = rm.addDep(url, "shaders/simple.vert", "data/shaders/simple.vert");
				rm.onDone(url, {
					texRes: texRes,
					fragRes: fragRes,
					vertRes: vertRes,
					program: null,
					use: function(gl) {
						
					}
				});
			}, 0);
		});*/
	}
	
	function registerLevelLoader(rm) {
		rm.registerLoader("wad", function(rm, url) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = "arraybuffer";
				
			request.onload = function() {
				var level = new Level(Wad.read(request.response));
				console.log(level.lumps);
				var texList = level.genTextureNameList();
				
				for(var i = 0; i < texList.length; ++i)
					rm.addDep(url, texList[i], "data/textures/" + texList[i] + ".png");
				
				rm.onDone(url, request.status >= 200 && request.status < 400 ? level : null);
			};

			request.onerror = function() {
				rm.onDone(url, null);
			};

			request.send();
		});
	}
	
	function registerAtlasLoader(rm) {
		rm.registerLoader("atlas", function(rm, url) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = "json";
			
			request.onload = function() {
				var sheets = request.response;
				var atlas = {};
				var lastSlash = url.lastIndexOf("/");
				var base = url.slice(0, lastSlash < 0 ? 0 : (lastSlash + 1));
				var sheetTexHandles = [];
				
				for(var i = 0; i < sheets.length; ++i) {
					sheetTexHandles.push(rm.addDep(url, null, base + sheets[i].meta.image));
				}
				
				rm.onDone(url, request.status >= 200 && request.status < 400 ? new SpriteAtlas(rm, sheets, sheetTexHandles) : null);
			};

			request.onerror = function() {
				rm.onDone(url, null);
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