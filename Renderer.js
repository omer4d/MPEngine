// ************
// * Renderer *
// ************

function Renderer(canvas, context) {
    this.canvas = canvas;
    this.context = context;
}

function drawCircle(context, x, y, r, col) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = col;
    context.fill();
}

Renderer.prototype.render = function(entities) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	var keys = Object.keys(entities);
	
	for(var i = 0; i < keys.length; ++i) {
		var ent = entities[keys[i]];
		
		if(ent.schema === "ball")
			drawCircle(this.context, ent.pos.x, ent.pos.y, ent.r, "green");
		else
			drawCircle(this.context, ent.pos.x, ent.pos.y, 15, "blue");
	}
};