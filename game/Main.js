require(["Wad", "Matrix4", "Mesh", "TextureManager", "Level", "LevelMesh", "Input", "GLUtil", "Renderer"], function(Wad, m4, Mesh, TextureManager, Level, LevelMesh, Input, GLUtil, Renderer) {
	
	
	var GRID_TEXTURES = false;
	//var WAD_NAME = "/zaza2.wad";
	var WAD_NAME = "/data/e1m1.wad";



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
	var textureManager = new TextureManager(gl);
	var levelMesh;
	var renderer;
	
	
	



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
			renderer = new Renderer(gl, levelMesh);
			renderLoop();
		});
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
		

		var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight * (1.2);
		var zNear = 20;
		var zFar = 10000;
		var projectionMatrix = m4.perspective(3.14/2*0.8, aspect, zNear, zFar);

		var cameraMatrix =  m4.translation(posX, posH+40, posY);
		cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2+yaw);
		cameraMatrix = m4.xRotate(cameraMatrix, pitch);
		
		renderer.draw(projectionMatrix, cameraMatrix);
		
		++frameCount;
		requestAnimFrame(renderLoop);
	}
	
});