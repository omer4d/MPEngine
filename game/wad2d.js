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
var context = canvas.getContext("2d");

var mouseX = 0, mouseY = 0;

var normalMouseMoveListener = function(e) {
	var r = canvas.getBoundingClientRect();
	mouseX = e.clientX - r.left;
	mouseY = e.clientY - r.top;
};

window.addEventListener('mousemove', normalMouseMoveListener);


	
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




function findSubsector(lumps, idx, point) {
	var LEAF_FLAG = 1 << 15;
	
    if(idx & LEAF_FLAG) {
        return lumps.GL_SSECT[idx & ~LEAF_FLAG];
    }else {
        var node = lumps.GL_NODES[idx];
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



function findCircleSubsector(lumps, idx, point, rad) {
	var LEAF_FLAG = 1 << 15;
	
    if(idx & LEAF_FLAG) {
        return [lumps.GL_SSECT[idx & ~LEAF_FLAG]];
    }else {
        var node = lumps.GL_NODES[idx];
        var nx = -node.dy;
		var ny = node.dx;
		var len = Math.sqrt(nx*nx + ny*ny);
		nx /= len;
		ny /= len;
		var dx = point.x - node.x;
		var dy = point.y - node.y;
		var dot = nx*dx+ny*dy;
		
        if(dot >= rad) {
            return findCircleSubsector(lumps, node.leftChildIdx, point, rad);
		}
        else if(dot <= -rad) {
            return findCircleSubsector(lumps, node.rightChildIdx, point, rad);
		}
		else {
			return findCircleSubsector(lumps, node.leftChildIdx, point, rad).concat(findCircleSubsector(lumps, node.rightChildIdx, point, rad));
		}
    }
}







function rgba(...args) {
	return "rgba(" + args.join(",") + ")";
}

function randomPastel() {
	var r = 0.8 + Math.random() * 0.2;
	var g = 0.8 + Math.random() * 0.2;
	var b = 0.8 + Math.random() * 0.2;
	return rgba(Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255), 255);
}


var colors = [];
for(var i = 0; i < 1000; ++i)
	colors.push(randomPastel());


var posX, posY;


function subsectorPath(context, lumps, ssector) {
	var seg = translateGlSeg(lumps, lumps.GL_SEGS[ssector.firstSegIdx]);
	
	context.beginPath();
	
	context.moveTo(seg.x1, seg.y1);
	
	for(var j = 1; j < ssector.segNum; ++j) {
		seg = translateGlSeg(lumps, lumps.GL_SEGS[ssector.firstSegIdx + j]);
		context.lineTo(seg.x1, seg.y1);
	}
	
	context.closePath();
}

function renderLoop() {
	var i;
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	for(i = 0; i < lumps.VERTEXES.length; ++i) {
		context.beginPath();
		context.arc(lumps.VERTEXES[i].x, lumps.VERTEXES[i].y, 1, 0, 2 * Math.PI, false);
		context.fillStyle = "red";
		context.fill();
	}
	
	for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
		subsectorPath(context, lumps, lumps.GL_SSECT[i]);
		context.fillStyle = colors[i];
		context.fill();
	}
	
	for(i = 0; i < lumps.LINEDEFS.length; ++i) {
		var linedef = lumps.LINEDEFS[i];
		var v1 = lumps.VERTEXES[linedef.v1Idx];
		var v2 = lumps.VERTEXES[linedef.v2Idx];
		line(context, v1.x, v1.y, v2.x, v2.y, "black");
	}
	
	circle(context, mouseX, mouseY, 15, "red");
	
	
	var subs = findCircleSubsector(lumps, lumps.GL_NODES.length - 1, {x: mouseX, y: mouseY}, 15);
	
	for(i = 0; i < subs.length; ++i) {
		subsectorPath(context, lumps, subs[i]);
		context.strokeStyle = "red";
		context.stroke();
	}
	
	
	requestAnimationFrame(renderLoop);
};