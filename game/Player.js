define(["GameConsts", "Vector3"], function(g, Vector3) {
	function Player(x, y, z) {
		this.flags = g.F_SOLID;
		this.pos = new Vector3(x, y, z);
		this.vel = new Vector3();
		this.angles = new Vector3();
		this.moveDir = new Vector3();
		this.oldMoveDir = new Vector3();
		this.oldLookDir = new Vector3();
		this.bufferedJumps = 0;
	}
	
	Player.prototype.xzSpeed = function() {
		return Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
	};
	
	return Player;
});