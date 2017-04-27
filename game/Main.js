require(["GameConsts", "Wad", "Matrix4", "Mesh", "Level", "LevelMesh", "Input", "GLUtil", "Renderer", "Vector3", "ResourceManager", "DynamicMesh", "Loaders", "ThingTable", "GameState"], function(g, Wad, m4, Mesh, Level, LevelMesh, Input, GLUtil, Renderer, Vector3, ResourceManager, DynamicMesh, Loaders, thingTable, GameState) {
	var GRID_TEXTURES = false;
	//var WAD_NAME = "/zaza2.wad";
	var WAD_NAME = "/data/e1m1.wad";

	window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};
	
	function controlPlayer(p, dt) {
		var turnSpeed = 2;
		var moveDir = new Vector3();
		var msens = 1/250;
		
		p.oldMoveDir.copy(p.moveDir);
		p.oldLookDir.set(Math.cos(p.angles.y), 0, Math.sin(p.angles.y));
		
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
		
		if(Input.keyPressed("q"))
			p.flags &= ~(g.F_SOLID);
		else
			p.flags |= g.F_SOLID;
		
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
	

	
	
	
	
	var frameCount = 0;
	var fpsCounter = document.getElementById("fpsCounter");
	setInterval(function() {
		fpsCounter.textContent = "FPS: " + frameCount;
		frameCount = 0;
	}, 1000);


	var canvas = document.getElementById("myCanvas");
	var gl = canvas.getContext("webgl", {antialias: true, depth: true });

	//var oReq = new XMLHttpRequest();
	//oReq.open("GET", WAD_NAME, true);
	//oReq.responseType = "arraybuffer";
	//ResourceLoader.registerTextureLoader(gl);
	//ResourceLoader.load(["data/sprites/sprites0.png"], function(res) {
	//	console.log(res);
	//});
	
	var level;
	var player;
	
	//var resMan = new TextureManager(gl);
	
	var resMan = new ResourceManager();
	Loaders.register(resMan, gl);
	
	var levelMesh;
	var renderer;
	
	//var player = new Player(1032, 0, -3200);
	//var player = new Player(1900, 0, 900);
	//var player = new Player(1700, 0, 1600);
	
	var gameState;
	
	
	var things = [];
	
	function findThingByCode(code) {
		//for(var i = 0; i < thingTable.length; ++i)
			//if(thingTable[i].code === code)
				//return thingTable[i];
			
			
		return thingTable[code];
	}
	
	resMan.begin();
	resMan.add("debug_grid", "data/grid.png");
	resMan.add("atlas", "data/sprites/sprites.atlas");
	resMan.add("%ss%", "data/sprites/sprites0.png");
	resMan.add("%current_level%", WAD_NAME);
	resMan.end(function() {
		console.log(resMan);
		//console.log(resMan.get("atlas"));
		//console.log();
		level = resMan.get("%current_level%");
		gameState = new GameState(level);
		player = gameState.spawnPlayer(1032, -3200);
		
		levelMesh = new LevelMesh(gl, level, resMan);
		renderer = new Renderer(gl, levelMesh);
		var atlas = resMan.get("atlas");
		
		console.log(resMan.dict);
		
		for(var i = 0; i < level.lumps.THINGS.length; ++i) {
			var thingSpawn = level.lumps.THINGS[i];
			var thing = findThingByCode(thingSpawn.code);
			var spn = thing ? (thing.sprite + thing.idleSeq[0] + "0").toLowerCase() : "";
			var reg = thing ? atlas.get(spn) : null;
			
			console.log(spn);
			
			if(reg) {
				var sec = level.findSector(thingSpawn);
				var floorHeight = sec.floorHeight;
				var ceilHeight = sec.ceilHeight;
				
				things.push({
					reg: reg,
					x: thingSpawn.x,
					y: floorHeight,
					z: thingSpawn.y,
					light: sec.light,
				});
			}
		}
		
		
		renderLoop();
	});
	
	var lastRenderTime = performance.now();
	Input.setMouseLockable(canvas);
	
	var firstTime = true;
	
	function renderLoop() {
		Input.refresh();
		
		var t = performance.now();
		var dt = (t - lastRenderTime)/1000;
		lastRenderTime = t;
		
		controlPlayer(player, dt);
		gameState.logic(dt);
		//movePlayer(player, level, dt);
		
		document.getElementById("speedCounter").textContent = "Speed: " + Math.floor(player.xzSpeed());
		//" --- Pos: " + Math.floor(player.pos.x) + ", " + Math.floor(player.pos.z);
		
		var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight * (1.2);
		var zNear = 5;
		var zFar = 10000;
		var projectionMatrix = m4.perspective(3.14/2*0.8, aspect, zNear, zFar);

		var cameraMatrix =  m4.translation(player.pos.x, player.pos.y + 40, player.pos.z);
		cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2 + player.angles.y);
		cameraMatrix = m4.xRotate(cameraMatrix, player.angles.x);
		
		var atlas = resMan.get("atlas");
		var reg = atlas.get("bossg1");
		
		renderer.draw(projectionMatrix, cameraMatrix);
		
		
		//renderer.pushSprite(atlas.get("bossg1"), 1032, 0, -3200);
		
		var nx = -Math.sin(player.angles.y);
		var ny = Math.cos(player.angles.y);
		
		renderer.beginSprites();
		for(var i = 0; i < things.length; ++i) {
			
			renderer.pushSprite2(things[i].reg, things[i].x, things[i].y, things[i].z, nx, ny, things[i].light);
			
		}
		renderer.endSprites();
		
		firstTime = false;
		
		//for(var i = 0; i < 100; ++i) {
			//renderer.pushSprite(reg.textureHandle, 1032, 0, -3200, reg.w, reg.h);
		//}
		
		
		++frameCount;
		requestAnimFrame(renderLoop);
	}
	
});