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


function translateGlSeg(seg) {
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
}

function wadToMesh(lumps) {
	var mesh = new Renderer.Mesh();
	var tris = [];
	var colors = [];
	var h = 100;
	
	for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
		var ssect = lumps.GL_SSECT[i];
		var seg0 = translateGlSeg(lumps.GL_SEGS[ssect.firstSegIdx]);
		var x0 = seg0.x1, y0 = seg0.y1;
		
		var r = Math.floor(Math.random() * 100 + 100);
		var g = Math.floor(Math.random() * 100 + 100);
		var b = Math.floor(Math.random() * 100 + 100);
		
		for(var j = 1; j < ssect.segNum - 1; ++j) {
			var seg = translateGlSeg(lumps.GL_SEGS[ssect.firstSegIdx + j]);
			tris.push(x0, -h, y0);
			tris.push(seg.x1, -h, seg.y1);
			tris.push(seg.x2, -h, seg.y2);
			
			var br = 0.8 + Math.random() * 0.2;
			var r1 = Math.floor(r * br);
			var g1 = Math.floor(g * br);
			var b1 = Math.floor(b * br);
			
			colors.push(r1, g1, b1);
			colors.push(r1, g1, b1);
			colors.push(r1, g1, b1);
		}
	}
	
	mesh.setCoords(tris);
	mesh.setColors(colors);
	
	/*
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
		
		var h = 50;
		tris.push(x1, -h, y1);
		tris.push(x1, h, y1);
		tris.push(x2, -h, y2);
		
		tris.push(x2, -h, y2);
		tris.push(x2, h, y2);
		tris.push(x1, h, y1);
		
		colors.push(255, 0, 0);
		colors.push(255, 0, 0);
		colors.push(255, 0, 0);
		
		colors.push(0, 255, 0);
		colors.push(0, 255, 0);
		colors.push(0, 255, 0);
	}
	
	mesh.setCoords(tris);
	mesh.setColors(colors);*/
	
	return mesh;
}



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

var mesh;// = new Renderer.Mesh();

/*
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

mesh.setIndices([0, 1, 2, 0, 1, 3]);*/





var oReq = new XMLHttpRequest();
oReq.open("GET", "/zaza2.wad", true);
oReq.responseType = "arraybuffer";

var lumps;

oReq.onload = function (oEvent) {
  var arrayBuffer = oReq.response;
  if (arrayBuffer) {
	lumps = Wad.read(arrayBuffer);
	console.log(lumps);
	
	mesh = wadToMesh(lumps);
	
	renderLoop();
  }
};

oReq.send(null);







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
	gl.enable(gl.DEPTH_TEST);

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