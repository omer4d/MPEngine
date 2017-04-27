define(["GameConsts", "Vector3"], function(g, Vector3) {
	function StaticProp(thingCode, x, y, z, rad) {
		this.thingCode = thingCode;
		this.flags = rad > 0 ? g.F_SOLID : 0;
		this.pos = new Vector3(x, y, z);
		this.rad = rad;
	}
	
	return StaticProp;
});