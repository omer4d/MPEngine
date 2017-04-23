define([], function() {
	function Vector3(x, y, z) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}
	
	return Vector3;
});