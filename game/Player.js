define(["GameConsts", "Vector3"], function(g, Vector3) {
	function Player(x, y, z) {
		this.flags = g.F_SOLID | g.F_DYNAMIC | g.F_PLAYER;
		
		this.oldPos = new Vector3(x, y, z);
		this.pos = new Vector3(x, y, z);
		this.vel = new Vector3();
		this.inactiveFrames = 0;
		this.rad = 25;
		
		this.angles = new Vector3();
		this.moveDir = new Vector3();
		this.oldMoveDir = new Vector3();
		this.oldLookDir = new Vector3();
		this.grounded = false;
		this.bufferedJumps = 0;
	}
	
	Player.prototype.xzSpeed = function() {
		return Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
	};
	
	return Player;
});