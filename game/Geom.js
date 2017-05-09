define([], function() {
	function Ray(x, y, dirX, dirY) {
		this.x = x;
		this.y = y;
		this.dirX = dirX;
		this.dirY = dirY;
	}

	Ray.prototype.init = function(x, y, dirX, dirY) {
		this.x = x;
		this.y = y;
		this.dirX = dirX;
		this.dirY = dirY;
		return this;
	};

	Ray.prototype.origin = function() {
		// This relies on duck-typing.
		// We could pass the ray directly as a point, but calling Ray.origin instead makes the intent clear.
		return this;
	};

	function Seg(x1, y1, x2, y2) {
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
	}

	Seg.prototype.init = function(x1, y1, x2, y2) {
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
		return this;
	};

	function Circle(x, y, rad) {
		this.x = x;
		this.y = y;
		this.rad = rad;
	}

	Circle.prototype.init = function(x, y, rad) {
		this.x = x;
		this.y = y;
		this.rad = rad;
		return this;
	};

	function AABB(minx, miny, maxx, maxy) {
		this.minx = minx;
		this.miny = miny;
		this.maxx = maxx;
		this.maxy = maxy;
	}

	AABB.prototype.init = function(minx, miny, maxx, maxy) {
		this.minx = minx;
		this.miny = miny;
		this.maxx = maxx;
		this.maxy = maxy;
		return this;
	};

	function IntersectionTestResult() {
		// Minimal translation vector:
		this.mtx = 0;
		this.mty = 0;

		// Normal (minimal translation direction):
		this.nx = 0;
		this.ny = 0;
	}

	function RaycastResult() {
		this.x = 0;
		this.y = 0;
		this.t = 0; // Distance along the ray
	}

	function circleVsSeg(circle, seg, out) {
		var cx = circle.x, cy = circle.y, rad = circle.rad;
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
				var nx = vx1/d1;
				var ny = vy1/d1;
				out.mtx = nx * (rad - d1);
				out.mty = ny * (rad - d1);
				out.nx = nx;
				out.ny = ny;
			}else {
				d2 = Math.sqrt(d2);
				var nx = vx2/d2;
				var ny = vy2/d2;
				out.mtx = nx * (rad - d2);
				out.mty = ny * (rad - d2);
				out.nx = nx;
				out.ny = ny;
			}

			return true;
		}
	};

	function rayVsSeg(ray, line, out) {
		var nx = -(line.y2 - line.y1);
		var ny = line.x2 - line.x1;
		var vx = line.x1 - ray.x;
		var vy = line.y1 - ray.y;
		var t = (vx*nx + vy*ny) / (ray.dirX*nx + ray.dirY*ny);
		var px = ray.x + t*ray.dirX;
		var py = ray.y + t*ray.dirY;
		var e = 0.001;

		if(px + e >= Math.min(line.x1, line.x2) && px - e <= Math.max(line.x1, line.x2) &&
			py + e >= Math.min(line.y1, line.y2) && py - e <= Math.max(line.y1, line.y2)) {

			if(out) {
				out.x = px;
				out.y = py;
				out.t = t;
			}

			return true;
		}

		return false;
	};

	function cheapRayVsAABB(ray, box) {
		var nx = -ray.dirY;
		var ny = ray.dirX;
		var i1, i2;
		var p = ray.x * nx + ray.y * ny;

		if(nx * ny > 0) {
			i1 = box.minx * nx + box.miny * ny;
			i2 = box.maxx * nx + box.maxy * ny;
		}else {
			i1 = box.maxx * nx + box.miny * ny;
			i2 = box.minx * nx + box.maxy * ny;
		}

		var c1 = (i1 < i2) ? (p >= i1 && p <= i2) : (p >= i2 && p <= i1);
		var c2 = ray.dirX > 0 ? box.maxx >= ray.x : box.minx <= ray.x;
		var c3 = ray.dirY > 0 ? box.maxy >= ray.y : box.miny <= ray.y;

		return c1 && c2 && c3;
	};

	function rayVsCircleHelper(ray, cx, cy, r, out) {
		var sx = ray.x - cx;
		var sy = ray.y - cy;

		var A = ray.dirY*ray.dirY + ray.dirX*ray.dirX;
		var B = 2*sy*ray.dirY + 2*sx*ray.dirX;
		var C = sx*sx + sy*sy - r*r;
		var D = B*B - 4*A*C;

		if(D >= 0) {
			D = Math.sqrt(D);
			var t1 = (-B + D) / (2*A);
			var t2 = (-B - D) / (2*A);

			if(t1 > 0 || t2 > 0) {
				if(out) {
					out.tmin = Math.min(t1, t2);
					out.tmax = Math.max(t1, t2);
				}
				return true;
			}else {
				return false;
			}
		}else
			return false;
	}

	function rayVsCircle(ray, circle, out) {
		return rayVsCircleHelper(ray, circle.x, circle.y, circle.rad, out);
	}

	function rayVsCapsule(ray, seg, r, out) {
		var nx = -(seg.y2 - seg.y1);
		var ny = seg.x2 - seg.x1;
		var len = Math.sqrt(nx*nx + ny*ny);
		var ts = [];

		nx /= len;
		ny /= len;

		var tseg = {x1: seg.x1 - nx * r, y1: seg.y1 - ny * r, x2: seg.x2 - nx * r, y2: seg.y2 - ny * r};

		if(rayVsSeg(ray, tseg, out))
			ts.push(out.t);

		tseg = {x1: seg.x1 + nx * r, y1: seg.y1 + ny * r, x2: seg.x2 + nx * r, y2: seg.y2 + ny * r};

		if(rayVsSeg(ray, tseg, out))
			ts.push(out.t);
		if(rayVsCircleHelper(ray, seg.x1, seg.y1, r, out))
			ts.push(out.t);
		if(rayVsCircleHelper(ray, seg.x2, seg.y2, r, out))
			ts.push(out.t);

		if(ts.length === 0)
			return false;

		var tmin = ts[0];
		for(var i = 1; i < ts.length; ++i)
			if(ts[i] < tmin)
				tmin = ts[i];

		out.t = tmin;
		out.x = ray.x + ray.dirX * tmin;
		out.y = ray.y + ray.dirY * tmin;

		return true;
	}

	return {
		RaycastResult: RaycastResult,
		IntersectionTestResult: IntersectionTestResult,
		Ray: Ray,
		Circle: Circle,
		Seg: Seg,
		AABB: AABB,

		circleVsSeg: circleVsSeg,

		cheapRayVsAABB: cheapRayVsAABB,
		rayVsSeg: rayVsSeg,
		rayVsCircle: rayVsCircle,
		rayVsCapsule: rayVsCapsule
	};
});
