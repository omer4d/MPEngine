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


function translateGlSeg(lumps, seg) {
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

function findLinedefSector(lumps, linedef, side) {
	var sidedef = lumps.SIDEDEFS[side ? linedef.negSidedefIdx : linedef.posSidedefIdx];
	return lumps.SECTORS[sidedef.sectorIdx];
}

function findSegSector(lumps, seg) {
	return findLinedefSector(lumps, lumps.LINEDEFS[seg.linedefIdx], seg.side);
}

function pushWall(tris, colors, x1, y1, x2, y2, h1, h2) {
	var nx = y1 - y2, ny = x2 - x1;
	var len = Math.sqrt(nx*nx + ny*ny);
	var r = Math.floor((nx / len + 1) / 2 * 255);
	var g = Math.floor((ny / len + 1) / 2 * 255);
	
	tris.push(x1, h1, y1);
	tris.push(x1, h2, y1);
	tris.push(x2, h1, y2);
		
	tris.push(x1, h2, y1);
	
	tris.push(x2, h2, y2);
	tris.push(x2, h1, y2);
	
	colors.push(r, g, 0);
	colors.push(r, g, 0);
	colors.push(r, g, 0);
	
	colors.push(r, g, 0);
	colors.push(r, g, 0);
	colors.push(r, g, 0);
}

function wadToMesh(lumps) {
	var mesh = new Renderer.Mesh();
	var tris = [];
	var colors = [];
	var h = 100;
	
	for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
		var ssect = lumps.GL_SSECT[i];
		var seg = lumps.GL_SEGS[ssect.firstSegIdx];
		var tseg = translateGlSeg(lumps, seg);
		var x0 = tseg.x1, y0 = tseg.y1;
		var sector = findSegSector(lumps, seg);
		var h1 = sector.floorHeight;
		var h2 = sector.ceilHeight;
		console.log(h);
		
		var r = Math.floor(Math.random() * 100 + 100);
		var g = Math.floor(Math.random() * 100 + 100);
		var b = Math.floor(Math.random() * 100 + 100);
		
		for(var j = 1; j < ssect.segNum - 1; ++j) {
			var seg = lumps.GL_SEGS[ssect.firstSegIdx + j];
			var tseg = translateGlSeg(lumps, seg);
			var br = 0.8 + Math.random() * 0.2;
			var r1 = Math.floor(r * br);
			var g1 = Math.floor(g * br);
			var b1 = Math.floor(b * br);
			
			tris.push(x0, h1, y0);
			tris.push(tseg.x1, h1, tseg.y1);
			tris.push(tseg.x2, h1, tseg.y2);
			
			colors.push(r1, g1, b1);
			colors.push(r1, g1, b1);
			colors.push(r1, g1, b1);
			
			tris.push(x0, h2, y0);
			tris.push(tseg.x1, h2, tseg.y1);
			tris.push(tseg.x2, h2, tseg.y2);
			
			colors.push(r1, g1, b1);
			colors.push(r1, g1, b1);
			colors.push(r1, g1, b1);
		}
	}
	
	/*
	for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
		var ssect = lumps.GL_SSECT[i];
		
		for(var j = 0; j < ssect.segNum; ++j) {
			var seg = lumps.GL_SEGS[ssect.firstSegIdx + j];
			var tseg = translateGlSeg(lumps, seg);

			if(seg.linedefIdx !== 0xFFFF) {
				var linedef = lumps.LINEDEFS[seg.linedefIdx];
				var sec1 = linedef.posSidedefIdx !== 65535 ? findLinedefSector(lumps, linedef, 0) : null;
				var sec2 = linedef.negSidedefIdx !== 65535 ? findLinedefSector(lumps, linedef, 1) : null;
				var x1 = tseg.x1;
				var y1 = tseg.y1;
				var x2 = tseg.x2;
				var	y2 = tseg.y2;
		
				if(!sec1)
					pushWall(tris, colors, x1, y1, x2, y2, sec2.floorHeight, sec2.ceilHeight);
				else if(!sec2)
					pushWall(tris, colors, x1, y1, x2, y2, sec1.floorHeight, sec1.ceilHeight);
				else {
					pushWall(tris, colors, x1, y1, x2, y2, Math.min(sec1.floorHeight, sec2.floorHeight), Math.max(sec1.floorHeight, sec2.floorHeight));
					pushWall(tris, colors, x1, y1, x2, y2, Math.min(sec1.ceilHeight, sec2.ceilHeight), Math.max(sec1.ceilHeight, sec2.ceilHeight));
				}
			}
		}
	}*/
	
	for(i = 0; i < lumps.LINEDEFS.length; ++i) {
		var linedef = lumps.LINEDEFS[i];
		var sec1 = linedef.posSidedefIdx !== 0xFFFF ? findLinedefSector(lumps, linedef, 0) : null;
		var sec2 = linedef.negSidedefIdx !== 0xFFFF ? findLinedefSector(lumps, linedef, 1) : null;
		
		var x1, y1, x2, y2;
		x1 = lumps.VERTEXES[linedef.v1Idx].x;
		y1 = lumps.VERTEXES[linedef.v1Idx].y;
		x2 = lumps.VERTEXES[linedef.v2Idx].x;
		y2 = lumps.VERTEXES[linedef.v2Idx].y;
		
		if(!sec1)
			pushWall(tris, colors, x1, y1, x2, y2, sec2.floorHeight, sec2.ceilHeight);
		else if(!sec2)
			pushWall(tris, colors, x1, y1, x2, y2, sec1.floorHeight, sec1.ceilHeight);
		else {
			pushWall(tris, colors, x1, y1, x2, y2, Math.min(sec1.floorHeight, sec2.floorHeight), Math.max(sec1.floorHeight, sec2.floorHeight));
			pushWall(tris, colors, x1, y1, x2, y2, Math.min(sec1.ceilHeight, sec2.ceilHeight), Math.max(sec1.ceilHeight, sec2.ceilHeight));
		}
	}
	
	mesh.setCoords(tris);
	mesh.setColors(colors);
	
	return mesh;
}

function findSubsector(lumps, idx, point) {
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
            return findSubsector(lumps, node.leftChildIdx, point);
        else
            return findSubsector(lumps, node.rightChildIdx, point);
    }
}

function findSector(lumps, idx, point) {
	var ssector = findSubsector(lumps, idx, point);
	var seg = lumps.SEGS[ssector.firstSegIdx];
    var linedef = lumps.LINEDEFS[seg.linedefIdx];
    var sidedef = seg.side ? lumps.SIDEDEFS[linedef.negSidedefIdx] : lumps.SIDEDEFS[linedef.posSidedefIdx];
    return lumps.SECTORS[sidedef.sectorIdx];
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

var posX = 1032;
var posY = -3200;
var velX = 0;
var velY = 0;
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
oReq.open("GET", "/e1m1.wad", true);
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



function segSide(lumps, seg, point) {
	var v1 = lumps.VERTEXES[seg.v1Idx];
	var v2 = lumps.VERTEXES[seg.v2Idx];
	var nx = -(v2.y - v1.y);
	var ny = v2.x - v1.x;
	var dx = point.x - v1.x;
	var dy = point.y - v1.y;
	
	return dx*nx + dy*ny < 0 ? -1 : 1;
}

function insideSubector(lumps, subsec, point) {
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

function leavingSector(lumps, pos1, pos2) {
	var oldSub = findSubsector(lumps, lumps.NODES.length - 1, pos1);
	var newSub = findSubsector(lumps, lumps.NODES.length - 1, pos2);
	
	//console.log(oldSub, newSub);
	/*
	if(oldSub === newSub) {
		for(var i = 0; i < oldSub.segNum; ++i) {
			var seg = lumps.SEGS[oldSub.firstSegIdx + i];
			var linedef = lumps.LINEDEFS[seg.linedefIdx];
			
			if(linedef.posSidedefIdx === 0xFFFF || linedef.negSidedefIdx === 0xFFFF) {
				if(segSide(lumps, seg, pos1) !== segSide(lumps, seg, pos2))
					return true;
			}
		}
	}*/
	
	return insideSubector(lumps, oldSub, pos1) && !insideSubector(lumps, newSub, pos2);
	//return false;
}




function renderLoop() {
	var dt = 1/60;
	var moveSpeed = 50;
	var newPosX, newPosY;
	
	//console.log(keystates);
	
	//if(keystates["LeftShift"]) {
	//	moveSpeed
	//}
	moveSpeed = keystates["e"] ? 5 : 50;
	
	if(keystates["w"]) {
		velX += moveSpeed * Math.cos(yaw);
		velY += moveSpeed * Math.sin(yaw);
	}
	
	if(keystates["s"]) {
		velX += -moveSpeed * Math.cos(yaw);
		velY += -moveSpeed * Math.sin(yaw);
	}
	
	if(keystates["d"]) {
		velX += -moveSpeed * Math.sin(yaw);
		velY += moveSpeed * Math.cos(yaw);
	}
		
	if(keystates["a"]) {
		velX += moveSpeed * Math.sin(yaw);
		velY += -moveSpeed * Math.cos(yaw);
	}
	
	var newPosX = posX + velX * dt;
	var newPosY = posY + velY * dt;
	
	
	
	var oldSec = findSector(lumps, lumps.NODES.length - 1, {x: posX, y: posY});
	var newSec = findSector(lumps, lumps.NODES.length - 1, {x: newPosX, y: newPosY});
	
	var h1 = oldSec.floorHeight;
	
	//if(leavingSector(lumps, {x: posX, y: posY}, {x: newPosX, y: newPosY}))
		//console.log("ZOOOMG!!!");
	
	//if(oldSec != newSec)
		//console.log("Changed sectors: ", oldSec, newSec);
	
	if((!leavingSector(lumps, {x: posX, y: posY}, {x: newPosX, y: newPosY}) &&
		newSec.floorHeight - h1 < 30 && newSec.ceilHeight > h1 + 60) || keystates["q"]) {
		posX = newPosX;
		posY = newPosY;
	}
	
	velX *= 0.9;
	velY *= 0.9;
	
	if(keystates["ArrowLeft"])
		yaw -= 3 * dt;
	if(keystates["ArrowRight"])
		yaw += 3 * dt;
	if(keystates["ArrowUp"])
		pitch -= 3 * dt;
	if(keystates["ArrowDown"])
		pitch += 3 * dt;
	
	var posH = findSector(lumps, lumps.NODES.length - 1, {x: posX, y: posY}).floorHeight + 40;
	
	
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
	var cameraMatrix =  m4.translation(posX, posH, posY);
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