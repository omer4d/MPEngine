require(["Wad", "Matrix4", "Mesh", "TextureManager", "Level", "LevelMesh", "Input"], function(Wad, m4, Mesh, TextureManager, Level, LevelMesh, Input) {
	console.log(window.location.pathname);
	
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

	var simpleFragmentShaderSource = `
	precision mediump float;

	varying vec4 v_color;
	varying vec2 v_texcoord;

	uniform sampler2D u_texture;

	void main() {
		gl_FragColor =  texture2D(u_texture, v_texcoord) * v_color;
	}
	`;

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


















	window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};



	
	
	
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






	var oReq = new XMLHttpRequest();
	oReq.open("GET", WAD_NAME, true);
	oReq.responseType = "arraybuffer";

	var level;
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	var textureManager = new TextureManager(gl);
	var levelMesh;
	
	
	



	oReq.onload = function (oEvent) {
	  var arrayBuffer = oReq.response;
	  if (arrayBuffer) {
		level = new Level(Wad.read(arrayBuffer));
		
		
		console.log(level.lumps);
		
		var texList = level.genTextureNameList();
		textureManager.begin();
		for(var i = 0; i < texList.length; ++i)
			textureManager.add(texList[i], "data/textures/" + texList[i] + ".png");
		
		textureManager.end(function() {
			levelMesh = new LevelMesh(gl, level, textureManager);
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

	var lastRenderTime = performance.now();
	Input.setMouseLockable(canvas);
	
	function renderLoop() {
		Input.refresh();
		
		var t = performance.now();
		var dt = (t - lastRenderTime)/1000;
		lastRenderTime = t;
		var moveSpeed = 0;
		var newPosX, newPosY;
		
		moveSpeed = Input.keyPressed("p") ? 5 : 32;
		
		if(Input.keyPressed("w")) {
			velX += moveSpeed * Math.cos(yaw);
			velY += moveSpeed * Math.sin(yaw);
		}
		
		if(Input.keyPressed("s")) {
			velX += -moveSpeed * Math.cos(yaw);
			velY += -moveSpeed * Math.sin(yaw);
		}
		
		if(Input.keyPressed("d")) {
			velX += -moveSpeed * Math.sin(yaw);
			velY += moveSpeed * Math.cos(yaw);
		}
			
		if(Input.keyPressed("a")) {
			velX += moveSpeed * Math.sin(yaw);
			velY += -moveSpeed * Math.cos(yaw);
		}
		
		if(Input.mouseLocked()) {
			yaw += Input.mouseDeltaX() / 250;
			pitch = Math.max(Math.min(pitch + Input.mouseDeltaY() / 250, Math.PI / 2), -Math.PI / 2);
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
		var posH = level.findSector({x: posX, y: posY}).floorHeight;
		
		posX = newPosX;
		posY = newPosY;
		
		var res = {};
		if(level.vsCircle(posX, posY, posH, 25, res) && !Input.keyPressed("q")) {
			posX += res.mtx;
			posY += res.mty;
		}
		
		
		/*
		var oldSec = level.findSector({x: posX, y: posY});
		var newSec = level.findSector({x: newPosX, y: newPosY});
		
		var h1 = oldSec.floorHeight;
		
		if((!leavingSector(lumps, {x: posX, y: posY}, {x: newPosX, y: newPosY}) &&
			newSec.floorHeight - h1 < 30 && newSec.ceilHeight > h1 + 60) || Input.keyPressed("q")) {
			posX = newPosX;
			posY = newPosY;
		}*/
		
		velX *= 0.9;
		velY *= 0.9;
		
		if(Input.keyPressed("ArrowLeft"))
			yaw -= 3 * dt;
		if(Input.keyPressed("ArrowRight"))
			yaw += 3 * dt;
		if(Input.keyPressed("ArrowUp"))
			pitch -= 3 * dt;
		if(Input.keyPressed("ArrowDown"))
			pitch += 3 * dt;
		

		
		
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		//gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);

		gl.useProgram(program);

		// Compute the projection matrix
		var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight * (1.2);
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
		levelMesh.draw({coords: positionLocation, colors: colorLocation, texCoords: texcoordLocation});
		
		++frameCount;
		requestAnimFrame(renderLoop);
	}
	
});