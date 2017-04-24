define([], function() {
	function Vector3(x, y, z) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}
	
	Vector3.prototype.normalize = function() {
		var len = this.length();
		if(len > 0) {
			this.x /= len;
			this.y /= len;
			this.z /= len;
		}
	};
	
	Vector3.prototype.length = function() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	};
	
	Vector3.prototype.dot = function(v) {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	};
	
	Vector3.prototype.clone = function() {
		return new Vector3(this.x, this.y, this.z);
	};
	
	return Vector3;
});