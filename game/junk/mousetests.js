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

var lockedMouseMoveListener = function(e) {
	var r = canvas.getBoundingClientRect();
	mouseX += e.movementX;
	mouseY += e.movementY;
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	circle(context, mouseX, mouseY, 20, "blue");
	line(context, 0, 10, 200, 200, "red");
};

window.addEventListener('mousemove', normalMouseMoveListener);





canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.canvasExitPointerLock;

canvas.onclick = function() {
  canvas.requestPointerLock();
};


document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
var locked = false;

function lockChangeAlert() {
	var newLocked = document.pointerLockElement === canvas;
	
  if (!locked && newLocked) {
    console.log('The pointer lock status is now locked');
	window.removeEventListener("mousemove", normalMouseMoveListener, false);
    window.addEventListener("mousemove", lockedMouseMoveListener, false);
  } else if(!newLocked && locked) {
    console.log('The pointer lock status is now unlocked');  
	window.removeEventListener("mousemove", lockedMouseMoveListener, false);
    window.addEventListener("mousemove", normalMouseMoveListener, false);
  }
  
  locked = newLocked;
  renderLoop();
}





//canvas.requestPointerLock();

var lastRenderTime = performance.now();

function circle(context, x, y, r, col) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = col;
    context.fill();
}

function line(context, x1, y1, x2, y2, col) {
		context.beginPath();
		context.moveTo(x1, y1);
		context.lineTo(x2, y2);
    context.strokeStyle = col;
		context.stroke();
}

function renderLoop() {
	var t = performance.now();
	var dt = (t - lastRenderTime) / 1000;
	
	if(!locked) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		circle(context, mouseX, mouseY, 20, "blue");
		line(context, 0, 10, 200, 200, "red");
		requestAnimFrame(renderLoop);
	}
};

renderLoop();