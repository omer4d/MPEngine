define(["GameConsts", "Geom", "Vector3", "Matrix4", "Level", "ThingTable", "StaticProp", "Player"], function(g, Geom, Vector3, m4, Level, thingTable, StaticProp, Player) {
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

	function rayVsCylinder(ray, x, y, z, r, h, res) {
		var circle = new Geom.Circle(x, y, r);

		if(ray.x === 0 && ray.y === 0 && ray.z !== 0) {
			return false;
		}else if(Geom.rayVsCircle(ray, circle, res)) {
			var z1 = ray.z + ray.dirZ * res.tmin;
			var z2 = ray.z + ray.dirZ * res.tmax;

			if(z1 < z && z2 < z || z1 > z + h && z2 > z + h)
				return false;
			else {
				if(z1 < z)
					res.tmin = (z - ray.z) / ray.dirZ;
				else if(z1 > z + h)
					res.tmin = (z + h - ray.z) / ray.dirZ;
				if(z2 < z)
					res.tmax = (z - ray.z) / ray.dirZ;
				else if(z2 > z + h)
					res.tmax = (z + h - ray.z) / ray.dirZ;

				return res.tmin > 0 || res.tmax > 0;
			}
		}

		return false;
	}

	GameState.prototype.handlePlayerCommands = function(player) {
		//for(var i = 0; i < player.commands.length; ++i) {
			//var cmd = player.commands[i];
			var self = this;

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

				var res = this.level.raycast(ray, function(ray, subIdx, hitData) {
					var solids = self.sectorSolids[subIdx];
					var t = hitData.t, f = false;

					if(solids) {
						var tmp = {};

						for(var i = 0; i < solids.length; ++i) {


							/*
							var circle = new Geom.Circle(solids[i].pos.x, solids[i].pos.y, solids[i].rad);

							if(Geom.rayVsCircle(ray, circle, tmp) && tmp.tmin >= 0 && tmp.tmin < t) {
								var z1 = ray.z + ray.dirZ * tmp.tmin;
								var z2 = ray.z + ray.dirZ * tmp.tmax;

								if(isBetween(z1, solids[i].pos.z, solids[i].pos.z + 40) || isBetween(z2, solids[i].pos.z, solids[i].pos.z + 40)) {
									f = true;
									t = tmp.tmin;
								}
							}*/

							if(rayVsCylinder(ray, solids[i].pos.x, solids[i].pos.y, solids[i].pos.z,
											solids[i].rad, 20, tmp)) {
								f = true;
								t = tmp.tmin > 0 ? tmp.tmin : tmp.tmax;
							}






							//console.log(subIdx, tmp.t, hitData.t);
						}
					}
					hitData.t = t;

					return f;
				});

				//console.log("------------------------");

				if(res) {
					player.lastHitX = ray.x + ray.dirX * res.t;// * 0.95;
					player.lastHitY = ray.y + ray.dirY * res.t;// * 0.95;
					player.lastHitZ = ray.z + ray.dirZ * res.t;// * 0.95;
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
			this.players[i].grounded = false;
		}

		for(i = 0; i < this.dynamic.length; ++i) {
			var ent = this.dynamic[i];

			ent.pos.x += ent.vel.x * dt;
			ent.pos.y += ent.vel.y * dt;
			ent.pos.z += ent.vel.z * dt;

			var oldInactiveFrames = ent.inactiveFrames;
			var dx = ent.pos.x - ent.oldPos.x;
			var dy = ent.pos.y - ent.oldPos.y;
			var dz = ent.pos.z - ent.oldPos.z;

			if(dx*dx + dy*dy + dz*dz < 0.0001)
				++ent.inactiveFrames;
			else
				ent.inactiveFrames = 0;

			if(oldInactiveFrames >= 10 && !ent.inactiveFrames) {
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
		var coll = {};

		for(i = 0; i < keys.length; ++i) {
			var key = keys[i];
			var dynSubsec = dynamicSectorSolids[key];

			if(this.sectorSolids[key]) {
				var statSubsec = this.sectorSolids[key];
				for(var j = 0; j < dynSubsec.length; ++j) {
					for(var k = 0; k < statSubsec.length; ++k) {
						++collisionTests;
						if(entVsEnt(dynSubsec[j], statSubsec[k], coll)) {
							collisionResponse(dynSubsec[j], statSubsec[k], 1, coll);
							dynSubsec[j].inactiveFrames = 0;
							if(dynSubsec[j].flags & g.F_PLAYER) {
								dynSubsec[j].grounded = true;
							}
							//console.log("colliding with static entity!", statSubsec[k]);
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

		p.grounded = p.grounded || grounded;
	}

	function isBetween(x, min, max) {
		return x >= min && x <= max;
	}

	function intervalsOverlap(min1, max1, min2, max2) {
		return !(min1 > max2 || min2 > max1);
	}

	function separateIntervals(min1, max1, min2, max2) {
		var d1 = max2 - min1;
		var d2 = min2 - max1;
		return Math.abs(d1) < Math.abs(d2) ? d1 : d2;
	}

	function entVsEnt(a, b, coll) { // mtv pushes A out of B
		var h1 = 20, h2 = 20;
		var dx = b.pos.x - a.pos.x;
		var dy = b.pos.y - a.pos.y;
		var rsum = a.rad + b.rad;

		if(dx * dx + dy * dy <= rsum * rsum && intervalsOverlap(a.pos.z, a.pos.z + h1, b.pos.z, b.pos.z + h2)) {
			var dist = Math.sqrt(dx * dx + dy * dy);
			var mtdXY = dist - (a.rad + b.rad);
			var mtdZ = separateIntervals(a.pos.z, a.pos.z + h1, b.pos.z, b.pos.z + h2);

			if(Math.abs(mtdXY) < Math.abs(mtdZ)) {
				if(dist === 0) {
					dx = dist;
					dy = 0;
				}

				coll.mtd = mtdXY;
				coll.nx = dx / dist;
				coll.ny = dy / dist;
				coll.nz = 0;
			}else {
				coll.mtd = mtdZ;
				coll.nx = 0;
				coll.ny = 0;
				coll.nz = 1;
			}

			return true;
		}else
			return false;
	}

	function collisionResponse(a, b, bounciness, coll) {
		var lenVa = (a.flags & g.F_DYNAMIC) ? (a.vel.length() * bounciness) : 0;
		var lenVb = (b.flags & g.F_DYNAMIC) ? (b.vel.length() * bounciness) : 0;
		var wa = a.flags & g.F_DYNAMIC ? 1 : 0;
		var wb = b.flags & g.F_DYNAMIC ? 1 : 0;
		var k = wa / (wa + wb);

		a.pos.x += coll.nx * coll.mtd * k;
		a.pos.y += coll.ny * coll.mtd * k;
		a.pos.z += coll.nz * coll.mtd * k;
		b.pos.x -= coll.nx * coll.mtd * (1 - k);
		b.pos.y -= coll.ny * coll.mtd * (1 - k);
		b.pos.z -= coll.nz * coll.mtd * (1 - k);

		if(a.flags & g.F_DYNAMIC) {
			if(a.vel.z * coll.nz < 0)
				a.vel.z = 0;
			else {
				a.vel.x = -coll.nx * lenVb;
				a.vel.y = -coll.ny * lenVb;
			}
		}
		if(b.flags & g.F_DYNAMIC) {
			if(b.vel.z * -coll.nz < 0)
				b.vel.z = 0;
			else {
				b.vel.x = coll.nx * lenVa;
				b.vel.y = coll.ny * lenVa;
			}
		}
	}

	return GameState;
});
