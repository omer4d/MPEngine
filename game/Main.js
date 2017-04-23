require(["Wad", "Matrix4", "Mesh", "TextureManager", "Level", "LevelMesh", "Input", "GLUtil", "Renderer", "Vector3"], function(Wad, m4, Mesh, TextureManager, Level, LevelMesh, Input, GLUtil, Renderer, Vector3) {
	var GRID_TEXTURES = false;
	//var WAD_NAME = "/zaza2.wad";
	var WAD_NAME = "/data/e1m1.wad";

	window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};
	
	function Player(x, y, z) {
		this.pos = new Vector3(x, y, z);
		this.vel = new Vector3();
		this.angles = new Vector3();
		this.bufferedJumps = 0;
	}
	
	Player.prototype.xzSpeed = function() {
		return Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
	};
	
	function controlPlayer(p, grounded, dt) {
		var turnSpeed = 3;
		var groundAccel = 2150;
		var moveDir = new Vector3();
		var msens = 1/250;
		
		if(Input.keyPressed("ArrowLeft"))
			p.angles.y -= turnSpeed * dt;
		if(Input.keyPressed("ArrowRight"))
			p.angles.y += turnSpeed * dt;
		if(Input.keyPressed("ArrowUp"))
			p.angles.x -= turnSpeed * dt;
		if(Input.keyPressed("ArrowDown"))
			p.angles.x += turnSpeed * dt;
		
		if(Input.keyPressed("w")) {
			moveDir.x += Math.cos(p.angles.y);
			moveDir.z += Math.sin(p.angles.y);
		}
		
		if(Input.keyPressed("s")) {
			moveDir.x += -Math.cos(p.angles.y);
			moveDir.z += -Math.sin(p.angles.y);
		}
		
		if(Input.keyPressed("d")) {
			moveDir.x += -Math.sin(p.angles.y);
			moveDir.z += Math.cos(p.angles.y);
		}
			
		if(Input.keyPressed("a")) {
			moveDir.x += Math.sin(p.angles.y);
			moveDir.z += -Math.cos(p.angles.y);
		}
		
		if(Input.keyJustPressed("Spacebar") || Input.keyJustPressed(" ")) {
			p.bufferedJumps = 1;
		}
		
		if(Input.mouseLocked()) {
			p.angles.y += Input.mouseDeltaX() * msens;
			p.angles.x = Math.max(Math.min(p.angles.x + Input.mouseDeltaY() * msens, Math.PI / 2), -Math.PI / 2);
		}
		
		if(grounded) {
			p.vel.x += moveDir.x * groundAccel * dt;
			p.vel.z += moveDir.z * groundAccel * dt;
		}
	}
	
	function movePlayer(p, level, dt) {
		var playerHeight = 60;
		var sh = level.findSector({x: p.pos.x, y: p.pos.z}).floorHeight;
		var grounded = player.pos.y < sh + 1;
		controlPlayer(p, grounded, dt);
		
		p.vel.y -= 800 * dt;
		p.pos.x += p.vel.x * dt;
		p.pos.y += p.vel.y * dt;
		p.pos.z += p.vel.z * dt;
		
		grounded = false;
		
		var res = {};
		var psec = level.findSector({x: p.pos.x, y: p.pos.z});
		
		if(p.pos.y < psec.floorHeight) {
			p.pos.y = psec.floorHeight;
			p.vel.y = 0;
			
			if(p.bufferedJumps > 0) {
				p.vel.y += 17000 * dt;
				--p.bufferedJumps;
			}
			
			grounded = true;
		}
		
		if(p.pos.y + playerHeight > psec.ceilHeight) {
			p.pos.y = psec.ceilHeight - playerHeight;
			p.vel.y = 0;
		}
		
		if(level.vsCircle(p.pos.x, p.pos.z, p.pos.y, playerHeight, 25, res) && !Input.keyPressed("q")) {
			p.pos.x += res.mtx;
			p.pos.z += res.mty;
		}
		
		if(grounded) {
			p.vel.x *= 0.9;
			p.vel.z *= 0.9;
		}
	}
	
	
	
	
	var frameCount = 0;
	var fpsCounter = document.getElementById("fpsCounter");
	setInterval(function() {
		fpsCounter.textContent = "FPS: " + frameCount;
		frameCount = 0;
	}, 1000);


	var canvas = document.getElementById("myCanvas");
	var gl = canvas.getContext("webgl", {antialias: true, depth: true });

	var oReq = new XMLHttpRequest();
	oReq.open("GET", WAD_NAME, true);
	oReq.responseType = "arraybuffer";

	var level;
	var textureManager = new TextureManager(gl);
	var levelMesh;
	var renderer;
	var player = new Player(1032, 0, -3200);
	
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
		
		movePlayer(player, level, dt);
		
		document.getElementById("speedCounter").textContent = "Speed: " + Math.floor(player.xzSpeed());
		
		var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight * (1.2);
		var zNear = 5;
		var zFar = 10000;
		var projectionMatrix = m4.perspective(3.14/2*0.8, aspect, zNear, zFar);

		var cameraMatrix =  m4.translation(player.pos.x, player.pos.y + 40, player.pos.z);
		cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2 + player.angles.y);
		cameraMatrix = m4.xRotate(cameraMatrix, player.angles.x);
		
		renderer.draw(projectionMatrix, cameraMatrix);
		
		++frameCount;
		requestAnimFrame(renderLoop);
	}
	
});