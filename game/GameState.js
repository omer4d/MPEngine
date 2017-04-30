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
				var ent = new StaticProp(thingSpawn.code, thingSpawn.x, thingSpawn.y, sec.floorHeight, thingEntry.rad);
				this.addEntity(ent);
			}
		}
	};
	
	GameState.prototype.spawnPlayer = function(x, y) {
		var ang = 0;
		
		if(x === undefined && y === undefined) {
			// Try to find player spawn thing:
			for(var i = 0; i < this.level.thingCount(); ++i) {
				var thingSpawn = this.level.getThing(i);
				if(thingTable[thingSpawn.code] && thingTable[thingSpawn.code].type === "player_coop_spawn") {
					x = thingSpawn.x;
					y = thingSpawn.y;
					ang = (thingSpawn.angle / 180) * Math.PI;
					break;
				}
			}
			
			// Couldn't find one? Get one programmatically:
			if(i === this.level.thingCount()) {
				var sp = this.level.getDefaultSpawnPos();
				x = sp.x;
				y = sp.y;
			}
		}
		
		var sec = this.level.findSector({x: x, y: y});
		var player = new Player(x, y, sec.height);
		player.angles.z = ang;
		
		this.addEntity(player);
		
		return player;
	};
	
	GameState.prototype.dumpSectorSolids = function() {
		console.log("Static sector solids:");
		var keys = Object.keys(this.sectorSolids);
		
		for(var i = 0; i < keys.length; ++i) {
			if(this.sectorSolids[keys[i]].length > 0)
				console.log(this.sectorSolids[keys[i]]);
		}
		console.log("--------------------------------------");
	};
	
		
	GameState.prototype.handlePlayerCommands = function(player) {
		//for(var i = 0; i < player.commands.length; ++i) {
			//var cmd = player.commands[i];
			
			//if(cmd.type === "shoot") {
				var cameraMatrix =  m4.translation(0, 0, 0);
				cameraMatrix = m4.yRotate(cameraMatrix,  Math.PI/2 + player.angles.z);
				cameraMatrix = m4.xRotate(cameraMatrix, player.angles.x);
				var rayDir = m4.vectorMultiply([0, 0, -1, 1], cameraMatrix);

				
				
				
				//var rayDir = [Math.cos(player.angles.z), Math.sin(player.angles.z), 0];
				
				var ray = {
					x: player.pos.x,
					y: player.pos.y,
					z: player.pos.z + 40,
					dirX: rayDir[0], //Math.cos(player.angles.y)*30,
					dirY: rayDir[2],
					dirZ: rayDir[1]
				};
				
				var res = this.level.raycast(ray, function(hit, sectorIdx, hitData) {
					//if(hit)
						//console.log("HIT!");
					return false;
				});
				
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
			var dy = ent.pos.y - ent.oldPos.y;
			
			if(dx*dx + dy*dy < 0.0001)
				++ent.inactiveFrames;
			else
				ent.inactiveFrames = 0;
			
			if(oldInactiveFrames > 10 && !ent.inactiveFrames) {
				removeSolidEntity(this.level, this.sectorSolids, ent);
				//console.log("Started moving!");
				//this.dumpSectorSolids();
			}
			
			if(ent.inactiveFrames === 10) {
				addSolidEntity(this.level, this.sectorSolids, ent);
				//console.log("Stopped moving!");
				//this.dumpSectorSolids();
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
							console.log("colliding with static entity!", statSubsec[k]);
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
		var subs = level.findCircleSubsectors(ent.pos, ent.rad);
		
		for(var j = 0; j < subs.length; ++j) {
			if(!(subs[j] in sectorSolids))
				sectorSolids[subs[j]] = [];
			sectorSolids[subs[j]].push(ent);
		}
	};
	
	function removeSolidEntity(level, sectorSolids, ent) {
		// Some margin of tolerance is necessary
		// because the entity might have moved a tiny bit since the time it was added to sectorSolids:
		var subs = level.findCircleSubsectors(ent.pos, ent.rad + 3);
		
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
		return !(ent.flags & g.F_DYNAMIC) || (ent.vel.x === 0 && ent.vel.y === 0);
	}
	
	function clamp(x, min, max) {
		return x < min ? min : (x > max ? max : x);
	}
	
	function angle(a, b) {
		var dot = a.dot(b);
		var det = a.x*b.y - a.y*b.x;
		return Math.atan2(det, dot) 
	}

	function accelPlayer2(p, dt) {
		p.vel.x += p.moveDir.x * 1000 * dt;
		p.vel.y += p.moveDir.y * 1000 * dt;
		p.vel.x *= 0.96;
		p.vel.y *= 0.96;
	}
	
	function accelPlayer(p, dt) {
		var grounded = p.grounded;
		var oldMoveDir = p.oldMoveDir;
		var oldLookDir = p.oldLookDir;
		
		var newLookDir = new Vector3(Math.cos(p.angles.z), Math.sin(p.angles.z), 0);
		var a1 = angle(oldLookDir, oldMoveDir);
		var a2 = angle(newLookDir, oldMoveDir);
		var turnAccel = (a1 - a2) * a1;
		
		var GROUND_ACCEL = 3000;
		var SPEED_LIMIT = 320;
		var AIR_ACCEL = 1000;
		
		
		var accel = grounded ? GROUND_ACCEL : AIR_ACCEL;
		var dv = new Vector3();
		var vdir = new Vector3(p.vel.x, p.vel.y, 0);
		vdir.normalize();
		
		dv.x = p.moveDir.x * accel * dt;
		dv.y = p.moveDir.y * accel * dt;
		
		
		
		var dvp = dv.dot(vdir);
		
		var lim = SPEED_LIMIT + SPEED_LIMIT * turnAccel * (grounded ? 2.5 : 2);
		
		if(dvp > 0 && dvp + p.vel.length() > lim) {
			dv.x -= dvp * vdir.x;
			dv.y -= dvp * vdir.y;
			
			var corr = lim - (dvp + p.vel.length());
			dvp = Math.max(0, dvp + corr);
			
			dv.x += dvp * vdir.x;
			dv.y += dvp * vdir.y;
		}
		
		
		if(grounded) {
			if(p.bufferedJumps > 0) {
				p.vel.z += 15000 * dt;
				--p.bufferedJumps;
			}else {
				if(p.moveDir.length() < 0.1) {
					p.vel.x *= 0.9;
					p.vel.y *= 0.9;
				}
				
				if(Math.sqrt(p.vel.x*p.vel.x + p.vel.y*p.vel.y) > SPEED_LIMIT / 0.98) {
					p.vel.x *= 0.98;
					p.vel.y *= 0.98;
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
		p.vel.y += dv.y;
		p.vel.z -= 800 * dt;
	}
		
	function playerCollideLevel(p, level) {
		var playerHeight = 60;

		var grounded = false;
		var res = {};
		
		level.findHeight(p.oldPos.x, p.oldPos.y, p.oldPos.z, playerHeight, p.rad, res);
		
		if(p.pos.z + 60 > res.ceilHeight) {
			p.pos.z = res.ceilHeight - 60;
			p.vel.z = 0;
		}
		
		if(level.vsCircle(p, playerHeight, p.rad, res) && (p.flags & g.F_SOLID)) {
			p.pos.x += res.mtx;
			p.pos.y += res.mty;
			var vnp = p.vel.x * res.nx + p.vel.y * res.ny;
			p.vel.x -= vnp * res.nx;
			p.vel.y -= vnp * res.ny;
		}
		
		if(p.pos.z < res.floorHeight) {
			//if(p.vel.y <= 0)
				p.pos.z += (res.floorHeight - p.pos.z) * 0.2;
			
			//else
				//p.pos.y = res.floorHeight;
			
			if(p.vel.z < 0)
				p.vel.z = 0;
			
			grounded = true;
		}
		
		if(p.pos.z + playerHeight > res.ceilHeight) {
			p.pos.z = res.ceilHeight - playerHeight;
			p.vel.z = 0;
		}
		
		p.grounded = grounded;
	}
	
	
	function entVsEnt(a, b) {
		var dx = b.pos.x - a.pos.x;
		var dy = b.pos.y - a.pos.y;
		var rsum = a.rad + b.rad;
		return dx * dx + dy * dy <= rsum * rsum;
	}

	function entCollisionResponse(a, b, bounciness) {
		var dx = b.pos.x - a.pos.x;
		var dy = b.pos.y - a.pos.y;
		
		var dist = Math.sqrt(dx * dx + dy * dy);
		var mtd = (dist - (a.rad + b.rad));
		var lenVa = (a.flags & g.F_DYNAMIC) ? (Math.sqrt(a.vel.x * a.vel.x + a.vel.y * a.vel.y) * bounciness) : 0;
		var lenVb = (b.flags & g.F_DYNAMIC) ? (Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y) * bounciness) : 0;
		var wa = a.flags & g.F_DYNAMIC ? 1 : 0;
		var wb = b.flags & g.F_DYNAMIC ? 1 : 0;
		var k = wa / (wa + wb);
		
		//var wa = !(a.flags & g.F_DYNAMIC) ? 

		if(dist > 0) {
			dx /= dist;
			dy /= dist;
		}else {
			dx = 1;
			dy = 0;
		}

		a.pos.x += dx * mtd * k;
		a.pos.y += dy * mtd * k;
		b.pos.x -= dx * mtd * (1 - k);
		b.pos.y -= dy * mtd * (1 - k);

		if(a.flags & g.F_DYNAMIC) {
			a.vel.x = -dx * lenVb;
			a.vel.y = -dy * lenVb;
		}
		if(b.flags & g.F_DYNAMIC) {
			b.vel.x = dx * lenVa;
			b.vel.y = dy * lenVa;
		}
	}
	

	
	
	return GameState;
});