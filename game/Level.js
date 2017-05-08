define(["Geom"], function(Geom) {
	var INF = 100000000;

	function Level(lumps) {
		this.lumps = lumps;
	}

	Level.prototype.thingCount = function() {
		return this.lumps.THINGS.length;
	};

	Level.prototype.getThing = function(i) {
		return this.lumps.THINGS[i];
	};

	Level.prototype.getDefaultSpawnPos = function() {
		var LEAF_FLAG = 1 << 15;
		var aabb = [0, 0, 0, 0];

		for(var i = 0; i < this.lumps.GL_NODES.length; ++i) {
			var node = this.lumps.GL_NODES[i];

			if(node.leftChildIdx & LEAF_FLAG) {
				aabb = node.leftAABB;
				break;
			}

			else if(node.rightChildIdx & LEAF_FLAG) {
				aabb = node.rightAABB;
				break;
			}
		}

		return {
			x: (aabb[2] + aabb[3]) / 2,
			y: (aabb[0] + aabb[1]) / 2,
		};
	};

	Level.prototype.genTextureNameList = function() {
		var lumps = this.lumps;
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

	Level.prototype.translateGlSeg = function(seg) {
		var lumps = this.lumps;
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
	};

	Level.prototype.findLinedefSector = function(linedef, neg) {
		var idx = neg ? linedef.negSidedefIdx : linedef.posSidedefIdx;
		return idx !== 0xFFFF ? this.lumps.SECTORS[this.lumps.SIDEDEFS[idx].sectorIdx] : null;
	};

	Level.prototype.findSegSector = function(seg) {
		return this.findLinedefSector(this.lumps.LINEDEFS[seg.linedefIdx], seg.side);
	};

	function findSubsectorHelper(lumps, idx, point) {
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
				return findSubsectorHelper(lumps, node.leftChildIdx, point);
			else
				return findSubsectorHelper(lumps, node.rightChildIdx, point);
		}
	};

	Level.prototype.findSubsector = function(point) {
		return findSubsectorHelper(this.lumps, this.lumps.NODES.length - 1, point);
	};

	Level.prototype.findSector = function(point) {
		var lumps = this.lumps;

		var ssector = this.findSubsector(point);
		var seg = lumps.SEGS[ssector.firstSegIdx];
		var linedef = lumps.LINEDEFS[seg.linedefIdx];
		var sidedef = seg.side ? lumps.SIDEDEFS[linedef.negSidedefIdx] : lumps.SIDEDEFS[linedef.posSidedefIdx];
		return lumps.SECTORS[sidedef.sectorIdx];
	};


	function findCircleSubsectorsHelper(lumps, idx, point, rad) {
		var LEAF_FLAG = 1 << 15;

		if(idx & LEAF_FLAG) {
			return [idx & ~LEAF_FLAG];
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
				return findCircleSubsectorsHelper(lumps, node.leftChildIdx, point, rad);
			}
			else if(dot <= -rad) {
				return findCircleSubsectorsHelper(lumps, node.rightChildIdx, point, rad);
			}
			else {
				return findCircleSubsectorsHelper(lumps, node.leftChildIdx, point, rad).
							concat(findCircleSubsectorsHelper(lumps, node.rightChildIdx, point, rad));
			}
		}
	}

	Level.prototype.findCircleSubsectors = function(point, rad) {
		return findCircleSubsectorsHelper(this.lumps, this.lumps.GL_NODES.length - 1, point, rad);
	};

	Level.prototype.pointSegDist = function(seg, point) {
		var lumps = this.lumps;
		var v1 = lumps.VERTEXES[seg.v1Idx];
		var v2 = lumps.VERTEXES[seg.v2Idx];
		var nx = -(v2.y - v1.y);
		var ny = v2.x - v1.x;
		var dx = point.x - v1.x;
		var dy = point.y - v1.y;
		return dx*nx + dy*ny;
	};

	Level.prototype.segSide = function(seg, point) {
		return this.pointSegDist(seg, point) < 0 ? -1 : 1;
	};

	Level.prototype.insideSubector = function(subsec, point) {
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

	Level.prototype.leavingSubsector = function(pos1, pos2) {
		var oldSub = this.findSubsector(this.lumps.NODES.length - 1, pos1);
		var newSub = this.findSubsector(this.lumps.NODES.length - 1, pos2);
		return this.insideSubector(oldSub, pos1) && !this.insideSubector(newSub, pos2);
	};

	function oneSidedLinedef(linedef) {
		return linedef.posSidedefIdx === 0xFFFF || linedef.negSidedefIdx === 0xFFFF;
	}

	function linedefSector(lumps, linedef, pos) {
		var idx = pos ? linedef.posSidedefIdx : linedef.negSidedefIdx;
		return idx === 0xFFFF ? null : lumps.SECTORS[lumps.SIDEDEFS[idx].sectorIdx];
	}

	Level.prototype.vsCircle = function(obj, ph, rad, res) {
		var tmpCircle = new Geom.Circle(0, 0, 0);
		var tmpSeg = new Geom.Seg(0, 0);
		var out = new Geom.IntersectionTestResult();

		var lumps = this.lumps;
		var posX = obj.pos.x, posY = obj.pos.y, h = obj.pos.z;
		var subs = this.findCircleSubsectors({x: posX, y: posY}, rad);
		var flag = false;
		var nx = 0;
		var ny = 0;

		for(var z = 0; z < 5; ++z) {
			var mtx = 0;
			var mty = 0;
			var count = 0;

			for(i = 0; i < subs.length; ++i) {
				var sub = lumps.GL_SSECT[subs[i]];

				for(var j = 0; j < sub.segNum; ++j) {
					var tseg = lumps.GL_SEGS[sub.firstSegIdx + j];
					if(tseg.linedefIdx !==  0xFFFF) {
						var linedef = lumps.LINEDEFS[tseg.linedefIdx];
						var v1 = lumps.VERTEXES[linedef.v1Idx];
						var v2 = lumps.VERTEXES[linedef.v2Idx];
						var side = this.segSide(linedef, {x: posX, y: posY});
						var otherSector = linedefSector(lumps, linedef, side === 1);

						if( (!otherSector || 						// trying to walk out of the map
								otherSector.floorHeight > h + 30 || // other sector floor higher than the step height
								otherSector.ceilHeight < h + ph ||	// other sector ceiling lower than cylinder top
								otherSector.ceilHeight - otherSector.floorHeight < ph) && // other sector too narrow
							Geom.circleVsSeg(tmpCircle.init(posX, posY, rad), tmpSeg.init(v1.x, v1.y, v2.x, v2.y), out)) {

							var len = Math.sqrt(out.nx*out.nx + out.ny*out.ny);

							mtx += out.mtx;
							mty += out.mty;
							nx += out.nx / len;
							ny += out.ny / len;
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


		var centerSub = this.findSector({x: posX, y: posY});
		var floorHeight = centerSub.floorHeight;
		var ceilHeight = centerSub.ceilHeight;


		subs = this.findCircleSubsectors({x: posX, y: posY}, rad);
		//var floorHeight = -100000, ceilHeight = 100000;
		//console.log(subs);

		for(i = 0; i < subs.length; ++i) {
			var sub = lumps.GL_SSECT[subs[i]];

			for(var j = 0; j < sub.segNum; ++j) {
				var tseg = lumps.GL_SEGS[sub.firstSegIdx + j];
				if(tseg.linedefIdx !==  0xFFFF) {
					var linedef = lumps.LINEDEFS[tseg.linedefIdx];
					var v1 = lumps.VERTEXES[linedef.v1Idx];
					var v2 = lumps.VERTEXES[linedef.v2Idx];
					var side = this.segSide(linedef, {x: posX, y: posY});
					var otherSector = linedefSector(lumps, linedef, side === 1);

					// If the adjacent sector is touched on the XZ plane and could be walked onto from the current pos:
					if( !(!otherSector ||
							otherSector.floorHeight > h + 30 ||
							otherSector.ceilHeight < h + ph ||
							otherSector.ceilHeight - otherSector.floorHeight < ph) &&
						Geom.circleVsSeg(tmpCircle.init(posX, posY, rad), tmpSeg.init(v1.x, v1.y, v2.x, v2.y), out)) {

						if(otherSector && otherSector.floorHeight > floorHeight)
							floorHeight = otherSector.floorHeight;
						if(otherSector && otherSector.ceilHeight < ceilHeight)
							ceilHeight = otherSector.ceilHeight;

					}
				}
			}
		}

		var nlen = Math.sqrt(nx*nx + ny*ny);
		res.mtx = posX - obj.pos.x;
		res.mty = posY - obj.pos.y;
		res.nx = (nx / nlen) || 0;
		res.ny = (ny / nlen) || 0;
		res.floorHeight = floorHeight;
		res.ceilHeight = ceilHeight;

		//if(flag && (isNaN(res.mtx) || isNaN(res.mtz) || isNaN(res.nx) || isNaN(res.nz) || isNaN(res.floorHeight) || isNaN(res.ceilHeight))) {
		//	console.log(nx, ny, nxAbs, nyAbs);
		//	console.log(res);
		//	debugger;
		//}

		return flag;
	};

	Level.prototype.findHeight = function(posX, posY, h, ph, rad, res) {
		var tmpCircle = new Geom.Circle(0, 0, 0);
		var tmpSeg = new Geom.Seg(0, 0);
		var out = new Geom.IntersectionTestResult();

		var lumps = this.lumps;
		var subs = this.findCircleSubsectors({x: posX, y: posY}, rad);

		var centerSub = this.findSector({x: posX, y: posY});
		var floorHeight = centerSub.floorHeight;
		var ceilHeight = centerSub.ceilHeight;

		subs = this.findCircleSubsectors({x: posX, y: posY}, rad);

		for(i = 0; i < subs.length; ++i) {
			var sub = lumps.GL_SSECT[subs[i]];

			for(var j = 0; j < sub.segNum; ++j) {
				var tseg = lumps.GL_SEGS[sub.firstSegIdx + j];
				if(tseg.linedefIdx !==  0xFFFF) {
					var linedef = lumps.LINEDEFS[tseg.linedefIdx];
					var v1 = lumps.VERTEXES[linedef.v1Idx];
					var v2 = lumps.VERTEXES[linedef.v2Idx];
					var side = this.segSide(linedef, {x: posX, y: posY});
					var otherSector = linedefSector(lumps, linedef, side === 1);

					// If the adjacent sector is touched on the XZ plane and could be walked onto from the current pos:
					if( !(!otherSector ||
							otherSector.floorHeight > h + 30 ||
							otherSector.ceilHeight < h + ph ||
							otherSector.ceilHeight - otherSector.floorHeight < ph) &&
						Geom.circleVsSeg(tmpCircle.init(posX, posY, rad), tmpSeg.init(v1.x, v1.y, v2.x, v2.y), out)) {

						if(otherSector && otherSector.floorHeight > floorHeight)
							floorHeight = otherSector.floorHeight;
						if(otherSector && otherSector.ceilHeight < ceilHeight)
							ceilHeight = otherSector.ceilHeight;

					}
				}
			}
		}

		res.floorHeight = floorHeight;
		res.ceilHeight = ceilHeight;
	};


	function handleRayEntry(ray, t, sec, out) {
		var pz = ray.z + ray.dirZ * t;
		if(pz < sec.floorHeight || pz > sec.ceilHeight) {
			out.t = t;
			return true;
		}
		out.t = INF;
		return false;
	}

	function handleRayExit(ray, t, sec, oneSided, out) {
		var pz = ray.z + ray.dirZ * t;
		if(pz < sec.floorHeight) {
			out.t = (sec.floorHeight - ray.z) / ray.dirZ;
			return true;
		}else if(pz > sec.ceilHeight) {
			out.t = (sec.ceilHeight - ray.z) / ray.dirZ;
			return true;
		}else if(oneSided) {
			out.t = t;
			return true;
		}else {
			out.t = INF;
			return false;
		}
	}

	Level.prototype.rayVsSubsec = function(subIdx, ray, tmp, callback) {
		var lumps = this.lumps;
		var sub = lumps.GL_SSECT[subIdx];
		var ray2d = new Geom.Ray(ray.x, ray.y, ray.dirX, ray.dirY);
		var tmin = INF, tmax = -INF;
		var minSeg, maxSeg, realSeg;
		var flag = false;

		for(var i = 0; i < sub.segNum; ++i) {
			var seg = lumps.GL_SEGS[sub.firstSegIdx + i];

			if(seg.linedefIdx != 0xFFFF) {
				realSeg = seg;

				if(Geom.rayVsSeg(ray2d, this.translateGlSeg(seg), tmp) && tmp.t >= 0) {
					if(tmp.t < tmin) {
						tmin = tmp.t;
						minSeg = seg;
					}

					if(tmp.t > tmax) {
						tmax = tmp.t;
						maxSeg = seg;
					}
				}
			}
		}

		if(tmin < tmax) {
			var ldmax = lumps.LINEDEFS[maxSeg.linedefIdx];
			var sec = this.findSegSector(maxSeg);
			flag = flag || handleRayEntry(ray, tmin, sec, tmp);
			flag = flag || handleRayExit(ray, tmax, sec, oneSidedLinedef(ldmax), tmp);
		}else if(tmin === tmax) {
			var ldmax = lumps.LINEDEFS[maxSeg.linedefIdx];
			var sec = this.findSegSector(maxSeg);
			var raySide = this.pointSegDist(ldmax, ray2d.origin()) < 0 ? 1 : 0; // 1 means left side

			if(raySide === maxSeg.side)
				flag = flag || handleRayEntry(ray, tmin, sec, tmp);
			else
				flag = flag || handleRayExit(ray, tmax, sec, oneSidedLinedef(ldmax), tmp);
		}else {
			var sec = this.findSegSector(realSeg);
			tmp.t = ray.dirZ < 0 ? (sec.floorHeight - ray.z) / ray.dirZ : (sec.ceilHeight - ray.z) / ray.dirZ;
		}

		return callback(ray, subIdx, tmp) || flag;
	}

	Level.prototype.raycastHelper = function(idx, ray, out, callback) {
		var lumps = this.lumps;
		var LEAF_FLAG = 1 << 15;
		var ray2d = ray;//new Geom.Ray(ray.x, ray.y, ray.dirX, ray.dirY);

		if(idx & LEAF_FLAG) {
			return this.rayVsSubsec(idx & ~LEAF_FLAG, ray, out, callback);
		}else {
			var node = lumps.GL_NODES[idx];
			var leftBox = new Geom.AABB(node.leftAABB[2], node.leftAABB[1], node.leftAABB[3], node.leftAABB[0]);
			var rightBox = new Geom.AABB(node.rightAABB[2], node.rightAABB[1], node.rightAABB[3], node.rightAABB[0]);
			var doLeft = Geom.cheapRayVsAABB(ray2d, leftBox);
			var doRight = Geom.cheapRayVsAABB(ray2d, rightBox);

			if(doLeft && doRight) {
				var nx = -node.dy;
				var ny = node.dx;
				var dx = ray2d.x - node.x;
				var dy = ray2d.y - node.y;

				if(nx*dx+ny*dy >= 0)
					return this.raycastHelper(node.leftChildIdx, ray, out, callback) || this.raycastHelper(node.rightChildIdx, ray, out, callback);
				else
					return this.raycastHelper(node.rightChildIdx, ray, out, callback) || this.raycastHelper(node.leftChildIdx, ray, out, callback);
			}
			else if(doLeft)
				return this.raycastHelper(node.leftChildIdx, ray, out, callback);
			else if(doRight)
				return this.raycastHelper(node.rightChildIdx, ray, out, callback);
			else
				return null;
		}
	};

	Level.prototype.raycast = function(ray, callback) {
		var tmp = {};
		var flag = this.raycastHelper(this.lumps.GL_NODES.length - 1, ray, tmp, callback);
		return flag ? tmp : null;
	};

	return Level;
});
