(function(Renderer) {
	var gl;
	
	function Mesh() {
		gl = Renderer.gl;
		
		this.coordBuff = null;
		this.colorBuff = null;
		this.indexBuff = null;
		
		this.vertexNum = 0;
		this.indexNum = 0;
	}

	Mesh.prototype.setCoords = function(coords) {
		if(this.coordBuff)
			gl.deleteBuffer(this.coordBuff);
		
		this.coordBuff = gl.createBuffer();
		this.vertexNum = coords.length / 3;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.coordBuff);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	Mesh.prototype.setColors = function(colors) {
		if(this.colorBuff)
			gl.deleteBuffer(this.colorBuff);
		
		this.colorBuff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuff);
		gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
	
	Mesh.prototype.setIndices = function(indices) {
		if(this.indexBuff)
			gl.deleteBuffer(this.indexBuff);
		
		this.indexBuff = gl.createBuffer();
		this.indexNum = indices.length;
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuff);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}
	
	Mesh.prototype.draw = function(locations) {
		gl.enableVertexAttribArray(locations.coords);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.coordBuff);
		gl.vertexAttribPointer(locations.coords, 3, gl.FLOAT, false, 0, 0);
		
		if(locations.colors) {
			gl.enableVertexAttribArray(locations.colors);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuff);
			gl.vertexAttribPointer(locations.colors, 3, gl.UNSIGNED_BYTE, true, 0, 0);
		}
		
		if(this.indexBuff) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuff);
			gl.drawElements(gl.TRIANGLES, this.indexNum, gl.UNSIGNED_SHORT, 0);
		}else {
			gl.drawArrays(gl.TRIANGLES, 0, this.vertexNum);
		}
	}
	
	Renderer.Mesh = Mesh;
})(window.Renderer = window.Renderer || {});