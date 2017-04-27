define(["GameConsts", "Vector3", "Level", "ThingTable", "StaticProp", "Player"], function(g, Vector3, Level, thingTable, StaticProp, Player) {
	function GameState(level) {
		this.level = level;
		this.entities = [];
		
		this.players = [];
		this.solidsBySector = {};
		
		this.importThings(level.lumps.THINGS);
	}

	GameState.prototype.importThings = function(things) {
		for(var i = 0; i < things.length; ++i) {
			var thingSpawn = things[i];
			var thingEntry = thingTable[thingSpawn.code];
			
			if(thingEntry) {
				var sec = this.level.findSector(thingSpawn);
				var subs = this.level.findCircleSubsectors(thingSpawn, thingEntry.rad);
				var ent = new StaticProp(thingSpawn.code, thingSpawn.x, sec.floorHeight, thingSpawn.y, thingEntry.rad);
				
				this.entities.push(ent);
				
				if(ent.flags & g.F_SOLID) {
					for(var j = 0; j < subs.length; ++j) {
						if(!(subs[j] in this.solidsBySector))
							this.solidsBySector[subs[j]] = [];
						this.solidsBySector[subs[j]].push(ent);
					}
				}
			}
		}
	}
	
	GameState.prototype.spawnPlayer = function(x, z) {
		var sec = this.level.findSector({x: x, y: z});
		var player = new Player(x, sec.height, z);
		this.entities.push(player);
		this.players.push(player);
		
		return player;
	}
	
	GameState.prototype.logic = function(dt) {
		for(var i = 0; i < this.players.length; ++i)
			movePlayer(this.players[i], this.level, dt);
	}
	
	
	
	
	
	
	
	
	
	function clamp(x, min, max) {
		return x < min ? min : (x > max ? max : x);
	}
	
	function angle(a, b) {
		var dot = a.dot(b);
		var det = a.x*b.z - a.z*b.x;
		return Math.atan2(det, dot) 
	}
	
	function movePlayer(p, level, dt) {
		var playerHeight = 60;
		var sh = level.findSector({x: p.pos.x, y: p.pos.z}).floorHeight;
		
		var oldMoveDir = p.oldMoveDir;
		var oldLookDir = p.oldLookDir;
		
		var newLookDir = new Vector3(Math.cos(p.angles.y), 0, Math.sin(p.angles.y));
		var a1 = angle(oldLookDir, oldMoveDir);
		var a2 = angle(newLookDir, oldMoveDir);
		var turnAccel = (a1 - a2) * a1;
		var grounded = p.pos.y < sh + 1;
		
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
		
		if(level.vsCircle(p.pos.x, p.pos.z, p.pos.y, playerHeight, 25, res) && (p.flags & g.F_SOLID)) {
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
	
	return GameState;
});