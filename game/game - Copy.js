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



var oReq = new XMLHttpRequest();
oReq.open("GET", "/zaza2.wad", true);
oReq.responseType = "arraybuffer";

var lumps;

oReq.onload = function (oEvent) {
  var arrayBuffer = oReq.response;
  if (arrayBuffer) {
	lumps = Wad.read(arrayBuffer);
	console.log(lumps);
	renderLoop();
  }
};

oReq.send(null);


var canvas = document.getElementById("myCanvas");
var gl = canvas.getContext("webgl");


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
void main() {
  gl_Position = a_position;
}`;

var fragmentShaderSource = `
precision mediump float;
 
void main() {
  gl_FragColor = vec4(1, 0, 0.5, 1); // return redish-purple
}
`;

var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
var program = createProgram(gl, vertexShader, fragmentShader);
var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

var positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

var positions = [
  0, 0,
  0, 0.5,
  0.7, 0,
];

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.useProgram(program);
gl.enableVertexAttribArray(positionAttributeLocation);

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
 
// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
var size = 2;          // 2 components per iteration
var type = gl.FLOAT;   // the data is 32bit floats
var normalize = false; // don't normalize the data
var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
var offset = 0;        // start at the beginning of the buffer
gl.vertexAttribPointer(
    positionAttributeLocation, size, type, normalize, stride, offset);
	
	

function renderLoop() {
	/*
	var i;
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	for(i = 0; i < lumps.GL_SEGS.length; ++i) {
		var seg = lumps.GL_SEGS[i];
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
		
		context.beginPath();
		context.moveTo(x1 / 5 + 256, y1 / 5 + 256);
		context.lineTo(x2 / 5 + 256, y2 / 5 + 256);
		context.stroke();
	}
	
	for(i = 0; i < lumps.VERTEXES.length; ++i) {
		context.beginPath();
		context.arc(lumps.VERTEXES[i].x / 5 + 256, lumps.VERTEXES[i].y / 5 + 256, 1, 0, 2 * Math.PI, false);
		context.fillStyle = "red";
		context.fill();
	}*/
	
	gl.clearColor(0.9,0.9,0.8,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
	
	var primitiveType = gl.TRIANGLES;
	var offset = 0;
	var count = 3;
	gl.drawArrays(primitiveType, offset, count);
	
	requestAnimFrame(renderLoop);
};