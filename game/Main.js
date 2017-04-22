require(["Wad", "Matrix4", "Mesh", "TextureManager"], function(Wad, m4, Mesh, TextureManager) {
	
	function createShader(gl, type, source) {
	  var shader = gl.createShader(type);
	  gl.shaderSource(shader, source);
	  gl.compileShader(shader);
	  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	  if (success) {
		return shader;
	  }
	 
	  console.log(source, "\n", gl.getShaderInfoLog(shader));
	  gl.deleteShader(shader);
	}

	function createProgram(gl, vertexShader, fragmentShader) {
	  var program = gl.createProgram();
	  gl.attachShader(program, vertexShader);
	  gl.attachShader(program, fragmentShader);
	  gl.linkProgram(program);
	  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	  if (success) {
		return program;
	  }
	 
	  console.log(gl.getProgramInfoLog(program));
	  gl.deleteProgram(program);
	}

	var GRID_TEXTURES = false;
	//var WAD_NAME = "/zaza2.wad";
	var WAD_NAME = "/data/e1m1.wad";

	var vertexShaderSource = `
	attribute vec4 a_position;
	attribute vec4 a_color;
	attribute vec2 a_texcoord;

	uniform mat4 u_matrix;

	varying vec4 v_color;
	varying vec2 v_texcoord;

	void main() {
	  gl_Position = u_matrix * a_position;
	  v_color = a_color;
	  v_texcoord = a_texcoord;
	}`;

	var fragmentShaderSource = `
	precision mediump float;

	varying vec4 v_color;
	varying vec2 v_texcoord;

	uniform sampler2D u_texture;


	float remap(in float a, float a0, float a1, float b0, float b1) {
		float k = (a - a0) / (a1 - a0);
		return mix(b0, b1, k);
	}

	float qremap(in float a, float a0, float a1, float b0, float b1) {
		float k = (a - a0) / (a1 - a0);
		return mix(b0, b1, k * k);
	}


	void main() {
		float n = 25.0;
		float f = 10000.0;
		float zndc = gl_FragCoord.z * 2.0 - 1.0;
		float z = -2.0*f*n / (zndc*(f-n)-(f+n));
		float minz = -n;
		float maxz = -1000.0;
		
		vec3 t = texture2D(u_texture, v_texcoord).xyz;
		float dark = 1.0 - v_color.r;
		float finalDarkness = 0.0;
		
		float level1 = 1.0;
		float level2 = 1.0-dark*0.5;
		float level3 = pow(1.0 - dark, 1.2);
		float level4 = pow(1.0 - dark, 1.7);
		float level5 = pow(1.0 - dark, 2.7);
		float level6 = pow(1.0 - dark, 3.1);
		
		float dist1 = 25.0;
		float dist2 = 50.0;
		float dist3 = 90.0;
		float dist4 = 150.0;
		float dist5 = 300.0;
		float dist6 = 500.0;
		
		if(z < dist2)
			finalDarkness = remap(z, dist1, dist2, level1, level2);
		else if(z < dist3)
			finalDarkness = remap(z, dist2, dist3, level2, level3);
		else if(z < dist4)
			finalDarkness = remap(z, dist3, dist4, level3, level4);
		else if(z < dist5)
			finalDarkness = qremap(z, dist4, dist5, level4, level5);
		else if(z < dist6)
			finalDarkness = qremap(z, dist5, dist6, level5, level6);
		else
			finalDarkness = level6;
		
		float grey = t.b * 0.7 + t.r * 0.1 + t.g * 0.2;    // + 0.59 * t.g + 0.11 * t.b;
		float low_contrast_grey = min(grey + 0.55, 1.0) - 0.55; 
		
		vec3 greycol = vec3(low_contrast_grey);
		
		float fd2 = min(1.0, finalDarkness * 2.3);
		
		vec3 mixed = mix(greycol, t, fd2);
		
		gl_FragColor = vec4(vec3(mixed *    finalDarkness * 1.3+0.1), 1.0);
	}
	`;


	function translateGlSeg(lumps, seg) {
		var x1, y1, x2, y2;
		var glVertFlag = 1 << 15;
		
		if(seg.v1Idx & glVertFlag) {
			x1 = lumps.GL_VERT[seg.v1Idx & ~glVertFlag].x / 65536.0;
			y1 = lumps.GL_VERT[seg.v1Idx & ~glVertFlag].y / 65536.0;
		}else {
			x1 = lumps.VERTEXES[seg.v1Idx].x;
			y1 = lumps.VERTEXES[seg.v1Idx].y;
		}
		
		if(seg.v2Idx & glVertFlag) {
			x2 = lumps.GL_VERT[seg.v2Idx & ~glVertFlag].x / 65536.0;
			y2 = lumps.GL_VERT[seg.v2Idx & ~glVertFlag].y / 65536.0;
		}else {
			x2 = lumps.VERTEXES[seg.v2Idx].x;
			y2 = lumps.VERTEXES[seg.v2Idx].y;
		}
		
		return {x1: x1, y1: y1, x2: x2, y2: y2};
	}

	function findLinedefSector(lumps, linedef, side) {
		var sidedef = lumps.SIDEDEFS[side ? linedef.negSidedefIdx : linedef.posSidedefIdx];
		return lumps.SECTORS[sidedef.sectorIdx];
	}

	function findSegSector(lumps, seg) {
		return findLinedefSector(lumps, lumps.LINEDEFS[seg.linedefIdx], seg.side);
	}



	function genTextureNameList(lumps) {
		var textures = {"error_missing_texture": true, "error_bad_format": true};
		
		for(var i = 0; i < lumps.SECTORS.length; ++i) {
			var sector = lumps.SECTORS[i];
			textures[sector.floorTexName] = true;
			textures[sector.ceilTexName] = true;
		}
		
		for(i = 0; i < lumps.LINEDEFS.length; ++i) {
			var linedef = lumps.LINEDEFS[i];
			var sidedef1 = linedef.posSidedefIdx !== 0xFFFF ? lumps.SIDEDEFS[linedef.posSidedefIdx] : null;
			var sidedef2 = linedef.negSidedefIdx !== 0xFFFF ? lumps.SIDEDEFS[linedef.negSidedefIdx] : null;
			
			if(sidedef1) {
				textures[sidedef1.lowTexName] = true;
				textures[sidedef1.midTexName] = true;
				textures[sidedef1.hiTexName] = true;
			}
			
			if(sidedef2) {
				textures[sidedef2.lowTexName] = true;
				textures[sidedef2.midTexName] = true;
				textures[sidedef2.hiTexName] = true;
			}
		}
		
		if("-" in textures)
			delete textures["-"];
		
		return Object.keys(textures);
	}

	function wadToMesh(gl, lumps, textures) {
		var mesh = new Mesh(gl);
		var tris = {};
		var colors = {};
		var texcoords = {};
		
		console.log(textures);

		var initTex = function(name) {
			tris[name] = tris[name] || [];
			colors[name] = colors[name] || [];
			texcoords[name] = texcoords[name] || [];
		};
		
		var pushWall = function(name, alignTop, x1, y1, x2, y2, h1, h2, sidedef, texTop) {
			tris[name] = tris[name] || [];
			colors[name] = colors[name] || [];
			texcoords[name] = texcoords[name] || [];
			
			var offsU = sidedef.xOffs;
			var	offsV = sidedef.yOffs;
			
			var nx = y1 - y2, ny = x2 - x1;
			var dw = Math.sqrt(nx*nx + ny*ny);
			var dh = h2 - h1;
			
			var lightDirX = 1;
			var lightDirY = 0.5;
			var lightDirLen = Math.sqrt(lightDirX*lightDirX + lightDirY*lightDirY);
			lightDirX /= lightDirLen;
			lightDirY /= lightDirLen;
			nx /= dw;
			ny /= dw;
			
			var dp = 1;// 1.1 - 0.1 * Math.max(lightDirX*nx + lightDirY * ny, 0);
			
			var r = Math.floor(lumps.SECTORS[sidedef.sectorIdx].light * dp);//200 + Math.floor(55*dp); //Math.floor((nx / len + 1) / 2 * 128 + 127);
			var g = Math.floor(lumps.SECTORS[sidedef.sectorIdx].light * dp);//200 + Math.floor(55*dp); //Math.floor((ny / len + 1) / 2 * 128 + 127);
			var b = Math.floor(lumps.SECTORS[sidedef.sectorIdx].light * dp);//200 + Math.floor(55*dp);
			
			var tr = tris[name];
			var col = colors[name];
			var tex = texcoords[name];
			
			var tw = textures[name] ? textures[name].width : 64;
			var th = textures[name] ? textures[name].height : 64;
			
			var u0 = offsU / tw;
			var u1 = (dw + offsU)/tw;
			var v0 = (alignTop ? 1-dh/th : 0) - ((texTop ? texTop - h2 : 0) + offsV)/th;
			var v1 = (alignTop ? 1 : dh/th) - ((texTop ? texTop - h2 : 0) + offsV)/th;
			
			tr.push(x1, h1, y1);
			tr.push(x1, h2, y1);
			tr.push(x2, h1, y2);
			
			tex.push(u0, v0);
			tex.push(u0, v1);
			tex.push(u1, v0);
			
			tr.push(x1, h2, y1);
			tr.push(x2, h2, y2);
			tr.push(x2, h1, y2);
			
			tex.push(u0, v1);
			tex.push(u1, v1);
			tex.push(u1, v0);
			
			
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);
			
			/*
			tr.push(x1, h1, y1);
			tr.push(x1, h2, y1);
			tr.push(x2, h1, y2);
			
			tex.push(0, 0);
			tex.push(0, dh/th);
			tex.push(dw/tw, 0);
			
			tr.push(x1, h2, y1);
			tr.push(x2, h2, y2);
			tr.push(x2, h1, y2);
			
			tex.push(0, dh/th);
			tex.push(dw/tw, dh/th);
			tex.push(dw/tw, 0);
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);*/
		}
		
		for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
			var ssect = lumps.GL_SSECT[i];
			var seg = lumps.GL_SEGS[ssect.firstSegIdx];
			var tseg = translateGlSeg(lumps, seg);
			var x0 = tseg.x1, y0 = tseg.y1;
			var sector = findSegSector(lumps, seg);
			var h1 = sector.floorHeight;
			var h2 = sector.ceilHeight;
			
			var r = sector.light;//Math.floor(Math.random() * 100 + 100);
			var g = sector.light;//Math.floor(Math.random() * 100 + 100);
			var b = sector.light;//Math.floor(Math.random() * 100 + 100);
			
			for(var j = 1; j < ssect.segNum - 1; ++j) {
				var seg = lumps.GL_SEGS[ssect.firstSegIdx + j];
				var tseg = translateGlSeg(lumps, seg);
				var br = 0.8 + Math.random() * 0.2;
				var r1 = r;//255;//Math.floor(r * br);
				var g1 = r;//255;//Math.floor(g * br);
				var b1 = r;//255;//Math.floor(b * br);
				
				// floor
				initTex(sector.floorTexName);
				
				tris[sector.floorTexName].push(x0, h1, y0);
				tris[sector.floorTexName].push(tseg.x1, h1, tseg.y1);
				tris[sector.floorTexName].push(tseg.x2, h1, tseg.y2);
				
				texcoords[sector.floorTexName].push(x0 / 64, y0 / 64);
				texcoords[sector.floorTexName].push(tseg.x1 / 64, tseg.y1 / 64);
				texcoords[sector.floorTexName].push(tseg.x2 / 64, tseg.y2 / 64);
				
				colors[sector.floorTexName].push(r1, g1, b1);
				colors[sector.floorTexName].push(r1, g1, b1);
				colors[sector.floorTexName].push(r1, g1, b1);
				
				// ceil
				
				initTex(sector.ceilTexName);
				
				tris[sector.ceilTexName].push(x0, h2, y0);
				tris[sector.ceilTexName].push(tseg.x1, h2, tseg.y1);
				tris[sector.ceilTexName].push(tseg.x2, h2, tseg.y2);
				
				texcoords[sector.ceilTexName].push(x0 / 64, y0 / 64);
				texcoords[sector.ceilTexName].push(tseg.x1 / 64, tseg.y1 / 64);
				texcoords[sector.ceilTexName].push(tseg.x2 / 64, tseg.y2 / 64);
				
				colors[sector.ceilTexName].push(r1, g1, b1);
				colors[sector.ceilTexName].push(r1, g1, b1);
				colors[sector.ceilTexName].push(r1, g1, b1);
			}
		}
		
		/*
		for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
			var ssect = lumps.GL_SSECT[i];
			
			for(var j = 0; j < ssect.segNum; ++j) {
				var seg = lumps.GL_SEGS[ssect.firstSegIdx + j];
				var tseg = translateGlSeg(lumps, seg);

				if(seg.linedefIdx !== 0xFFFF) {
					var linedef = lumps.LINEDEFS[seg.linedefIdx];
					var sec1 = linedef.posSidedefIdx !== 65535 ? findLinedefSector(lumps, linedef, 0) : null;
					var sec2 = linedef.negSidedefIdx !== 65535 ? findLinedefSector(lumps, linedef, 1) : null;
					var x1 = tseg.x1;
					var y1 = tseg.y1;
					var x2 = tseg.x2;
					var	y2 = tseg.y2;
			
					if(!sec1)
						pushWall(tris, colors, x1, y1, x2, y2, sec2.floorHeight, sec2.ceilHeight);
					else if(!sec2)
						pushWall(tris, colors, x1, y1, x2, y2, sec1.floorHeight, sec1.ceilHeight);
					else {
						pushWall(tris, colors, x1, y1, x2, y2, Math.min(sec1.floorHeight, sec2.floorHeight), Math.max(sec1.floorHeight, sec2.floorHeight));
						pushWall(tris, colors, x1, y1, x2, y2, Math.min(sec1.ceilHeight, sec2.ceilHeight), Math.max(sec1.ceilHeight, sec2.ceilHeight));
					}
				}
			}
		}*/
		
		for(i = 0; i < lumps.LINEDEFS.length; ++i) {
			var linedef = lumps.LINEDEFS[i];
			
			var sidedef1 = linedef.posSidedefIdx !== 0xFFFF ? lumps.SIDEDEFS[linedef.posSidedefIdx] : null;
			var sidedef2 = linedef.negSidedefIdx !== 0xFFFF ? lumps.SIDEDEFS[linedef.negSidedefIdx] : null;
			
			var sec1 = sidedef1 ? lumps.SECTORS[sidedef1.sectorIdx] : null;
			var sec2 = sidedef2 ? lumps.SECTORS[sidedef2.sectorIdx] : null;
			
			var x1 = lumps.VERTEXES[linedef.v1Idx].x;
			var y1 = lumps.VERTEXES[linedef.v1Idx].y;
			var x2 = lumps.VERTEXES[linedef.v2Idx].x;
			var y2 = lumps.VERTEXES[linedef.v2Idx].y;
			
			var lu = linedef.flags & Wad.LOWER_UNPEGGED;
			var uu = linedef.flags & Wad.UPPER_UNPEGGED;
			
			if(!sidedef1)
				pushWall(sidedef2.midTexName, !lu, x1, y1, x2, y2, sec2.floorHeight, sec2.ceilHeight, sidedef2);
			else if(!sec2)
				pushWall(sidedef1.midTexName, !lu, x1, y1, x2, y2, sec1.floorHeight, sec1.ceilHeight, sidedef1);
			else {
				if(sec1.floorHeight < sec2.floorHeight)
					pushWall(sidedef1.lowTexName, true, x1, y1, x2, y2, sec1.floorHeight, sec2.floorHeight,
								sidedef1, lu ? Math.max(sec1.ceilHeight, sec2.ceilHeight) : undefined);
				else
					pushWall(sidedef2.lowTexName, true, x1, y1, x2, y2, sec2.floorHeight, sec1.floorHeight,
								sidedef2, lu ? Math.max(sec1.ceilHeight, sec2.ceilHeight) : undefined);

				
				if(sec1.ceilHeight > sec2.ceilHeight)
					pushWall(sidedef1.hiTexName, uu, x1, y1, x2, y2, sec2.ceilHeight, sec1.ceilHeight, sidedef1);
				else
					pushWall(sidedef2.hiTexName, uu, x1, y1, x2, y2, sec1.ceilHeight, sec2.ceilHeight, sidedef2);
			}
		}
		
		var submeshes = [];
		var triTexList = Object.keys(tris);
		
		var jointTris = [];
		var jointColors = [];
		var jointTexCoords = [];
		
		triTexList.forEach(function(key) {
			
			submeshes.push({tex: textures[key] ? textures[key].handle : null,
							start: jointTris.length/3, len: tris[key].length/3});
			Array.prototype.push.apply(jointTris, tris[key]);
		});
		
		triTexList.forEach(function(key) {
			Array.prototype.push.apply(jointColors, colors[key]);
		});
		
		triTexList.forEach(function(key) {
			Array.prototype.push.apply(jointTexCoords, texcoords[key]);
		});
		
		mesh.setCoords(jointTris);
		mesh.setColors(jointColors);
		mesh.setTexCoords(jointTexCoords);
		
		return {
			mesh: mesh,
			submeshes: submeshes,
			textures: textures
		};
	}








	function findSubsector(lumps, idx, point) {
		var LEAF_FLAG = 1 << 15;
		
		if(idx & LEAF_FLAG) {
			return lumps.SSECTORS[idx & ~LEAF_FLAG];
		}else {
			var node = lumps.NODES[idx];
			var nx = -node.dy;
			var ny = node.dx;
			var dx = point.x - node.x;
			var dy = point.y - node.y;
			
			if(nx*dx+ny*dy >= 0)
				return findSubsector(lumps, node.leftChildIdx, point);
			else
				return findSubsector(lumps, node.rightChildIdx, point);
		}
	}

	function findSector(lumps, idx, point) {
		var ssector = findSubsector(lumps, idx, point);
		var seg = lumps.SEGS[ssector.firstSegIdx];
		var linedef = lumps.LINEDEFS[seg.linedefIdx];
		var sidedef = seg.side ? lumps.SIDEDEFS[linedef.negSidedefIdx] : lumps.SIDEDEFS[linedef.posSidedefIdx];
		return lumps.SECTORS[sidedef.sectorIdx];
	}



	window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};

	var keystates = {};

	window.addEventListener('keydown', function(e) {
		keystates[e.key] = true;
	});

	window.addEventListener('keyup', function(e) {
		keystates[e.key] = false;
	});

	var frameCount = 0;
	var fpsCounter = document.getElementById("fpsCounter");
	setInterval(function() {
		fpsCounter.textContent = "FPS: " + frameCount;
		frameCount = 0;
	}, 1000);


	var canvas = document.getElementById("myCanvas");
	var gl = canvas.getContext("webgl", {antialias: true, depth: true });


	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	var program = createProgram(gl, vertexShader, fragmentShader);

	var positionLocation = gl.getAttribLocation(program, "a_position");
	var colorLocation = gl.getAttribLocation(program, "a_color");
	var matrixLocation = gl.getUniformLocation(program, "u_matrix");
	var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
	var textureLocation = gl.getUniformLocation(program, "u_texture");


	var posX = 1032;
	var posY = -3200;

	//var posX = 200;
	//var posY = -360;

	var velX = 0;
	var velY = 0;
	var yaw = 0, pitch = 0;


	var lockedMouseMoveListener = function(e) {
		yaw += e.movementX / 250;
		pitch = Math.max(Math.min(pitch + e.movementY / 250, Math.PI / 2), -Math.PI / 2);
	};


	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.canvasExitPointerLock;

	canvas.onclick = function() {
	  canvas.requestPointerLock();
	};

	var locked = false;

	function lockChangeAlert() {
		var newLocked = document.pointerLockElement === canvas;
		
	  if (!locked && newLocked) {
		console.log('The pointer lock status is now locked');
		window.addEventListener("mousemove", lockedMouseMoveListener, false);
	  } else if(!newLocked && locked) {
		console.log('The pointer lock status is now unlocked');  
		window.removeEventListener("mousemove", lockedMouseMoveListener, false);
	  }
	  
	  locked = newLocked;
	}

	document.addEventListener('pointerlockchange', lockChangeAlert, false);
	document.addEventListener('mozpointerlockchange', lockChangeAlert, false);


	var mesh;// = new Renderer.DynamicMesh(10000);
	var submeshes;
	var textures;



	var oReq = new XMLHttpRequest();
	oReq.open("GET", WAD_NAME, true);
	oReq.responseType = "arraybuffer";

	var lumps;
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	var textureManager = new TextureManager(gl);
	
	
	function ispow2(x) {
		return (~x & (x - 1)) === (x - 1);
	}

	function loadTextures(textureNames, done) {
		var count = 0;
		var textures = {};
		
		var callback = function(e) {
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
			
			textures[image.name] = {handle: texture, width: image.width, height: image.height};
			
			++count;
			
			if(count === textureNames.length)
				done(textures);
		};
		
		var errorCallback = function(e) {
			++count;
			if(count === textureNames.length)
				done(textures);
		}
		
		for(var i = 0; i < textureNames.length; ++i) {
			var image = new Image();
			
			
			if(GRID_TEXTURES)
				image.src = "data/grid.png";
			else
				image.src = "data/textures/" + textureNames[i] + ".png";
			
			image.name = textureNames[i];
			image.addEventListener('load', callback);
			image.addEventListener('error', errorCallback);
		}
	}



	oReq.onload = function (oEvent) {
	  var arrayBuffer = oReq.response;
	  if (arrayBuffer) {
		lumps = Wad.read(arrayBuffer);
		console.log(lumps);
		
		loadTextures(genTextureNameList(lumps), function(t) {
			textures = t;
			
			var res = wadToMesh(gl, lumps, textures);
			mesh = res.mesh;
			submeshes = res.submeshes;
			
			renderLoop();
		});
		
		/*
		var image = new Image();
		image.src = "data/patch.png";
		image.addEventListener('load', function(event) {
		  console.log("img wh: ", event.target.width, event.target.height);
		  
		  gl.bindTexture(gl.TEXTURE_2D, texture);
		  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
		  gl.generateMipmap(gl.TEXTURE_2D);
		  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		  
		  
		});*/
	  }
	};

	oReq.send(null);

	/*
	*/


	function pointSegDist(lumps, seg, point) {
		var v1 = lumps.VERTEXES[seg.v1Idx];
		var v2 = lumps.VERTEXES[seg.v2Idx];
		var nx = -(v2.y - v1.y);
		var ny = v2.x - v1.x;
		var dx = point.x - v1.x;
		var dy = point.y - v1.y;
		return dx*nx + dy*ny;
	}

	function segSide(lumps, seg, point) {
		return pointSegDist(lumps, seg, point) < 0 ? -1 : 1;
	}

	function insideSubector(lumps, subsec, point) {
		for(var i = 0; i < subsec.segNum; ++i) {
			var seg = lumps.SEGS[subsec.firstSegIdx + i];
			var linedef = lumps.LINEDEFS[seg.linedefIdx];
			
			if(linedef.posSidedefIdx === 0xFFFF && segSide(lumps, seg, point) === -1)
				return false;
			if(linedef.negSidedefIdx === 0xFFFF && segSide(lumps, seg, point) === 1)
				return false;
		}
		
		return true;
	}

	function leavingSector(lumps, pos1, pos2) {
		var oldSub = findSubsector(lumps, lumps.NODES.length - 1, pos1);
		var newSub = findSubsector(lumps, lumps.NODES.length - 1, pos2);
		return insideSubector(lumps, oldSub, pos1) && !insideSubector(lumps, newSub, pos2);
	}


	// **************
	// * Collisions *
	// **************

	function findCircleSubsector(lumps, idx, point, rad) {
		var LEAF_FLAG = 1 << 15;
		
		if(idx & LEAF_FLAG) {
			return [lumps.GL_SSECT[idx & ~LEAF_FLAG]];
		}else {
			var node = lumps.GL_NODES[idx];
			var nx = -node.dy;
			var ny = node.dx;
			var len = Math.sqrt(nx*nx + ny*ny);
			nx /= len;
			ny /= len;
			var dx = point.x - node.x;
			var dy = point.y - node.y;
			var dot = nx*dx+ny*dy;
			
			if(dot >= rad) {
				return findCircleSubsector(lumps, node.leftChildIdx, point, rad);
			}
			else if(dot <= -rad) {
				return findCircleSubsector(lumps, node.rightChildIdx, point, rad);
			}
			else {
				return findCircleSubsector(lumps, node.leftChildIdx, point, rad).concat(findCircleSubsector(lumps, node.rightChildIdx, point, rad));
			}
		}
	}

	function circleVsSeg(seg, cx, cy, rad, out) {
		var dx = seg.x2 - seg.x1;
		var dy = seg.y2 - seg.y1;
		var len = Math.sqrt(dx*dx + dy*dy);
		var nx = -dy;
		var ny = dx;
		
		nx /= len;
		ny /= len;
		
		var vx1 = cx - seg.x1;
		var vy1 = cy - seg.y1;
		var dpt = dx*vx1 + dy*vy1;
		
		if(dpt >= 0 && dpt < dx*dx+dy*dy) {
			var dpn = nx*vx1 + ny*vy1;
			var mtd1 = rad - dpn;
			var mtd2 = -rad - dpn;
			var mtd = dpn > 0 ? mtd1 : mtd2;
			out.mtx = nx * mtd;
			out.mty = ny * mtd;
			out.nx = nx;
			out.ny = ny;
			return Math.abs(dpn) <= rad;
		}else {
			var vx2 = cx - seg.x2;
			var vy2 = cy - seg.y2;
			var d1 = vx1*vx1 + vy1*vy1;
			var d2 = vx2*vx2 + vy2*vy2;
			
			if(d1 > rad*rad && d2 > rad*rad)
				return false;
			
			if(d1 < d2) {
				d1 = Math.sqrt(d1);
				out.mtx = vx1/d1 * (rad - d1);
				out.mty = vy1/d1 * (rad - d1);
			}else {
				d2 = Math.sqrt(d2);
				out.mtx = vx2/d2 * (rad - d2);
				out.mty = vy2/d2 * (rad - d2);
			}
			
			return true;
		}
	}

	function oneSidedLinedef(linedef) {
		return linedef.posSidedefIdx === 0xFFFF || linedef.negSidedefIdx === 0xFFFF;
	}

	function linedefSector(lumps, linedef, pos) {
		var idx = pos ? linedef.posSidedefIdx : linedef.negSidedefIdx;
		return idx === 0xFFFF ? null : lumps.SECTORS[lumps.SIDEDEFS[idx].sectorIdx];
	}

	function circleVsMap(lumps, x, y, h, rad, res) {
		var posX = x, posY = y;
		var subs = findCircleSubsector(lumps, lumps.GL_NODES.length - 1, {x: posX, y: posY}, rad);
		var flag = false;
		
		for(var z = 0; z < 5; ++z) {
			var mtx = 0;
			var mty = 0;
			var count = 0;
			
			for(i = 0; i < subs.length; ++i) {
				for(var j = 0; j < subs[i].segNum; ++j) {
					var tseg = lumps.GL_SEGS[subs[i].firstSegIdx + j];
					if(tseg.linedefIdx !==  0xFFFF) {
						var out = {};
						var linedef = lumps.LINEDEFS[tseg.linedefIdx];
						var v1 = lumps.VERTEXES[linedef.v1Idx];
						var v2 = lumps.VERTEXES[linedef.v2Idx];
						var seg = {x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y};
						var side = segSide(lumps, linedef, {x: posX, y: posY});
						var otherSector = linedefSector(lumps, linedef, side === 1);
						
						var ph = 40;
						
						if( (!otherSector ||
								otherSector.floorHeight > h + 30 ||
								otherSector.ceilHeight < h + ph ||
								otherSector.ceilHeight - otherSector.floorHeight < ph) &&
							circleVsSeg(seg, posX, posY, rad, out)) {
							mtx += out.mtx;
							mty += out.mty;
							++count;
							flag = true;
						}
					}
				}
			}
			
			if(count > 0) {
				posX += mtx / count;
				posY += mty / count;
			}
		}
		
		res.mtx = posX - x;
		res.mty = posY - y;
		
		/*
		var oldSec = findSector(lumps, lumps.NODES.length - 1, {x: posX, y: posY});
		var newSec = findSector(lumps, lumps.NODES.length - 1, {x: newPosX, y: newPosY});
		
		var h1 = oldSec.floorHeight;
		
		if((!leavingSector(lumps, {x: posX, y: posY}, {x: newPosX, y: newPosY}) &&
			newSec.floorHeight - h1 < 30 && newSec.ceilHeight > h1 + 60) || keystates["q"]) {
			posX = newPosX;
			posY = newPosY;
		}*/
		
		
		return flag;
	}



	// *************
	// * Rendering *
	// *************







	var lastRenderTime = performance.now();

	function renderLoop() {
		var t = performance.now();
		var dt = (t - lastRenderTime)/1000;
		lastRenderTime = t;
		var moveSpeed = 0;
		var newPosX, newPosY;
		
		//console.log(keystates);
		
		//if(keystates["LeftShift"]) {
		//	moveSpeed
		//}
		moveSpeed = keystates["p"] ? 5 : 32;
		
		if(keystates["w"]) {
			velX += moveSpeed * Math.cos(yaw);
			velY += moveSpeed * Math.sin(yaw);
		}
		
		if(keystates["s"]) {
			velX += -moveSpeed * Math.cos(yaw);
			velY += -moveSpeed * Math.sin(yaw);
		}
		
		if(keystates["d"]) {
			velX += -moveSpeed * Math.sin(yaw);
			velY += moveSpeed * Math.cos(yaw);
		}
			
		if(keystates["a"]) {
			velX += moveSpeed * Math.sin(yaw);
			velY += -moveSpeed * Math.cos(yaw);
		}
		
		/*
		if(velX > 320)
			velX = 320;
		if(velX < -320)
			velX = -320;
		if(velY > 320)
			velY = 320;
		if(velY < -320)
			velY = -320;*/
		
		document.getElementById("speedCounter").textContent = "Speed: " + Math.floor(Math.sqrt(velX*velX+velY*velY));
		
		var newPosX = posX + velX * dt;
		var newPosY = posY + velY * dt;
		var posH = findSector(lumps, lumps.NODES.length - 1, {x: posX, y: posY}).floorHeight;
		
		posX = newPosX;
		posY = newPosY;
		
		var res = {};
		if(circleVsMap(lumps, posX, posY, posH, 25, res) && !keystates["q"]) {
			posX += res.mtx;
			posY += res.mty;
		}
		
		
		/*
		var oldSec = findSector(lumps, lumps.NODES.length - 1, {x: posX, y: posY});
		var newSec = findSector(lumps, lumps.NODES.length - 1, {x: newPosX, y: newPosY});
		
		var h1 = oldSec.floorHeight;
		
		if((!leavingSector(lumps, {x: posX, y: posY}, {x: newPosX, y: newPosY}) &&
			newSec.floorHeight - h1 < 30 && newSec.ceilHeight > h1 + 60) || keystates["q"]) {
			posX = newPosX;
			posY = newPosY;
		}*/
		
		velX *= 0.9;
		velY *= 0.9;
		
		if(keystates["ArrowLeft"])
			yaw -= 3 * dt;
		if(keystates["ArrowRight"])
			yaw += 3 * dt;
		if(keystates["ArrowUp"])
			pitch -= 3 * dt;
		if(keystates["ArrowDown"])
			pitch += 3 * dt;
		

		
		
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		//gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);

		gl.useProgram(program);

		// Compute the projection matrix
		var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
		var zNear = 20;
		var zFar = 10000;
		var projectionMatrix = m4.perspective(3.14/2*0.8, aspect, zNear, zFar);

		// Compute a matrix for the camera
		var cameraMatrix =  m4.translation(posX, posH+40, posY);
		cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2+yaw);
		cameraMatrix = m4.xRotate(cameraMatrix, pitch);
		
		var viewMatrix = m4.inverse(cameraMatrix);
		var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

		 gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);
		 gl.uniform1i(textureLocation, 0);

		 for(var i = 0; i < submeshes.length; ++i) {
			 if(submeshes[i].tex)
				gl.bindTexture(gl.TEXTURE_2D, submeshes[i].tex);
			else
				gl.bindTexture(gl.TEXTURE_2D, textures["error_missing_texture"].handle);
		 
			mesh.draw({coords: positionLocation, colors: colorLocation, texCoords: texcoordLocation}, submeshes[i].start, submeshes[i].len);
		 }
		 //mesh.draw({coords: positionLocation, colors: colorLocation, texCoords: texcoordLocation});
		
		++frameCount;
		requestAnimFrame(renderLoop);
	}
	
});