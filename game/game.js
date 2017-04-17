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
var context = canvas.getContext("2d");

var wadStructs = (function() {
	var char = "int8";
	var short = "int16";
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
				[short, ["light", "type", "tag"]]
			]
		},
		{
			name: "SIDEDEFS",
			fields: [
				[short, ["xOffs", "yOffs"]],
				[name, ["hiTexName", "lowTexName", "midTexName"]],
				[short, "sectorIdx"]
			]
		},
		{
			name: "LINEDEFS",
			fields: [
				[short, ["v1Idx", "v2Idx"]],
				[short, ["flags", "specialFlag", "sectorTag"]],
				[short, ["posSidedefIdx", "negSidedefIdx"]]
			]
		},
		{
			name: "SEGS",
			fields: [
				[short, ["v1Idx", "v2Idx"]],
				[short, "angle"],
				[short, "linedefIdx"],
				[short, "dir"],
				[short, "offsOnLinedef"]
			]
		},
		{
			name: "SSECTORS",
			fields: [
				[short, "segNum"],
				[short, "firstSegIdx"]
			]
		}
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


console.log(genReader(wadStructs[0]));
console.log(structSize(wadStructs[3]));

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


var oReq = new XMLHttpRequest();
oReq.open("GET", "/zaza.wad", true);
oReq.responseType = "arraybuffer";


var lumps = {};

oReq.onload = function (oEvent) {
  var arrayBuffer = oReq.response;
  if (arrayBuffer) {
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
			var n = dirs[i].lumpSize / structSize(findStruct(wadStructs, dirs[i].name));
			var lump = [];
			lumps[dirs[i].name] = lump;
			reader.setPos(dirs[i].lumpOffs);
			for(var j = 0; j < n; ++j) {
				lump.push(readers[dirs[i].name](reader, ctx));
			}
		}
	}
	
	console.log(lumps);
	renderLoop();
  }
};

oReq.send(null);



function renderLoop() {
	var i;
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	for(i = 0; i < lumps.SEGS.length; ++i) {
		var seg = lumps.SEGS[i];
		
		context.beginPath();
		context.moveTo(lumps.VERTEXES[seg.v1Idx].x / 5 + 256, lumps.VERTEXES[seg.v1Idx].y / 5 + 256);
		context.lineTo(lumps.VERTEXES[seg.v2Idx].x / 5 + 256, lumps.VERTEXES[seg.v2Idx].y / 5 + 256);
		context.stroke();
	}
	
	for(i = 0; i < lumps.VERTEXES.length; ++i) {
		context.beginPath();
		context.arc(lumps.VERTEXES[i].x / 5 + 256, lumps.VERTEXES[i].y / 5 + 256, 1, 0, 2 * Math.PI, false);
		context.fillStyle = "red";
		context.fill();
	}
	
	requestAnimFrame(renderLoop);
};