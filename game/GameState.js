define(["GameConsts", "Vector3", "Matrix4", "Level", "ThingTable", "StaticProp", "Player"], function(g, Vector3, m4, Level, thingTable, StaticProp, Player) {
	function GameState(level) {
		this.level = level;
		
		this.entities = [];
		this.dynamic = [];
		this.players = [];
		this.sectorSolids = {};
		
		this.importThings(level.lumps.THINGS);
	}
	
	GameState.prototype.addEntity = function(ent) {
		this.entities.push(ent);
		
		if(ent.flags & g.F_DYNAMIC)
			this.dynamic.push(ent);
		
		if((ent.flags & g.F_SOLID) && !(ent.flags & g.F_DYNAMIC))
			addSolidEntity(this.level, this.sectorSolids, ent);
		
		if(ent.flags & g.F_PLAYER)
			this.players.push(ent);
	};
	
	GameState.prototype.importThings = function(things) {
		for(var i = 0; i < things.length; ++i) {
			var thingSpawn = things[i];
			var thingEntry = thingTable[thingSpawn.code];
			
			if(thingEntry && (thingEntry.type === "obstacle" || thingEntry.type === "weapon")) {
				var sec = this.level.findSector(thingSpawn);
				var ent = new StaticProp(thingSpawn.code, thingSpawn.x, sec.floorHeight, thingSpawn.y, thingEntry.rad);
				this.addEntity(ent);
			}
		}
	};
	
	GameState.prototype.spawnPlayer = function(x, z) {
		var ang = 0;
		
		if(x === undefined && z === undefined) {
			// Try to find player spawn thing:
			for(var i = 0; i < this.level.thingCount(); ++i) {
				var thingSpawn = this.level.getThing(i);
				if(thingTable[thingSpawn.code] && thingTable[thingSpawn.code].type === "player_coop_spawn") {
					x = thingSpawn.x;
					z = thingSpawn.y;
					ang = (thingSpawn.angle / 180) * Math.PI;
					break;
				}
			}
			
			// Couldn't find one? Get one programmatically:
			if(i === this.level.thingCount()) {
				var sp = this.level.getDefaultSpawnPos();
				x = sp.x;
				z = sp.z;
			}
		}
		
		var sec = this.level.findSector({x: x, y: z});
		var player = new Player(x, sec.height, z);
		player.angles.y = ang;
		
		this.addEntity(player);
		
		return player;
	};
	
	GameState.prototype.nonemptySubsecs = function() {
		var out = {};
		var keys = Object.keys(this.sectorSolids);
		for(var i = 0; i < keys.length; ++i) {
			if(this.sectorSolids[keys[i]].length > 0)
				out[keys[i]] = this.sectorSolids[keys[i]];
		}
		return out;
	};
	
		
	GameState.prototype.handlePlayerCommands = function(player) {
		//for(var i = 0; i < player.commands.length; ++i) {
			//var cmd = player.commands[i];
			
			//if(cmd.type === "shoot") {
				//var cameraMatrix =  m4.translation(player.pos.x, player.pos.y + 40, player.pos.z);
				//cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2 + player.angles.y);
				//cameraMatrix = m4.xRotate(cameraMatrix, player.angles.x);
				//console.log("lel!");
				var cameraMatrix =  m4.translation(0, 0, 0);
				
				
				cameraMatrix = m4.yRotate(cameraMatrix,  Math.PI/2 + player.angles.y);
				cameraMatrix = m4.xRotate(cameraMatrix, player.angles.x);
				var rayDir = m4.vectorMultiply([0, 0, -1, 1], cameraMatrix);
				
				var ray = {
					x: player.pos.x,
					y: player.pos.y + 40,
					z: player.pos.z,
					dirX: rayDir[0], //Math.cos(player.angles.y)*30,
					dirY: rayDir[1],
					dirZ: rayDir[2]
				};
				
				var res = this.level.raycast(ray, function(hit, sectorIdx, hitData) {
					//if(hit)
						//console.log("HIT!");
					return false;
				});
				
				//player.lastHitX = player.pos.x + Math.cos(player.angles.y) * 100;
				//player.lastHitZ = player.pos.z + Math.sin(player.angles.y) * 100;
				
				if(res) {
					player.lastHitX = ray.x + ray.dirX * res.t * 0.95;
					player.lastHitY = ray.y + ray.dirY * res.t * 0.95;
					player.lastHitZ = ray.z + ray.dirZ * res.t * 0.95;
				}else {
					player.lastHitX = 0;
					player.lastHitY = 0;
					player.lastHitZ = 0;
				}
				
				//console.log(!!res);
			//}
		//}
		
		player.commands = [];
	};
	
	GameState.prototype.logic = function(dt) {
		dt = 1/60;
		
		var i;
		var dynamicSectorSolids = {};
		
		for(i = 0; i < this.dynamic.length; ++i) {
			var ent = this.dynamic[i];
			ent.oldPos.copy(ent.pos);
		}
		
		for(i = 0; i < this.players.length; ++i) {
			this.handlePlayerCommands(this.players[i]);
			accelPlayer(this.players[i], dt);
		}
		
		for(i = 0; i < this.dynamic.length; ++i) {
			var ent = this.dynamic[i];
			
			ent.pos.x += ent.vel.x * dt;
			ent.pos.y += ent.vel.y * dt;
			ent.pos.z += ent.vel.z * dt;
			
			var oldInactiveFrames = ent.inactiveFrames;
			var dx = ent.pos.x - ent.oldPos.x;
			var dz = ent.pos.z - ent.oldPos.z;
			
			if(dx*dx + dz*dz < 0.0001)
				++ent.inactiveFrames;
			else
				ent.inactiveFrames = 0;
			
			if(oldInactiveFrames > 10 && !ent.inactiveFrames) {
				removeSolidEntity(this.level, this.sectorSolids, ent);
				//console.log("Started moving!", this.nonemptySubsecs());
			}
			
			if(ent.inactiveFrames === 10) {
				addSolidEntity(this.level, this.sectorSolids, ent);
				//console.log("Stopped moving!", this.nonemptySubsecs());
				//console.log("-------------------------------");
			}
			
			if(ent.inactiveFrames < 10) {
				addSolidEntity(this.level, dynamicSectorSolids, ent);
				//console.log(dynamicSectorSolids);
			}
		}
		
		
		var collisionTests = 0;
		var keys = Object.keys(dynamicSectorSolids);
		for(i = 0; i < keys.length; ++i) {
			var key = keys[i];
			var dynSubsec = dynamicSectorSolids[key];
			
			if(this.sectorSolids[key]) {
				var statSubsec = this.sectorSolids[key];
				for(var j = 0; j < dynSubsec.length; ++j) {
					for(var k = 0; k < statSubsec.length; ++k) {
						++collisionTests;
						if(entVsEnt(dynSubsec[j], statSubsec[k])) {
							entCollisionResponse(dynSubsec[j], statSubsec[k], 1);
						}
					}
				}
			}
		}
		
		//console.log(collisionTests);
		
		for(i = 0; i < this.players.length; ++i)
			playerCollideLevel(this.players[i], this.level);
	};
	
	
	
	
	
	
	
	

	
	
	//function entMotionStarted(ent) {
	//	return ent.vel.xzLenSquare() > 1 && ent.oldVel.xzLenSquare() < 1;
	//}
	
	//function entMotionEnded(ent) {
	//	return ent.vel.xzLenSquare() < 1 && ent.oldVel.xzLenSquare() > 1;
	//}
	
	function addSolidEntity(level, sectorSolids, ent) {
		var subs = level.findCircleSubsectors({x: ent.pos.x, y: ent.pos.z}, ent.rad);
		
		for(var j = 0; j < subs.length; ++j) {
			if(!(subs[j] in sectorSolids))
				sectorSolids[subs[j]] = [];
			sectorSolids[subs[j]].push(ent);
		}
	};
	
	function removeSolidEntity(level, sectorSolids, ent) {
		// Some margin of tolerance is necessary
		// because the entity might have moved a tiny bit since the time it was added to sectorSolids:
		var subs = level.findCircleSubsectors({x: ent.oldPos.x, y: ent.oldPos.z}, ent.rad + 3);
		
		for(var j = 0; j < subs.length; ++j) {
			if(subs[j] in sectorSolids)
				removeFromArray(sectorSolids[subs[j]], ent);
		}
	};
	
	function removeFromArray(arr, item) {
		var i = arr.indexOf(item);
		if(i > -1) {
			arr.splice(i, 1);
		}
		//else
			//throw new Error("Item not found!");
	}
	
	function entIsStatic(ent) {
		return !(ent.flags & g.F_DYNAMIC) || (ent.vel.x === 0 && ent.vel.z === 0);
	}
	
	function clamp(x, min, max) {
		return x < min ? min : (x > max ? max : x);
	}
	
	function angle(a, b) {
		var dot = a.dot(b);
		var det = a.x*b.z - a.z*b.x;
		return Math.atan2(det, dot) 
	}
	
	function accelPlayer2(p, dt) {
		p.vel.x += p.moveDir.x * 1000 * dt;
		p.vel.z += p.moveDir.z * 1000 * dt;
		p.vel.x *= 0.96;
		p.vel.z *= 0.96;
	}
	
	function accelPlayer(p, dt) {
		var grounded = p.grounded;
		var oldMoveDir = p.oldMoveDir;
		var oldLookDir = p.oldLookDir;
		
		var newLookDir = new Vector3(Math.cos(p.angles.y), 0, Math.sin(p.angles.y));
		var a1 = angle(oldLookDir, oldMoveDir);
		var a2 = angle(newLookDir, oldMoveDir);
		var turnAccel = (a1 - a2) * a1;
		
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
		
		
		
		p.vel.x += dv.x;
		p.vel.z += dv.z;
		p.vel.y -= 800 * dt;
	}
		
	function playerCollideLevel(p, level) {
		var playerHeight = 60;

		var grounded = false;
		var res = {};
		
		if(level.vsCircle(p.pos.x, p.pos.z, p.pos.y, playerHeight, p.rad, res) && (p.flags & g.F_SOLID)) {
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
		
		p.grounded = grounded;
	}
	
	
	function entVsEnt(a, b) {
		var dx = b.pos.x - a.pos.x;
		var dz = b.pos.z - a.pos.z;
		var rsum = a.rad + b.rad;
		return dx * dx + dz * dz <= rsum * rsum;
	}

	function entCollisionResponse(a, b, bounciness) {
		var dx = b.pos.x - a.pos.x;
		var dz = b.pos.z - a.pos.z;
		
		var dist = Math.sqrt(dx * dx + dz * dz);
		var mtd = (dist - (a.rad + b.rad));
		var lenVa = (a.flags & g.F_DYNAMIC) ? (Math.sqrt(a.vel.x * a.vel.x + a.vel.z * a.vel.z) * bounciness) : 0;
		var lenVb = (b.flags & g.F_DYNAMIC) ? (Math.sqrt(b.vel.x * b.vel.x + b.vel.z * b.vel.z) * bounciness) : 0;
		var wa = a.flags & g.F_DYNAMIC ? 1 : 0;
		var wb = b.flags & g.F_DYNAMIC ? 1 : 0;
		var k = wa / (wa + wb);
		
		//var wa = !(a.flags & g.F_DYNAMIC) ? 

		if(dist > 0) {
			dx /= dist;
			dz /= dist;
		}else {
			dx = 1;
			dz = 0;
		}

		a.pos.x += dx * mtd * k;
		a.pos.z += dz * mtd * k;
		b.pos.x -= dx * mtd * (1 - k);
		b.pos.z -= dz * mtd * (1 - k);

		if(a.flags & g.F_DYNAMIC) {
			a.vel.x = -dx * lenVb;
			a.vel.z = -dz * lenVb;
		}
		if(b.flags & g.F_DYNAMIC) {
			b.vel.x = dx * lenVa;
			b.vel.z = dz * lenVa;
		}
	}
	

	
	
	return GameState;
});