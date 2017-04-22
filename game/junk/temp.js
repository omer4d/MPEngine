function wadToMesh(lumps) {
	var mesh = new Renderer.Mesh();
	var tris = {};
	var colors = {};
	var texcoords = {};

	var initTex = function(name) {
		tris[name] = tris[name] || [];
		colors[name] = colors[name] || [];
		texcoords[name] = texcoords[name] || [];
	};
	
	var pushWall = function(name, x1, y1, x2, y2, h1, h2) {
		tris[name] = tris[name] || [];
		colors[name] = colors[name] || [];
		texcoords[name] = texcoords[name] || [];
		
		var nx = y1 - y2, ny = x2 - x1;
		var len = Math.sqrt(nx*nx + ny*ny);
		var r = Math.floor((nx / len + 1) / 2 * 128 + 127);
		var g = Math.floor((ny / len + 1) / 2 * 128 + 127);
		
		var tris = tris[name];
		var colors = colors[name];
		var texcoords = texcoords[name];
		
		tris.push(x1, h1, y1);
		tris.push(x1, h2, y1);
		tris.push(x2, h1, y2);
		
		texcoords.push(0, 0);
		texcoords.push(0, 1);
		texcoords.push(1, 0);
			
		tris.push(x1, h2, y1);
		tris.push(x2, h2, y2);
		tris.push(x2, h1, y2);
		
		texcoords.push(0, 1);
		texcoords.push(1, 1);
		texcoords.push(1, 0);
		
		colors.push(r, g, 0);
		colors.push(r, g, 0);
		colors.push(r, g, 0);
		
		colors.push(r, g, 0);
		colors.push(r, g, 0);
		colors.push(r, g, 0);
	}
	
	for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
		var ssect = lumps.GL_SSECT[i];
		var seg = lumps.GL_SEGS[ssect.firstSegIdx];
		var tseg = translateGlSeg(lumps, seg);
		var x0 = tseg.x1, y0 = tseg.y1;
		var sector = findSegSector(lumps, seg);
		var h1 = sector.floorHeight;
		var h2 = sector.ceilHeight;
		
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
			
			// floor
			initTex(sector.floorTexName);
			
			tris[sector.floorTexName].push(x0, h1, y0);
			tris[sector.floorTexName].push(tseg.x1, h1, tseg.y1);
			tris[sector.floorTexName].push(tseg.x2, h1, tseg.y2);
			
			texcoords[sector.floorTexName].push(x0 / 64, y0 / 64);
			texcoords[sector.floorTexName].push(tseg.x1 / 64, tseg.y1 / 64);
			texcoords[sector.floorTexName].push(tseg.x2 / 64, tseg.y2 / 64);
			
			colors[sector.floorTexName].push(r1, g1, b1);
			colors[sector.floorTexName].push(r1, g1, b1);
			colors[sector.floorTexName].push(r1, g1, b1);
			
			// ceil
			
			initTex(sector.ceilTexName);
			
			tris[sector.ceilTexName].push(x0, h2, y0);
			tris[sector.ceilTexName].push(tseg.x1, h2, tseg.y1);
			tris[sector.ceilTexName].push(tseg.x2, h2, tseg.y2);
			
			texcoords[sector.ceilTexName].push(x0 / 64, y0 / 64);
			texcoords[sector.ceilTexName].push(tseg.x1 / 64, tseg.y1 / 64);
			texcoords[sector.ceilTexName].push(tseg.x2 / 64, tseg.y2 / 64);
			
			colors[sector.ceilTexName].push(r1, g1, b1);
			colors[sector.ceilTexName].push(r1, g1, b1);
			colors[sector.ceilTexName].push(r1, g1, b1);
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
		
		var sidedef1 = linedef.posSidedefIdx !== 0xFFFF ? lumps.SIDEDEFS[linedef.posSidedefIdx] : null;
		var sidedef2 = linedef.negSidedefIdx !== 0xFFFF ? lumps.SIDEDEFS[linedef.negSidedefIdx] : null;
		
		var sec1 = sidedef1 ? lumps.SECTORS[sidedef1.sectorIdx] : null;
		var sec2 = sidedef2 ? lumps.SECTORS[sidedef2.sectorIdx] : null;
		
		var x1 = lumps.VERTEXES[linedef.v1Idx].x;
		var y1 = lumps.VERTEXES[linedef.v1Idx].y;
		var x2 = lumps.VERTEXES[linedef.v2Idx].x;
		var y2 = lumps.VERTEXES[linedef.v2Idx].y;
		
		if(!sidedef1)
			pushWall(sidedef2.midTexName, x1, y1, x2, y2, sec2.floorHeight, sec2.ceilHeight);
		else if(!sec2)
			pushWall(sidedef1.midTexName, x1, y1, x2, y2, sec1.floorHeight, sec1.ceilHeight);
		else {
			if(sec1.floorHeight < sec2.floorHeight)
				pushWall(sidedef1.lowTexName, x1, y1, x2, y2, sec1.floorHeight, sec2.floorHeight);
			else
				pushWall(sidedef2.lowTexName, x1, y1, x2, y2, sec2.floorHeight, sec1.floorHeight);

			if(sec1.ceilHeight > sec2.ceilHeight)
				pushWall(sidedef2.midTexName, x1, y1, x2, y2, sec2.ceilHeight, sec1.ceilHeight);
			else
				pushWall(sidedef1.midTexName, x1, y1, x2, y2, sec1.ceilHeight, sec2.ceilHeight);
		}
	}
	
	var jointTris = [];
	var jointColors = [];
	var jointTexCoords = [];
	
	Object.keys(tris).forEach(function(key) {
		Array.prototype.push.apply(jointTris, tris[key]);
	});
	
	Object.keys(colors).forEach(function(key) {
		Array.prototype.push.apply(jointColors, colors[key]);
	});
	
	Object.keys(texcoords).forEach(function(key) {
		Array.prototype.push.apply(jointTexCoords, texcoords[key]);
	});
	
	mesh.setCoords(jointTris);
	mesh.setColors(jointColors);
	mesh.setTexCoords(jointTexCoords);
	
	return mesh;
}