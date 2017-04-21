window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

var keystates = {};
var mousePressed = false;
var mouseX = 0, mouseY = 0;
var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");

window.addEventListener('keydown', function(e) {
    keystates[e.key] = true;
});

window.addEventListener('keyup', function(e) {
    keystates[e.key] = false;
});

window.addEventListener('mousedown', function(e) {
    mousePressed = true;
});

window.addEventListener('mouseup', function(e) {
	mousePressed = false;
});

var normalMouseMoveListener = function(e) {
	var r = canvas.getBoundingClientRect();
	mouseX = e.clientX - r.left;
	mouseY = e.clientY - r.top;
};

window.addEventListener('mousemove', normalMouseMoveListener);





//canvas.requestPointerLock();

var lastRenderTime = performance.now();

function circlefill(context, x, y, r, col) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = col;
    context.fill();
}

function circle(context, x, y, r, col) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.strokeStyle = col;
    context.stroke();
}

function line(context, x1, y1, x2, y2, col) {
		context.beginPath();
		context.moveTo(x1, y1);
		context.lineTo(x2, y2);
		context.strokeStyle = col;
		context.stroke();
}




















function drawCapsule(context, seg, rad, col) {
	var nx = -(seg.y2 - seg.y1);
	var ny = seg.x2 - seg.x1;
	var len = Math.sqrt(nx*nx + ny*ny);
	nx /= len;
	ny /= len;
	
	circle(context, seg.x1, seg.y1, rad, col);
	circle(context, seg.x2, seg.y2, rad, col);
	line(context, seg.x1 + nx * rad, seg.y1 + ny * rad, seg.x2 + nx * rad, seg.y2 + ny * rad);
	line(context, seg.x1 - nx * rad, seg.y1 - ny * rad, seg.x2 - nx * rad, seg.y2 - ny * rad);
}









function rayVsSeg(ray, line, out) {
	var nx = -(line.y2 - line.y1);
	var ny = line.x2 - line.x1;
	var vx = line.x1 - ray.x;
	var vy = line.y1 - ray.y;
	var t = (vx*nx + vy*ny) / (ray.dirX*nx + ray.dirY*ny);
	var px = ray.x + t*ray.dirX;
	var py = ray.y + t*ray.dirY;
	
	if(px >= Math.min(line.x1, line.x2) && px <= Math.max(line.x1, line.x2) &&
		py >= Math.min(line.y1, line.y2) && py <= Math.max(line.y1, line.y2)) {
		
		if(out) {
			out.x = px;
			out.y = py;
			out.t = t;
		}
		
		return true;
	}
	
	return false;
}


function rayVsCircle(ray, cx, cy, r, out) {
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
		var tmin = Math.min(t1, t2);
		var tmax = Math.max(t1, t2);
		
		if(out) {
			var t = tmin;
			out.t = t;
			out.x = ray.x + t*ray.dirX;
			out.y = ray.y + t*ray.dirY;
		}
		
		return true;
	}else
		return false;
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
	if(rayVsCircle(ray, seg.x1, seg.y1, r, out))
		ts.push(out.t);
	if(rayVsCircle(ray, seg.x2, seg.y2, r, out))
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


var seg = {
	x2: 100,
	y2: 300,
	x1: 330,
	y1: 420
};

var ray = {
	x: 200,
	y: 20,
	dirX: 0,
	dirY: 0,
};

var circ = {
	x: 400,
	y: 200,
	r: 40
};

function renderLoop() {
	var t = performance.now();
	var dt = (t - lastRenderTime) / 1000;
	
	if(mousePressed) {
		ray.x = mouseX;
		ray.y = mouseY;
	}
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	ray.dirX = mouseX - ray.x;
	ray.dirY = mouseY - ray.y;
	
	line(context, seg.x1, seg.y1, seg.x2, seg.y2, "red");
	drawCapsule(context, seg, 30, "red");
	
	circlefill(context, ray.x, ray.y, 2, "yellow");
	line(context, ray.x, ray.y, ray.x + ray.dirX, ray.y + ray.dirY, "yellow");
	
	circle(context, circ.x, circ.y, circ.r, "green");
	
	var res = {};
	
	/*if(rayVsSeg(ray, seg, res))
		circlefill(context, res.x, res.y, 2, "red");*/
	
	if(rayVsCapsule(ray, seg, 30, res))
		circlefill(context, res.x, res.y, 2, "red");
	
	if(rayVsCircle(ray, circ.x, circ.y, circ.r, res))
		circlefill(context, res.x, res.y, 2, "red");
	
	requestAnimFrame(renderLoop);
};

renderLoop();