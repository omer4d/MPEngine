// Fill the buffer with the values that define a letter 'F'.
function setGeometry(gl) {
  var positions = new Float32Array([
          // left column front
          0,   0,  0,
          0, 150,  0,
          30,   0,  0,
          0, 150,  0,
          30, 150,  0,
          30,   0,  0,

          // top rung front
          30,   0,  0,
          30,  30,  0,
          100,   0,  0,
          30,  30,  0,
          100,  30,  0,
          100,   0,  0,

          // middle rung front
          30,  60,  0,
          30,  90,  0,
          67,  60,  0,
          30,  90,  0,
          67,  90,  0,
          67,  60,  0,

          // left column back
            0,   0,  30,
           30,   0,  30,
            0, 150,  30,
            0, 150,  30,
           30,   0,  30,
           30, 150,  30,

          // top rung back
           30,   0,  30,
          100,   0,  30,
           30,  30,  30,
           30,  30,  30,
          100,   0,  30,
          100,  30,  30,

          // middle rung back
           30,  60,  30,
           67,  60,  30,
           30,  90,  30,
           30,  90,  30,
           67,  60,  30,
           67,  90,  30,

          // top
            0,   0,   0,
          100,   0,   0,
          100,   0,  30,
            0,   0,   0,
          100,   0,  30,
            0,   0,  30,

          // top rung right
          100,   0,   0,
          100,  30,   0,
          100,  30,  30,
          100,   0,   0,
          100,  30,  30,
          100,   0,  30,

          // under top rung
          30,   30,   0,
          30,   30,  30,
          100,  30,  30,
          30,   30,   0,
          100,  30,  30,
          100,  30,   0,

          // between top rung and middle
          30,   30,   0,
          30,   60,  30,
          30,   30,  30,
          30,   30,   0,
          30,   60,   0,
          30,   60,  30,

          // top of middle rung
          30,   60,   0,
          67,   60,  30,
          30,   60,  30,
          30,   60,   0,
          67,   60,   0,
          67,   60,  30,

          // right of middle rung
          67,   60,   0,
          67,   90,  30,
          67,   60,  30,
          67,   60,   0,
          67,   90,   0,
          67,   90,  30,

          // bottom of middle rung.
          30,   90,   0,
          30,   90,  30,
          67,   90,  30,
          30,   90,   0,
          67,   90,  30,
          67,   90,   0,

          // right of bottom
          30,   90,   0,
          30,  150,  30,
          30,   90,  30,
          30,   90,   0,
          30,  150,   0,
          30,  150,  30,

          // bottom
          0,   150,   0,
          0,   150,  30,
          30,  150,  30,
          0,   150,   0,
          30,  150,  30,
          30,  150,   0,

          // left side
          0,   0,   0,
          0,   0,  30,
          0, 150,  30,
          0,   0,   0,
          0, 150,  30,
          0, 150,   0]);

  // Center the F around the origin and Flip it around. We do this because
  // we're in 3D now with and +Y is up where as before when we started with 2D
  // we had +Y as down.

  // We could do by changing all the values above but I'm lazy.
  // We could also do it with a matrix at draw time but you should
  // never do stuff at draw time if you can do it at init time.
  var matrix = m4.xRotation(Math.PI),
  matrix = m4.translate(matrix, -50, -75, -15);

  for (var ii = 0; ii < positions.length; ii += 3) {
    var vector = m4.vectorMultiply([positions[ii + 0], positions[ii + 1], positions[ii + 2], 1], matrix);
    positions[ii + 0] = vector[0];
    positions[ii + 1] = vector[1];
    positions[ii + 2] = vector[2];
  }

  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

function setColors(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Uint8Array([
          // left column front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,

          // top rung front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,

          // middle rung front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,

          // left column back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

          // top rung back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

          // middle rung back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

          // top
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,

          // top rung right
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,

          // under top rung
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,

          // between top rung and middle
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,

          // top of middle rung
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,

          // right of middle rung
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,

          // bottom of middle rung.
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,

          // right of bottom
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,

          // bottom
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,

          // left side
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220]),
      gl.STATIC_DRAW);
}


function radToDeg(r) {
return r * 180 / Math.PI;
}

function degToRad(d) {
return d * Math.PI / 180;
}

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

// lookup uniforms
var matrixLocation = gl.getUniformLocation(program, "u_matrix");

// Create a buffer to put positions in
var positionBuffer = gl.createBuffer();
// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
// Put geometry data into buffer
setGeometry(gl);

// Create a buffer to put colors in
var colorBuffer = gl.createBuffer();
// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = colorBuffer)
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
// Put geometry data into buffer
setColors(gl);



var cameraAngleRadians = degToRad(0);


var posX = 0;
var posY = 0;
var yaw = 0, pitch = 0;



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
	
	
	
	// Tell WebGL how to convert from clip space to pixels
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	// Clear the canvas AND the depth buffer.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Turn on culling. By default backfacing triangles
	// will be culled.
	gl.enable(gl.CULL_FACE);

	// Enable the depth buffer
	gl.enable(gl.DEPTH_TEST);

	// Tell it to use our program (pair of shaders)
	gl.useProgram(program);

	// Turn on the position attribute
	gl.enableVertexAttribArray(positionLocation);

	// Bind the position buffer.
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
	var size = 3;          // 3 components per iteration
	var type = gl.FLOAT;   // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer(
		positionLocation, size, type, normalize, stride, offset)

	// Turn on the color attribute
	gl.enableVertexAttribArray(colorLocation);

	// Bind the color buffer.
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

	// Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
	var size = 3;                 // 3 components per iteration
	var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
	var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
	var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0;               // start at the beginning of the buffer
	gl.vertexAttribPointer(
		colorLocation, size, type, normalize, stride, offset)


	var numFs = 5;
	var radius = 200;

	// Compute the projection matrix
	var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	var zNear = 1;
	var zFar = 2000;
	var projectionMatrix = m4.perspective(1, aspect, zNear, zFar);

	// Compute a matrix for the camera
	var cameraMatrix =  m4.translation(posX, 0, posY);
	cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2+yaw);
	cameraMatrix = m4.xRotate(cameraMatrix, pitch);
	//cameraMatrix = m4.translate(cameraMatrix, posX, 0, posY);

	// Make a view matrix from the camera matrix
	var viewMatrix = m4.inverse(cameraMatrix);

	// Compute a view projection matrix
	var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

	
	
	for (var ii = 0; ii < numFs; ++ii) {
	  var angle = ii * Math.PI * 2 / numFs;
	  var x = Math.cos(angle) * radius;
	  var y = Math.sin(angle) * radius

	  // starting with the view projection matrix
	  // compute a matrix for the F
	  var matrix = m4.translate(viewProjectionMatrix, x, 0, y);

	  // Set the matrix.
	  gl.uniformMatrix4fv(matrixLocation, false, matrix);

	  // Draw the geometry.
	  var primitiveType = gl.TRIANGLES;
	  var offset = 0;
	  var count = 16 * 6;
	  gl.drawArrays(primitiveType, offset, count);
	}
	
	requestAnimFrame(renderLoop);
}

renderLoop();