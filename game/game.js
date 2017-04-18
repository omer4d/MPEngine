function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
 
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
 
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

var vertexShaderSource = `
attribute vec4 a_position;
attribute vec4 a_color;

uniform mat4 u_matrix;

varying vec4 v_color;

void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the color to the fragment shader.
  v_color = a_color;
}`;

var fragmentShaderSource = `
precision mediump float;

// Passed in from the vertex shader.
varying vec4 v_color;

void main() {
   gl_FragColor = v_color;
}
`;






window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

var keystates = {};

document.body.addEventListener('keydown', function(e) {
    keystates[e.key] = true;
});

document.body.addEventListener('keyup', function(e) {
    keystates[e.key] = false;
});




var canvas = document.getElementById("myCanvas");
var gl = canvas.getContext("webgl");


var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
var program = createProgram(gl, vertexShader, fragmentShader);

var positionLocation = gl.getAttribLocation(program, "a_position");
var colorLocation = gl.getAttribLocation(program, "a_color");
var matrixLocation = gl.getUniformLocation(program, "u_matrix");

var posX = 0;
var posY = 0;
var yaw = 0, pitch = 0;

window.Renderer.gl = gl;

var mesh = new Renderer.Mesh();

mesh.setCoords([0, 0, -5,
				0.5, 0, -5,
				0.5, 0.5, -5,
				
				//0, 0, -1,
				//0.5, 0, -1,
				0.5, -0.5, -5,]);

mesh.setColors([255, 0, 0,
				255, 255, 0,
				255, 0, 255,
				//0, 255, 0,
				//0, 255, 0,
				0, 255, 0]);

mesh.setIndices([0, 1, 2, 0, 1, 3]);
				
function renderLoop() {
	var dt = 1/60;
	var moveSpeed = 300;
	
	if(keystates["w"]) {
		posX += moveSpeed * Math.cos(yaw) * dt;
		posY += moveSpeed * Math.sin(yaw) * dt;
	}
		
	if(keystates["s"]) {
		posX -= moveSpeed * Math.cos(yaw) * dt;
		posY -= moveSpeed * Math.sin(yaw) * dt;
	}
	
	if(keystates["d"]) {
		posX += -moveSpeed * Math.sin(yaw) * dt;
		posY += moveSpeed * Math.cos(yaw) * dt;
	}
		
	if(keystates["a"]) {
		posX -= -moveSpeed * Math.sin(yaw) * dt;
		posY -= moveSpeed * Math.cos(yaw) * dt;
	}
	
	
	if(keystates["ArrowLeft"])
		yaw -= 1 * dt;
	if(keystates["ArrowRight"])
		yaw += 1 * dt;
	if(keystates["ArrowUp"])
		pitch -= 1 * dt;
	if(keystates["ArrowDown"])
		pitch += 1 * dt;
	
	
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	//gl.enable(gl.CULL_FACE);
	//gl.enable(gl.DEPTH_TEST);

	gl.useProgram(program);

	// Compute the projection matrix
	var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	var zNear = 1;
	var zFar = 2000;
	var projectionMatrix = m4.perspective(1, aspect, zNear, zFar);

	// Compute a matrix for the camera
	var cameraMatrix =  m4.translation(posX, 0, posY);
	cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2+yaw);
	cameraMatrix = m4.xRotate(cameraMatrix, pitch);
	
	var viewMatrix = m4.inverse(cameraMatrix);
	var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

	 gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);

	 mesh.draw({coords: positionLocation, colors: colorLocation});
	 
	 /*
	 // Draw the geometry.
	 var primitiveType = gl.TRIANGLES;
	 var offset = 0;
	 var count = 16 * 6;
	 gl.drawArrays(primitiveType, offset, count);*/
	
	requestAnimFrame(renderLoop);
}

renderLoop();