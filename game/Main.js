require(["Wad", "Matrix4", "Mesh", "Level", "LevelMesh", "Input", "GLUtil", "Renderer", "Vector3", "ResourceManager", "DynamicMesh"], function(Wad, m4, Mesh, Level, LevelMesh, Input, GLUtil, Renderer, Vector3, ResourceManager, DynamicMesh) {
	var GRID_TEXTURES = false;
	//var WAD_NAME = "/zaza2.wad";
	var WAD_NAME = "/data/e1m1.wad";

	window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};
	
	function Player(x, y, z) {
		this.pos = new Vector3(x, y, z);
		this.vel = new Vector3();
		this.angles = new Vector3();
		this.moveDir = new Vector3();
		this.bufferedJumps = 0;
	}
	
	Player.prototype.xzSpeed = function() {
		return Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
	};
	
	function clamp(x, min, max) {
		return x < min ? min : (x > max ? max : x);
	}
	
	function angle(a, b) {
		var dot = a.dot(b);
		var det = a.x*b.z - a.z*b.x;
		return Math.atan2(det, dot) 
	}
	
	function controlPlayer(p, dt) {
		var turnSpeed = 2;
		var moveDir = new Vector3();
		var msens = 1/250;
		
		p.moveDir.x = 0;
		p.moveDir.y = 0;
		p.moveDir.z = 0;
		
		if(Input.keyPressed("ArrowLeft"))
			p.angles.y -= turnSpeed * dt;
		if(Input.keyPressed("ArrowRight"))
			p.angles.y += turnSpeed * dt;
		if(Input.keyPressed("ArrowUp"))
			p.angles.x -= turnSpeed * dt;
		if(Input.keyPressed("ArrowDown"))
			p.angles.x += turnSpeed * dt;
		
		if(Input.keyPressed("w")) {
			p.moveDir.x += Math.cos(p.angles.y);
			p.moveDir.z += Math.sin(p.angles.y);
		}
		
		if(Input.keyPressed("s")) {
			p.moveDir.x += -Math.cos(p.angles.y);
			p.moveDir.z += -Math.sin(p.angles.y);
		}
		
		if(Input.keyPressed("d")) {
			p.moveDir.x += -Math.sin(p.angles.y);
			p.moveDir.z += Math.cos(p.angles.y);
		}
			
		if(Input.keyPressed("a")) {
			p.moveDir.x += Math.sin(p.angles.y);
			p.moveDir.z += -Math.cos(p.angles.y);
		}
		
		if(Input.keyJustPressed("Spacebar") || Input.keyJustPressed(" ")) {
			p.bufferedJumps = 1;
		}
		
		if(Input.mouseLocked()) {
			p.angles.y += Input.mouseDeltaX() * msens;
			p.angles.x = Math.max(Math.min(p.angles.x + Input.mouseDeltaY() * msens, Math.PI / 2), -Math.PI / 2);
		}
		
		//var accel = grounded ? groundAccel : airAccel;
		
		/*
		moveDir.normalize();
		
		var vp = p.vel.x * moveDir.x + p.vel.z * moveDir.z;
		if(vp + accel * dt > 320)
			accel = (320 - vp) / dt;
		p.vel.x += moveDir.x * accel * dt;
		p.vel.z += moveDir.z * accel * dt;*/
		
		
		/*
		var speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
		moveDir.x *= accel * dt;
		moveDir.z *= accel * dt;
		if(speed > 0) {
			var vdirX = p.vel.x / speed;
			var vdirZ = p.vel.z / speed;
			var dat = Math.max(speed + vdirX*moveDir.x + vdirZ*moveDir.z - 320, 0);
			moveDir.x -= vdirX * dat;
			moveDir.z -= vdirZ * dat;
		}
		
		p.vel.x += moveDir.x;
		p.vel.z += moveDir.z;*/
	}
	
	function movePlayer(p, level, dt) {
		var playerHeight = 60;
		var sh = level.findSector({x: p.pos.x, y: p.pos.z}).floorHeight;
		
		var oldMoveDir = p.moveDir.clone();
		var oldLookDir = new Vector3(Math.cos(p.angles.y), 0, Math.sin(p.angles.y));

		controlPlayer(p, dt);
		
		
		
		
		var newLookDir = new Vector3(Math.cos(p.angles.y), 0, Math.sin(p.angles.y));
		var a1 = angle(oldLookDir, oldMoveDir);
		var a2 = angle(newLookDir, oldMoveDir);
		var turnAccel = (a1 - a2) * a1;
		var grounded = player.pos.y < sh + 1;
		
		var GROUND_ACCEL = 3000;
		var AIR_ACCEL = 1000;
		var accel = grounded ? GROUND_ACCEL : AIR_ACCEL;
		var dv = new Vector3();
		var vdir = new Vector3(p.vel.x, 0, p.vel.z);
		vdir.normalize();
		
		dv.x = p.moveDir.x * accel * dt;
		dv.z = p.moveDir.z * accel * dt;
		
		
		
		var dvp = dv.dot(vdir);
		
		var lim = 320 + 320 * turnAccel * (grounded ? 2.5 : 2);
		
		if(dvp > 0 && dvp + p.vel.length() > lim) {
			dv.x -= dvp * vdir.x;
			dv.z -= dvp * vdir.z;
			
			var corr = lim - (dvp + p.vel.length());
			dvp = Math.max(0, dvp + corr);
			
			dv.x += dvp * vdir.x;
			dv.z += dvp * vdir.z;
		}
		
		p.vel.x += dv.x;
		p.vel.z += dv.z;
		p.vel.y -= 800 * dt;
		
		
		
		
		
		
		
		
		
		
		
		//var groundAccel = 2150*10;
		//var airAccel = 300;
		
		p.pos.x += p.vel.x * dt;
		p.pos.y += p.vel.y * dt;
		p.pos.z += p.vel.z * dt;
		
		var grounded = false;
		var res = {};
		
		if(level.vsCircle(p.pos.x, p.pos.z, p.pos.y, playerHeight, 25, res) && !Input.keyPressed("q")) {
			p.pos.x += res.mtx;
			p.pos.z += res.mtz;
			var vnp = p.vel.x * res.nx + p.vel.z * res.nz;
			p.vel.x -= vnp * res.nx;
			p.vel.z -= vnp * res.nz;
		}
		
		if(p.pos.y < res.floorHeight) {
			p.pos.y = res.floorHeight;
			p.vel.y = 0;
			grounded = true;
		}
		
		if(p.pos.y + playerHeight > res.ceilHeight) {
			p.pos.y = res.ceilHeight - playerHeight;
			p.vel.y = 0;
		}
		

		

	
		
		if(grounded) {
			if(p.bufferedJumps > 0) {
				p.vel.y += 15000 * dt;
				--p.bufferedJumps;
			}else {
				if(p.moveDir.length() < 0.1) {
					p.vel.x *= 0.9;
					p.vel.z *= 0.9;
				}
				
				if(Math.sqrt(p.vel.x*p.vel.x + p.vel.z*p.vel.z) > 320/0.98) {
					p.vel.x *= 0.98;
					p.vel.z *= 0.98;
				}
				
				//p.vel.x *= 0.95;
				//p.vel.z *= 0.95;
				/*
				var speed = Math.sqrt(p.vel.x*p.vel.x + p.vel.z*p.vel.z);
				if(speed > 0) {
					var drop = speed * 4 * dt;
					var k = Math.max(speed - drop, 0) / speed;
					
					p.vel.x *= k;
					p.vel.z *= k;
				}*/
			}
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

	//ResourceLoader.registerTextureLoader(gl);
	//ResourceLoader.load(["data/sprites/sprites0.png"], function(res) {
	//	console.log(res);
	//});
	
	var level;
	//var resMan = new TextureManager(gl);
	var resMan = new ResourceManager();
	resMan.registerTextureLoader(gl);
	var levelMesh;
	var renderer;
	
	var player = new Player(1032, 0, -3200);
	//var player = new Player(1900, 0, 900);
	//var player = new Player(-400, 0, 300);
	
	oReq.onload = function (oEvent) {
	  var arrayBuffer = oReq.response;
	  if (arrayBuffer) {
		level = new Level(Wad.read(arrayBuffer));
		console.log(level.lumps);
		
		var texList = level.genTextureNameList();
		resMan.begin();
		for(var i = 0; i < texList.length; ++i)
			resMan.add(texList[i], "data/textures/" + texList[i] + ".png");
		
		resMan.add("debug_grid", "data/grid.png");
		
		resMan.end(function() {
			levelMesh = new LevelMesh(gl, level, resMan);
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
		//" --- Pos: " + Math.floor(player.pos.x) + ", " + Math.floor(player.pos.z);
		
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