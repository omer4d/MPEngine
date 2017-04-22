function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
 
  console.log(source, "\n", gl.getShaderInfoLog(shader));
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
attribute vec2 a_texcoord;

uniform mat4 u_matrix;

varying vec4 v_color;
varying vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_color = a_color;
  v_texcoord = a_texcoord;
}`;

var fragmentShaderSource = `
precision mediump float;

varying vec4 v_color;
varying vec2 v_texcoord;

uniform sampler2D u_texture;

void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord) * v_color;
   //gl_FragColor = v_color;
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


var frameCount = 0;
var fpsCounter = document.getElementById("fpsCounter");
setInterval(function() {
	fpsCounter.textContent = "FPS: " + frameCount;
	frameCount = 0;
}, 1000);


var canvas = document.getElementById("myCanvas");
var gl = canvas.getContext("webgl");


var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
var program = createProgram(gl, vertexShader, fragmentShader);

var positionLocation = gl.getAttribLocation(program, "a_position");
var colorLocation = gl.getAttribLocation(program, "a_color");
var matrixLocation = gl.getUniformLocation(program, "u_matrix");
var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
var textureLocation = gl.getUniformLocation(program, "u_texture");

var texture;

window.Renderer.gl = gl;

var mesh;




var image = new Image();
image.src = "data/f-texture.png";
image.addEventListener('load', function(event) {
  console.log("img wh: ", event.target.width, event.target.height);
  
  texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  
  mesh = new Renderer.Mesh();
  mesh.setCoords([
	-100, -100, -500,
	-100, 100, -500,
	100, -100, -500,
	
	100, -100, -500,
	-100, 100, -500,
	100, 100, -500]);
	
  mesh.setColors([
	255, 200, 200,
	200, 255, 200,
	200, 200, 255,
	
	255, 255, 200,
	200, 255, 255,
	255, 200, 255,
  ]);
  mesh.setTexCoords([
	0, 0,
	0, 1,
	1, 0,
	
	1, 0,
	0, 1,
	1, 1,
  ]);
  
  console.log(mesh.vertexNum);
  
  renderLoop();
});

function renderLoop() {
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	//gl.enable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);

	gl.useProgram(program);

	// Compute the projection matrix
	var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	var zNear = 10;
	var zFar = 20000;
	var projectionMatrix = m4.perspective(3.14/2*0.8, aspect, zNear, zFar);

	// Compute a matrix for the camera
	//var cameraMatrix =  m4.translation(posX, posH, posY);
	//cameraMatrix = m4.yRotate(cameraMatrix, Math.PI/2+yaw);
	//cameraMatrix = m4.xRotate(cameraMatrix, pitch);
	
	//var viewMatrix = m4.inverse(cameraMatrix);
	//var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

	 gl.uniformMatrix4fv(matrixLocation, false, projectionMatrix);
	 gl.uniform1i(textureLocation, 0);
	 mesh.draw({coords: positionLocation , colors: colorLocation, texCoords: texcoordLocation}, 0, 6);
	
	++frameCount;
	requestAnimFrame(renderLoop);
}