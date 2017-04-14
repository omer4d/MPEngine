// *************
// * GameState *
// *************

function GameState(netSpawn, arenaWidth, arenaHeight) {
	this.netSpawn = netSpawn;
    this.balls = [];
    this.players = [];
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
	
    for (var i = 0; i < 10; ++i) {
		this.addBall();
    }
}

GameState.prototype.addBall = function() {
	var ball = this.netSpawn("ball", {
		vel: vec2(randf(100, 300) * (randf() < 0.5 ? -1 : 1), randf(100, 300) * (randf() < 0.5 ? -1 : 1))
	});
	
	var r = randf(15, 30);
	ball.r = r;
	ball.pos.x = randf(r, this.arenaWidth - r);
	ball.pos.y = randf(r, this.arenaHeight - r);
	
	this.balls.push(ball);
	return ball;
};

GameState.prototype.addPlayer = function() {
	var r = 15;
    var player = this.netSpawn("player", {
        r: r,
		moveVec: vec2(0, 0),
        handleCommands: function(commands) {
			this.moveVec.x = commands.moveX;
			this.moveVec.y = commands.moveY;
			//movePlayer(this, 512, 512, 1/CLIENT_TICKRATE);
        }
    });

	player.vel.x = 0;
	player.vel.y = 0;
	player.pos.x = randf(r, this.arenaWidth - r);
	player.pos.y = randf(r, this.arenaHeight - r);
	
    this.players.push(player);
    return player;
};

function collisionTest(a, b) {
    var dx = b.pos.x - a.pos.x;
    var dy = b.pos.y - a.pos.y;
    var rsum = a.r + b.r;
    return dx * dx + dy * dy <= rsum * rsum;
}

function collisionResponse(a, b, bounciness) {
    var dx = b.pos.x - a.pos.x;
    var dy = b.pos.y - a.pos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var mtd = (dist - (a.r + b.r));
    var lenVa = Math.sqrt(a.vel.x * a.vel.x + a.vel.y * a.vel.y) * bounciness;
    var lenVb = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y) * bounciness;

    dx /= dist;
    dy /= dist;

    a.pos.x += dx * mtd * 0.5;
    a.pos.y += dy * mtd * 0.5;
    b.pos.x -= dx * mtd * 0.5;
    b.pos.y -= dy * mtd * 0.5;

    a.vel.x = -dx * lenVb;
    a.vel.y = -dy * lenVb;
    b.vel.x = dx * lenVa;
    b.vel.y = dy * lenVa;
}

function moveBallGeneric(ball, friction, bounciness, w, h, dt) {
    ball.pos.x += ball.vel.x * dt;
    ball.pos.y += ball.vel.y * dt;
    ball.vel.x *= inRange(ball.pos.x, ball.r, w - ball.r) ? friction : -bounciness;
    ball.vel.y *= inRange(ball.pos.y, ball.r, h - ball.r) ? friction : -bounciness;
    ball.pos.x = clamp(ball.pos.x, ball.r, w - ball.r);
    ball.pos.y = clamp(ball.pos.y, ball.r, h - ball.r);
}

GameState.prototype.moveBall = function(ball, dt, friction, bounciness) {
	moveBallGeneric(ball, friction, bounciness, this.arenaWidth, this.arenaHeight, dt);
}

/*
function movePlayer(player, w, h, dt) {
	player.vel.x += player.moveVec.x * 2000 * dt;
    player.vel.y += player.moveVec.y * 2000 * dt;
	moveBallGeneric(player, Math.pow(Math.pow(0.1, 2), dt), 0, w, h, dt)
}*/

function movePlayer(player, w, h, dt) {
	player.vel.x += player.moveVec.x * 2000 * dt;
    player.vel.y += player.moveVec.y * 2000 * dt;
	moveBallGeneric(player, Math.pow(0.1, dt), 0, w, h, dt);
}


GameState.prototype.logic = function(dt) {
    var w = this.arenaWidth,
        h = this.arenaHeight;
    var i, j;

    for (i = this.balls.length - 1; i >= 0; --i) {
		if(this.balls[i].remFlag) {
			this.balls[i].release();
			this.balls.splice(i, 1);
		}
		else
			this.moveBall(this.balls[i], dt, 0.95, 0.8);
	}

    for (i = this.players.length - 1; i >= 0; --i) {
		if(this.players[i].remFlag) {
			this.players[i].release();
			this.players.splice(i, 1);
		}
		else {
			movePlayer(this.players[i], this.arenaWidth, this.arenaHeight, dt);
		}
	}

    for (i = 0; i < this.balls.length; ++i)
        for (j = i + 1; j < this.balls.length; ++j)
            if (collisionTest(this.balls[i], this.balls[j]))
                collisionResponse(this.balls[i], this.balls[j], 0.8);

    for (i = 0; i < this.balls.length; ++i)
        for (j = 0; j < this.players.length; ++j)
            if (collisionTest(this.balls[i], this.players[j])) {
                collisionResponse(this.balls[i], this.players[j], 0.8);
				this.balls[i].r -= 5;
				if(this.balls[i].r < 1) {
					this.balls[i].r = 1;
					this.balls[i].remFlag = true;
				}
					
				//Math.max(this.balls[i].r - 5, 0);
			}
}