define(["Mesh", "Wad"], function(Mesh, Wad) {
	var DEBUG_SHOW_SUBSECTORS = false;
	var DEBUG_SHOW_GRID = false;
	
	function wadToMesh(gl, level, texMan) {
		var lumps = level.lumps;
		var mesh = new Mesh(gl);
		var tris = {};
		var colors = {};
		var texcoords = {};

		var initTex = function(name) {
			tris[name] = tris[name] || [];
			colors[name] = colors[name] || [];
			texcoords[name] = texcoords[name] || [];
		};
		
		var pushWall = function(name, alignTop, x1, y1, x2, y2, h1, h2, sidedef, texTop) {
			tris[name] = tris[name] || [];
			colors[name] = colors[name] || [];
			texcoords[name] = texcoords[name] || [];
			
			var offsU = sidedef.xOffs;
			var	offsV = sidedef.yOffs;
			
			var nx = y1 - y2, ny = x2 - x1;
			var dw = Math.sqrt(nx*nx + ny*ny);
			var dh = h2 - h1;
			
			var lightDirX = 1;
			var lightDirY = 0.5;
			var lightDirLen = Math.sqrt(lightDirX*lightDirX + lightDirY*lightDirY);
			lightDirX /= lightDirLen;
			lightDirY /= lightDirLen;
			nx /= dw;
			ny /= dw;
			
			var dp = 1;// 1.1 - 0.1 * Math.max(lightDirX*nx + lightDirY * ny, 0);
			
			var r = Math.floor(lumps.SECTORS[sidedef.sectorIdx].light * dp);//200 + Math.floor(55*dp); //Math.floor((nx / len + 1) / 2 * 128 + 127);
			var g = Math.floor(lumps.SECTORS[sidedef.sectorIdx].light * dp);//200 + Math.floor(55*dp); //Math.floor((ny / len + 1) / 2 * 128 + 127);
			var b = Math.floor(lumps.SECTORS[sidedef.sectorIdx].light * dp);//200 + Math.floor(55*dp);
			
			var tr = tris[name];
			var col = colors[name];
			var tex = texcoords[name];
			
			var tw = texMan.get(name) ? texMan.get(name).width : 64;
			var th = texMan.get(name) ? texMan.get(name).height : 64;
			
			var u0 = offsU / tw;
			var u1 = (dw + offsU)/tw;
			var v0 = (alignTop ? 1-dh/th : 0) - ((texTop ? texTop - h2 : 0) + offsV)/th;
			var v1 = (alignTop ? 1 : dh/th) - ((texTop ? texTop - h2 : 0) + offsV)/th;
			
			tr.push(x1, h1, y1);
			tr.push(x1, h2, y1);
			tr.push(x2, h1, y2);
			
			tex.push(u0, v0);
			tex.push(u0, v1);
			tex.push(u1, v0);
			
			tr.push(x1, h2, y1);
			tr.push(x2, h2, y2);
			tr.push(x2, h1, y2);
			
			tex.push(u0, v1);
			tex.push(u1, v1);
			tex.push(u1, v0);
			
			
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);
			
			/*
			tr.push(x1, h1, y1);
			tr.push(x1, h2, y1);
			tr.push(x2, h1, y2);
			
			tex.push(0, 0);
			tex.push(0, dh/th);
			tex.push(dw/tw, 0);
			
			tr.push(x1, h2, y1);
			tr.push(x2, h2, y2);
			tr.push(x2, h1, y2);
			
			tex.push(0, dh/th);
			tex.push(dw/tw, dh/th);
			tex.push(dw/tw, 0);
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);
			
			col.push(r, g, b);
			col.push(r, g, b);
			col.push(r, g, b);*/
		}
		
		for(var i = 0; i < lumps.GL_SSECT.length; ++i) {
			var ssect = lumps.GL_SSECT[i];
			var seg = lumps.GL_SEGS[ssect.firstSegIdx];
			var tseg = level.translateGlSeg(seg);
			var x0 = tseg.x1, y0 = tseg.y1;
			var sector = level.findSegSector(seg);
			var h1 = sector.floorHeight;
			var h2 = sector.ceilHeight;
			
			var r, g, b;
			
			if(DEBUG_SHOW_SUBSECTORS) {
				r = Math.floor(Math.random() * 100 + 100);
				g = Math.floor(Math.random() * 100 + 100);
				b = Math.floor(Math.random() * 100 + 100);
			}else {
				r = sector.light;
				g = sector.light;
				b = sector.light;
			}
			
			for(var j = 1; j < ssect.segNum - 1; ++j) {
				var seg = lumps.GL_SEGS[ssect.firstSegIdx + j];
				var tseg = level.translateGlSeg(seg);
				var br = 0.8 + Math.random() * 0.2;
				
				var r1 = Math.floor(r);
				var g1 = Math.floor(g);
				var b1 = Math.floor(b);
				
				//var r1 = r;//255;//
				//var g1 = r;//255;//
				//var b1 = r;//255;//
				
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
				var tseg = level.translateGlSeg(seg);

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
			
			var lu = linedef.flags & Wad.LOWER_UNPEGGED;
			var uu = linedef.flags & Wad.UPPER_UNPEGGED;
			
			if(!sidedef1)
				pushWall(sidedef2.midTexName, !lu, x1, y1, x2, y2, sec2.floorHeight, sec2.ceilHeight, sidedef2);
			else if(!sec2)
				pushWall(sidedef1.midTexName, !lu, x1, y1, x2, y2, sec1.floorHeight, sec1.ceilHeight, sidedef1);
			else {
				if(sec1.floorHeight < sec2.floorHeight)
					pushWall(sidedef1.lowTexName, true, x1, y1, x2, y2, sec1.floorHeight, sec2.floorHeight,
								sidedef1, lu ? Math.max(sec1.ceilHeight, sec2.ceilHeight) : undefined);
				else
					pushWall(sidedef2.lowTexName, true, x1, y1, x2, y2, sec2.floorHeight, sec1.floorHeight,
								sidedef2, lu ? Math.max(sec1.ceilHeight, sec2.ceilHeight) : undefined);

				
				if(sec1.ceilHeight > sec2.ceilHeight)
					pushWall(sec2.ceilTexName === "F_SKY1" ? "F_SKY1" : sidedef1.hiTexName, uu, x1, y1, x2, y2, sec2.ceilHeight, sec1.ceilHeight, sidedef1);
				else
					pushWall(sec1.ceilTexName === "F_SKY1" ? "F_SKY1" : sidedef2.hiTexName, uu, x1, y1, x2, y2, sec1.ceilHeight, sec2.ceilHeight, sidedef2);
			}
		}
		
		var submeshes = [];
		var triTexList = Object.keys(tris);
		
		var jointTris = [];
		var jointColors = [];
		var jointTexCoords = [];
		
		triTexList.forEach(function(key) {
			if(key === "F_SKY1")
				return;
			
			submeshes.push({tex: texMan.get(key) ? texMan.get(DEBUG_SHOW_GRID ? "debug_grid" : key).handle : null,
								start: jointTris.length/3, len: tris[key].length/3});
			Array.prototype.push.apply(jointTris, tris[key]);
		});
		
		triTexList.forEach(function(key) {
			if(key === "F_SKY1")
				return;
			Array.prototype.push.apply(jointColors, colors[key]);
		});
		
		triTexList.forEach(function(key) {
			if(key === "F_SKY1")
				return;
			Array.prototype.push.apply(jointTexCoords, texcoords[key]);
		});
		
		mesh.setCoords(jointTris);
		mesh.setColors(jointColors);
		mesh.setTexCoords(jointTexCoords);
		
		return {
			mesh: mesh,
			submeshes: submeshes,
		};
	}
	
	function LevelMesh(gl, level, texMan) {
		var tmp = wadToMesh(gl, level, texMan);
		this.gl = gl;
		this.mesh = tmp.mesh;
		this.submeshes = tmp.submeshes;
		this.missingTexHandle = texMan.get("error_missing_texture").handle;
	}
	
	LevelMesh.prototype.draw = function() {
		var gl = this.gl;
		
		for(var i = 0; i < this.submeshes.length; ++i) {
			 if(this.submeshes[i].tex)
				gl.bindTexture(gl.TEXTURE_2D, this.submeshes[i].tex);
			else
				gl.bindTexture(gl.TEXTURE_2D, this.missingTexHandle);
			this.mesh.draw(levelLocations, this.submeshes[i].start, this.submeshes[i].len);
		 }
	}
	
	return LevelMesh;
});