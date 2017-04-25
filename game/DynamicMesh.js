define([], function() {
	function DynamicMesh(gl, vertexCap) {
		this.gl = gl;
		
		this.vertexCap = vertexCap;
		this.coordIdx = 0;
		this.colorIdx = 0;
		this.texCoordIdx = 0;
		
		this.coordData = new Float32Array(vertexCap * 3);
		this.coordBuff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.coordBuff);
		gl.bufferData(gl.ARRAY_BUFFER, this.coordData.length, gl.DYNAMIC_DRAW);
		
		this.colorData = new Uint8Array(vertexCap * 3);
		this.colorBuff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuff);
		gl.bufferData(gl.ARRAY_BUFFER, this.colorData.length, gl.DYNAMIC_DRAW);
		
		this.texCoordData = new Float32Array(vertexCap * 2);
		this.texCoordBuff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuff);
		gl.bufferData(gl.ARRAY_BUFFER, this.texCoordData.length, gl.DYNAMIC_DRAW);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
	
	DynamicMesh.prototype.begin = function() {
		this.coordIdx = 0;
		this.colorIdx = 0;
		this.texCoordIdx = 0;
	};
	
	DynamicMesh.prototype.coord = function(x, y, z) {
		this.coordData[this.coordIdx + 0] = x;
		this.coordData[this.coordIdx + 1] = y;
		this.coordData[this.coordIdx + 2] = z;
		this.coordIdx += 3;
	};
	
	DynamicMesh.prototype.color = function(r, g, b) {
		this.colorData[this.colorIdx + 0] = r;
		this.colorData[this.colorIdx + 1] = g;
		this.colorData[this.colorIdx + 2] = b;
		this.colorIdx += 3;
	};
	
	DynamicMesh.prototype.texCoord = function(u, v) {
		this.texCoordData[this.texCoordIdx + 0] = u;
		this.texCoordData[this.texCoordIdx + 1] = v;
		this.texCoordIdx += 2;
	};
	
	DynamicMesh.prototype.flush = function(locations) {
		if(this.coordIdx === 0)
			return;
		
		var gl = this.gl;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.coordBuff);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.coordData.subarray(0, this.coordIdx)); 
		gl.enableVertexAttribArray(locations.coords);
		gl.vertexAttribPointer(locations.coords, 3, gl.FLOAT, false, 0, 0);
		
		if(locations.colors) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuff);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colorData.subarray(0, this.colorIdx)); 
			gl.enableVertexAttribArray(locations.colors);
			gl.vertexAttribPointer(locations.colors, 3, gl.UNSIGNED_BYTE, true, 0, 0);
		}
		
		if(locations.texCoords) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuff);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.texCoordData.subarray(0, this.texCoordIdx)); 
			gl.enableVertexAttribArray(locations.texCoords);
			gl.vertexAttribPointer(locations.texCoords, 2, gl.FLOAT, false, 0, 0);
		}
		
		gl.drawArrays(gl.TRIANGLES, 0, this.coordIdx / 3);
	};
	
	DynamicMesh.prototype.end = function() {
		this.flush();
	};
	
	return DynamicMesh;
});