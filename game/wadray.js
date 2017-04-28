	var Wad = {};
	
	var wadStructs = (function() {
		var char = "int8";
		var short = "int16";
		var ushort = "uint16";
		var int = "int32";
		var name = ["int8", 8, {transform: "nameToString"}];

		return [
			{
				name: "WAD_HEADER",
				fields: [
					[[char, 4], "id"],
					[int, "lumpNum"],
					[int, "dirOffs"]
				]
			},
			{
				name: "WAD_DIRENT",
				fields: [
					[int, "lumpOffs"],
					[int, "lumpSize"],
					[name, "name"]
				]
			},
			{
				name: "VERTEXES",
				fields: [
					[short, "x"],
					[short, "y"]
				]
			},
			{
				name: "SECTORS",
				fields: [
					[short, ["floorHeight", "ceilHeight"]],
					[name, ["floorTexName", "ceilTexName"]],
					[short, "light"],
					[ushort, ["special", "tag"]]
				]
			},
			{
				name: "SIDEDEFS",
				fields: [
					[short, ["xOffs", "yOffs"]],
					[name, ["hiTexName", "lowTexName", "midTexName"]],
					[ushort, "sectorIdx"]
				]
			},
			{
				name: "LINEDEFS",
				fields: [
					[ushort, ["v1Idx", "v2Idx"]],
					[ushort, ["flags", "specialFlag", "sectorTag"]],
					[ushort, ["posSidedefIdx", "negSidedefIdx"]]
				]
			},
			{
				name: "SEGS",
				fields: [
					[ushort, ["v1Idx", "v2Idx"]],
					[short, "angle"],
					[ushort, "linedefIdx"],
					[short, "side"],
					[short, "offsOnLinedef"]
				]
			},
			{
				name: "SSECTORS",
				fields: [
					[short, "segNum"],
					[short, "firstSegIdx"]
				]
			},
			{
				name: "GL_VERT",
				fields: [
					[int, "x"],
					[int, "y"]
				]
			},
			{
				name: "GL_SEGS",
				fields: [
					[ushort, ["v1Idx", "v2Idx"]],
					[ushort, "linedefIdx"],
					[ushort, "side"],
					[ushort, "partnerSeg"]
				]
			},
			{
				name: "GL_SSECT",
				fields: [
					[ushort, "segNum"],
					[ushort, "firstSegIdx"]
				]
			},
			{
				name: "GL_NODES",
				fields: [
					[short, ["x", "y", "dx", "dy"]],
					[[short, 4], ["rightAABB", "leftAABB"]],
					[ushort, ["rightChildIdx", "leftChildIdx"]]
				]
			},
			{
				name: "NODES",
				fields: [
					[short, ["x", "y", "dx", "dy"]],
					[[short, 4], ["rightAABB", "leftAABB"]],
					[ushort, ["rightChildIdx", "leftChildIdx"]]
				]
			},
		];
	})();

	function BufferReader(buffer) {
	  this.dataView = new DataView(buffer);
	  this.pos = 0;
	}

	BufferReader.prototype.readInt8 = function() {
	  var res = this.dataView.getInt8(this.pos, true);
	  this.pos += 1;
	  return res;
	};

	BufferReader.prototype.readInt16 = function() {
	  var res = this.dataView.getInt16(this.pos, true);
	  this.pos += 2;
	  return res;
	};

	BufferReader.prototype.readUint16 = function() {
	  var res = this.dataView.getUint16(this.pos, true);
	  this.pos += 2;
	  return res;
	};

	BufferReader.prototype.readInt32 = function() {
	  var res = this.dataView.getInt32(this.pos, true);
	  this.pos += 4;
	  return res;
	};

	BufferReader.prototype.setPos = function(bytes) {
		this.pos = bytes;
	}

	BufferReader.prototype.eof = function() {
		return this.pos >= this.dataView.byteLength;
	}

	function genReader(struct) {
	  var code = "(function(reader, ctx) {\n";
	  code += "var obj = {};\n";
	  
	  for(var i = 0; i < struct.fields.length; ++i) {
		var field = struct.fields[i];
		var fieldType = field[0].constructor === Array ? field[0][0] : field[0];
		var elementCount = field[0].constructor === Array ? field[0][1] : 0;
		var fieldNames = field[1].constructor === Array ? field[1] : [field[1]];
		var readcall;
		
		switch(fieldType) {
		  case "int8":
			readcall = "reader.readInt8()";
			break;
		  case "int16":
			readcall = "reader.readInt16()";
			break;
		  case "uint16":
			readcall = "reader.readUint16()";
			break;
		  case "int32":
			readcall = "reader.readInt32()";
			break;
		  default:
			throw "WTF!";
		}
		
		for(var j = 0; j < fieldNames.length; ++j) {
			var val = "";
			
			if(elementCount) {
			  val += "[";
			  
			  for(var k = 0; k < elementCount; ++k) {
				val += readcall + ",\n";
			  }
			  val += "]";
			}else {
			  val += readcall;
			}
			
			if(field[0].constructor === Array && field[0][2] && field[0][2].transform)
				val = "ctx." + field[0][2].transform + "(" + val + ")";
			
			code += "obj['" + fieldNames[j] + "'] = " + val + ";\n";
		}
	  }
	  
	  return code + "\nreturn obj;\n})";
	}

	function structSize(struct) {
	  var total = 0;
		
	  for(var i = 0; i < struct.fields.length; ++i) {
		var fieldEntry = struct.fields[i];
		var fieldType = fieldEntry[0].constructor === Array ? fieldEntry[0][0] : fieldEntry[0];
		var elementCount = fieldEntry[0].constructor === Array ? fieldEntry[0][1] : 1;
		var fieldNum = fieldEntry[1].constructor === Array ? fieldEntry[1].length : 1;
		var typeBytes;
		
		switch(fieldType) {
		  case "int8":
			typeBytes = 1;
			break;
		  case "int16":
			typeBytes = 2;
			break;
		  case "uint16":
			typeBytes = 2;
			break;
		  case "int32":
			typeBytes = 4;
			break;
		  default:
			throw "WTF!";
		}
		
		total += typeBytes * fieldNum * elementCount;
	  }
	  
	  return total;
	}

	function genReaders(structs) {
	  var readers = {};
	  for(var i = 0; i < structs.length; ++i) {
		readers[structs[i].name] = eval(genReader(structs[i]));
	  }
	  return readers;
	}

	function findStruct(structs, name) {
		for(var i = 0; i < structs.length; ++i)
			if(structs[i].name === name)
				return structs[i];
		return null;
	}

	readers = genReaders(wadStructs);

	Wad.read = function(arrayBuffer) {
		var lumps = {};
		var reader = new BufferReader(arrayBuffer);
		var ctx = {
			nameToString: function(x) {
				for(var i = 0; i < 8; ++i)
					if(x[i] === 0)
						break;
				return String.fromCharCode.apply(null, x.slice(0, i));
			}
		};
		var header = readers.WAD_HEADER(reader, ctx);
		var dirs = [];
		
		reader.setPos(header.dirOffs);
		console.log(header);
		
		while(!reader.eof()) {
			var dir = readers.WAD_DIRENT(reader, ctx);
			dirs.push(dir);
			console.log(dir);
		}
		
		for(var i = 0; i < dirs.length; ++i) {
			if(readers[dirs[i].name]) {
				reader.setPos(dirs[i].lumpOffs);
				
				var n;
				
				if(dirs[i].name === "GL_VERT") {
					var verBytes = [reader.readInt8(), reader.readInt8(), reader.readInt8(), reader.readInt8()];
					var ver = String.fromCharCode.apply(null, verBytes);
					if(ver !== "gNd2")
						throw "Unsupported glBsp version: " + ver;
					n = (dirs[i].lumpSize - 4) / structSize(findStruct(wadStructs, dirs[i].name));
				}
				else {
					n = dirs[i].lumpSize / structSize(findStruct(wadStructs, dirs[i].name));
				}
				
				var lump = [];
				lumps[dirs[i].name] = lump;
				
				for(var j = 0; j < n; ++j) {
					lump.push(readers[dirs[i].name](reader, ctx));
				}
			}
		}
		
		return lumps;
	}
	
	Wad.UPPER_UNPEGGED = 0x0008;
	Wad.LOWER_UNPEGGED = 0x0010;



















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
oReq.open("GET", "data/e1m2.wad", true);
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

function rayVsAABB(ray, box) {
	var nx = -ray.dirY;
	var ny = ray.dirX;
	var i1, i2;
	
	var minx = box[2], miny = box[1];
	var maxx = box[3], maxy = box[0];
	var p = ray.x * nx + ray.y * ny;
	
	if(nx * ny > 0) {
		i1 = minx * nx + miny * ny;
		i2 = maxx * nx + maxy * ny;
	}else {
		i1 = maxx * nx + miny * ny;
		i2 = minx * nx + maxy * ny;
	}
	
	var c1 = (i1 < i2) ? (p >= i1 && p <= i2) : (p >= i2 && p <= i1);
	var c2 = ray.dirX > 0 ? maxx >= ray.x : minx <= ray.x;
	var c3 = ray.dirY > 0 ? maxy >= ray.y : miny <= ray.y;
	
	return c1 && c2 && c3;
}

/*
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
}*/

var tests = 0;

/*
function raySubsectors(lumps, idx, ray) {
	var LEAF_FLAG = 1 << 15;
	
    if(idx & LEAF_FLAG) {
        return [lumps.GL_SSECT[idx & ~LEAF_FLAG]];
    }else {
        var node = lumps.GL_NODES[idx];
		var doLeft = rayVsAABB(ray, node.leftAABB);
		var doRight = rayVsAABB(ray, node.rightAABB);
		++tests;
		
		if(doLeft && doRight) {
			var nx = -node.dy;
			var ny = node.dx;
			var dx = ray.x - node.x;
			var dy = ray.y - node.y;
			
			if(nx*dx+ny*dy >= 0)
				return raySubsectors(lumps, node.leftChildIdx, ray).concat(raySubsectors(lumps, node.rightChildIdx, ray));
			else
				return raySubsectors(lumps, node.rightChildIdx, ray).concat(raySubsectors(lumps, node.leftChildIdx, ray));
		}
		else if(doLeft)
			return raySubsectors(lumps, node.leftChildIdx, ray);
		else if(doRight)
			return raySubsectors(lumps, node.rightChildIdx, ray);
		else
			return [];
    }
}*/

function raySubsectors(lumps, idx, ray) {
	var LEAF_FLAG = 1 << 15;
	
    if(idx & LEAF_FLAG) {
		var sub = lumps.GL_SSECT[idx & ~LEAF_FLAG];
		var tmin = 10000000;
		var res = null;
		
		for(var j = 0; j < sub.segNum; ++j) {
			var tseg = lumps.GL_SEGS[sub.firstSegIdx + j];

			if(tseg.linedefIdx !==  0xFFFF) {
				var out = {};
				var linedef = lumps.LINEDEFS[tseg.linedefIdx];
				var v1 = lumps.VERTEXES[linedef.v1Idx];
				var v2 = lumps.VERTEXES[linedef.v2Idx];
				var seg = {x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y};
				//var seg = translateGlSeg(lumps, tseg);
				
				if(rayVsSeg(ray, seg, out) && out.t >= 0 && out.t < tmin) {
					tmin = out.t;
					res = out;
				}
			}
		}
		
        return res;
    }else {
        var node = lumps.GL_NODES[idx];
		var doLeft = rayVsAABB(ray, node.leftAABB);
		var doRight = rayVsAABB(ray, node.rightAABB);
		++tests;
		
		if(doLeft && doRight) {
			var nx = -node.dy;
			var ny = node.dx;
			var dx = ray.x - node.x;
			var dy = ray.y - node.y;
			
			if(nx*dx+ny*dy >= 0)
				return raySubsectors(lumps, node.leftChildIdx, ray) || raySubsectors(lumps, node.rightChildIdx, ray);
			else
				return raySubsectors(lumps, node.rightChildIdx, ray) || raySubsectors(lumps, node.leftChildIdx, ray);
		}
		else if(doLeft)
			return raySubsectors(lumps, node.leftChildIdx, ray);
		else if(doRight)
			return raySubsectors(lumps, node.rightChildIdx, ray);
		else
			return null;
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

var ray = {
	x: 290,
	y: 300,
	dirX: 0,
	dirY: -1
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
	
	
	context.lineWidth = 2.0;
	for(i = 0; i < lumps.LINEDEFS.length; ++i) {
		var linedef = lumps.LINEDEFS[i];
		var v1 = lumps.VERTEXES[linedef.v1Idx];
		var v2 = lumps.VERTEXES[linedef.v2Idx];
		line(context, v1.x, v1.y, v2.x, v2.y, "black");
	}
	context.lineWidth = 1.0;
	
	// Draw node AABBs:
	var LEAF_FLAG = 1 << 15;
	
	
	/*
	for(var i = 0; i < lumps.GL_NODES.length; ++i) {
		var node = lumps.GL_NODES[i];
		context.beginPath();
		if(node.rightChildIdx & LEAF_FLAG)
			context.rect(node.rightAABB[2], node.rightAABB[0], node.rightAABB[3] - node.rightAABB[2], node.rightAABB[1] - node.rightAABB[0]);
		if(node.leftChildIdx & LEAF_FLAG)
			context.rect(node.leftAABB[2], node.leftAABB[0], node.leftAABB[3] - node.leftAABB[2], node.leftAABB[1] - node.leftAABB[0]);
		context.strokeStyle = "black";
		context.stroke();
	}*/
	
	tests = 0;
	
	/*
	var subs = raySubsectors(lumps, lumps.GL_NODES.length - 1, ray);
	//console.log(tests, lumps.GL_NODES.length);
	
	for(i = 0; i < subs.length; ++i) {
		context.lineWidth = 3.0;
		subsectorPath(context, lumps, subs[i]);
		context.strokeStyle = "blue";
		context.stroke();
		context.lineWidth = 1.0;
	}*/
	
	var res = raySubsectors(lumps, lumps.GL_NODES.length - 1, ray);
	console.log(tests, lumps.GL_NODES.length);
	
	if(res)
		circlefill(context, res.x, res.y, 3, "red");
	
	
	if(keystates["Spacebar"] || keystates[" "]) {
		ray.x = mouseX;
		ray.y = mouseY;
	}
	ray.dirX = mouseX - ray.x;
	ray.dirY = mouseY - ray.y;
	
	
	circlefill(context, ray.x, ray.y, 3, "red");
	line(context, ray.x, ray.y, ray.x + ray.dirX * 500, ray.y + ray.dirY * 500, "red");
	
	requestAnimationFrame(renderLoop);
};