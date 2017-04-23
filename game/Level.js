define([], function() {
	function Level(lumps) {
		this.lumps = lumps;
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

	Level.prototype.findLinedefSector = function(linedef, side) {
		var sidedef = this.lumps.SIDEDEFS[side ? linedef.negSidedefIdx : linedef.posSidedefIdx];
		return this.lumps.SECTORS[sidedef.sectorIdx];
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
	
	
	function findCircleSubsectorHelper(lumps, idx, point, rad) {
		var LEAF_FLAG = 1 << 15;
		
		if(idx & LEAF_FLAG) {
			return [lumps.GL_SSECT[idx & ~LEAF_FLAG]];
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
				return findCircleSubsectorHelper(lumps, node.leftChildIdx, point, rad);
			}
			else if(dot <= -rad) {
				return findCircleSubsectorHelper(lumps, node.rightChildIdx, point, rad);
			}
			else {
				return findCircleSubsectorHelper(lumps, node.leftChildIdx, point, rad).
							concat(findCircleSubsectorHelper(lumps, node.rightChildIdx, point, rad));
			}
		}
	}
	
	Level.prototype.findCircleSubsector = function(point, rad) {
		return findCircleSubsectorHelper(this.lumps, this.lumps.GL_NODES.length - 1, point, rad);
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
	
	function circleVsSeg(seg, cx, cy, rad, out) {
		var dx = seg.x2 - seg.x1;
		var dy = seg.y2 - seg.y1;
		var len = Math.sqrt(dx*dx + dy*dy);
		var nx = -dy;
		var ny = dx;
		
		nx /= len;
		ny /= len;
		
		var vx1 = cx - seg.x1;
		var vy1 = cy - seg.y1;
		var dpt = dx*vx1 + dy*vy1;
		
		if(dpt >= 0 && dpt < dx*dx+dy*dy) {
			var dpn = nx*vx1 + ny*vy1;
			var mtd1 = rad - dpn;
			var mtd2 = -rad - dpn;
			var mtd = dpn > 0 ? mtd1 : mtd2;
			out.mtx = nx * mtd;
			out.mty = ny * mtd;
			out.nx = nx;
			out.ny = ny;
			return Math.abs(dpn) <= rad;
		}else {
			var vx2 = cx - seg.x2;
			var vy2 = cy - seg.y2;
			var d1 = vx1*vx1 + vy1*vy1;
			var d2 = vx2*vx2 + vy2*vy2;
			
			if(d1 > rad*rad && d2 > rad*rad)
				return false;
			
			if(d1 < d2) {
				d1 = Math.sqrt(d1);
				out.mtx = vx1/d1 * (rad - d1);
				out.mty = vy1/d1 * (rad - d1);
			}else {
				d2 = Math.sqrt(d2);
				out.mtx = vx2/d2 * (rad - d2);
				out.mty = vy2/d2 * (rad - d2);
			}
			
			return true;
		}
	}

	Level.prototype.vsCircle = function(x, y, h, rad, res) {
		var lumps = this.lumps;
		var posX = x, posY = y;
		var subs = this.findCircleSubsector({x: posX, y: posY}, rad);
		var flag = false;
		
		for(var z = 0; z < 5; ++z) {
			var mtx = 0;
			var mty = 0;
			var count = 0;
			
			for(i = 0; i < subs.length; ++i) {
				for(var j = 0; j < subs[i].segNum; ++j) {
					var tseg = lumps.GL_SEGS[subs[i].firstSegIdx + j];
					if(tseg.linedefIdx !==  0xFFFF) {
						var out = {};
						var linedef = lumps.LINEDEFS[tseg.linedefIdx];
						var v1 = lumps.VERTEXES[linedef.v1Idx];
						var v2 = lumps.VERTEXES[linedef.v2Idx];
						var seg = {x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y};
						var side = this.segSide(linedef, {x: posX, y: posY});
						var otherSector = linedefSector(lumps, linedef, side === 1);
						
						var ph = 40;
						
						if( (!otherSector ||
								otherSector.floorHeight > h + 30 ||
								otherSector.ceilHeight < h + ph ||
								otherSector.ceilHeight - otherSector.floorHeight < ph) &&
							circleVsSeg(seg, posX, posY, rad, out)) {
							mtx += out.mtx;
							mty += out.mty;
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
		
		res.mtx = posX - x;
		res.mty = posY - y;
		
		/*
		var oldSec = findSector(lumps, lumps.NODES.length - 1, {x: posX, y: posY});
		var newSec = findSector(lumps, lumps.NODES.length - 1, {x: newPosX, y: newPosY});
		
		var h1 = oldSec.floorHeight;
		
		if((!leavingSector(lumps, {x: posX, y: posY}, {x: newPosX, y: newPosY}) &&
			newSec.floorHeight - h1 < 30 && newSec.ceilHeight > h1 + 60) || keystates["q"]) {
			posX = newPosX;
			posY = newPosY;
		}*/
		
		
		return flag;
	};
	
	return Level;
});