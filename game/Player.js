define([Vector3], function(vec3) {
	function Player(x, y, z) {
		this.id = 0;
		this.flags = 0;
		this.pos = vec3(x, y, z);
		this.vel = vec3();
		this.angles = vec3();
	}
	
	return Player;
});