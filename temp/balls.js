window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) { window.setTimeout(callback, 1000 / 60); };

function randf(min, max) {
	if(min === undefined)
		min = 0;
	if(max === undefined)
		max = 1;
	return min + Math.random() * (max - min);
}

function inRange(x, min, max) {
	return x >= min && x <= max;
}

function clamp(x, min, max) {
	return x < min ? min : (x > max ? max : x);
}

var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var lastFrameTime = performance.now();

var balls = [];

for(var i = 0; i < 10; ++i) {
	var r = randf(10, 60);
	
	balls.push({
		r: r,
		x: randf(r, canvas.width - r),
		y: randf(r, canvas.height - r),
		vx: randf(100, 300) * (randf() < 0.5 ? -1 : 1),
		vy: randf(100, 300) * (randf() < 0.5 ? -1 : 1)
	});
}

function logic(dt) {
	for(var i = 0; i < balls.length; ++i) {
		var ball = balls[i];
		ball.x += ball.vx * dt;
		ball.y += ball.vy * dt;
		ball.vx *= inRange(ball.x, ball.r, canvas.width - ball.r) ? 1 : -1;
		ball.vy *= inRange(ball.y, ball.r, canvas.height - ball.r) ? 1 : -1;
		ball.x = clamp(ball.x, ball.r, canvas.width - ball.r);
		ball.y = clamp(ball.y, ball.r, canvas.height - ball.r);
	}
}

function drawCircle(context, x, y, r, col) {
	context.beginPath();
	context.arc(x, y, r, 0, 2 * Math.PI, false);
	context.fillStyle = col;
	context.fill();
}

function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	for(var i = 0; i < balls.length; ++i)
		drawCircle(context, balls[i].x, balls[i].y, balls[i].r, "green");
}

function renderLoop() {
	var t = performance.now();
	var dt = (t - lastFrameTime) / 1000;
	lastFrameTime = t;
	
	logic(dt);
	render();
	
	requestAnimFrame(renderLoop);
}

requestAnimFrame(renderLoop);