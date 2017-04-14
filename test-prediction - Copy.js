window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

var keystates = {};

document.body.addEventListener('keydown', function(e) {
    keystates[e.key] = true;
});

document.body.addEventListener('keyup', function(e) {
    keystates[e.key] = false;
});

var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");


function moveBallGeneric(ball, friction, bounciness, w, h, dt) {
    ball.pos.x += ball.vel.x * dt;
    ball.pos.y += ball.vel.y * dt;
    ball.vel.x *= inRange(ball.pos.x, ball.r, w - ball.r) ? friction : -bounciness;
    ball.vel.y *= inRange(ball.pos.y, ball.r, h - ball.r) ? friction : -bounciness;
    ball.pos.x = clamp(ball.pos.x, ball.r, w - ball.r);
    ball.pos.y = clamp(ball.pos.y, ball.r, h - ball.r);
}

function movePlayer(player, w, h, dt) {
	player.vel.x += player.moveVec.x * 2000 * dt;
    player.vel.y += player.moveVec.y * 2000 * dt;
	moveBallGeneric(player, Math.pow(0.1, dt), 0, w, h, dt);
}

function makePlayer() {
	return {
		pos: vec2(0, 0),
		vel: vec2(0, 0),
		moveVec: vec2(0, 0),
		r: 15
	};
}

var clientPlayer = makePlayer();
var serverPlayer = makePlayer();

function drawCircle(context, x, y, r, col) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = col;
    context.fill();
}

var commandCounter = 0;

function generateCommands() {
    var moveX = 0,
        moveY = 0;

    if (keystates["a"])
        moveX = -1;
    else if (keystates["d"])
        moveX = 1;
    if (keystates["w"])
        moveY = -1;
    else if (keystates["s"])
        moveY = 1;
	
    return {
        moveX: moveX,
        moveY: moveY,
		cmdNum: commandCounter++
    };
}











var serverCmdBuff = [];



var clientUpdateAccum = 0;
var clientLastUpdateTime = performance.now();
var clientUpdateRate = 60;

var lastMsgFromServer = null;
var lastCmdAck = -1;

var clientCmdBuff = [];
var clientStateBuff = [];


function renderLoop() {
	var t = performance.now();
	var dt = (t - clientLastUpdateTime) / 1000;
	clientLastUpdateTime = t;
	clientUpdateAccum += clientUpdateRate * dt;
	
	var n = Math.floor(clientUpdateAccum);
	
	for(var i = 0; i < n; ++i) {
		
		var cmd = generateCommands();
		clientCmdBuff.push(cmd);
		
	
		(function(cmd) {
			setTimeout(function() {
				if(serverCmdBuff.length < 1 || cmd.cmdNum > serverCmdBuff[serverCmdBuff.length - 1].cmdNum)
					serverCmdBuff.push(cmd);
			}, 500);
		})(cmd);
		
		
	
		if(lastMsgFromServer && lastMsgFromServer.lastCmdAck > lastCmdAck) {
			lastCmdAck = lastMsgFromServer.lastCmdAck;
			
			clientPlayer.pos.x = lastMsgFromServer.posX;
			clientPlayer.pos.y = lastMsgFromServer.posY;
			clientPlayer.vel.x = lastMsgFromServer.velX;
			clientPlayer.vel.y = lastMsgFromServer.velY;
			
			//clientPlayer.pos.x = clientStateBuff[lastCmdAck].x;
			//clientPlayer.pos.y = clientStateBuff[lastCmdAck].y;
			//clientPlayer.vel.x = clientStateBuff[lastCmdAck].vx;
			//clientPlayer.vel.y = clientStateBuff[lastCmdAck].vy;
			
			
			
			
			for(var k = 0; k < clientCmdBuff.length; ++k) {
				if(clientCmdBuff[k].cmdNum > lastCmdAck)
					break;
			}
			
			clientCmdBuff.splice(0, k);
			//console.log(clientCmdBuff.length);
			
			
			for(var k = 0; k < clientCmdBuff.length; ++k) {
				cmd = clientCmdBuff[k];
				clientPlayer.moveVec.x = cmd.moveX;
				clientPlayer.moveVec.y = cmd.moveY;
				movePlayer(clientPlayer, 512, 512, 1/clientUpdateRate);
			}
			
			lastMsgFromServer = null;
		}
		
		
		else {
			console.log("YAY!");
			clientPlayer.moveVec.x = cmd.moveX;
			clientPlayer.moveVec.y = cmd.moveY;
			movePlayer(clientPlayer, 512, 512, 1/clientUpdateRate);
		}
		
		clientStateBuff[cmd.cmdNum] = {x: clientPlayer.pos.x, y: clientPlayer.pos.y, vx: clientPlayer.vel.x, vy: clientPlayer.vel.y};
	}
	
	clientUpdateAccum -= n;
	
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	
	drawCircle(context, serverPlayer.pos.x, serverPlayer.pos.y, serverPlayer.r, "blue");
	drawCircle(context, clientPlayer.pos.x, clientPlayer.pos.y, clientPlayer.r, "red");
	requestAnimFrame(renderLoop);
};

renderLoop();

/*
setInterval(function() {
	console.log("D/T:", delivered/total);
}, 1000);*/





var serverUpdateAccum = 0;
var serverLastUpdateTime = performance.now();
var serverUpdateRate = 60;
var serverUpdateNum = 0;

var firstCmdNum = -1;
var firstCmdUpdateNum = -1;
var lastMax;

function c2s(cmdNum) {
  return firstCmdUpdateNum + (cmdNum - firstCmdNum) * serverUpdateRate / clientUpdateRate;
}


var serverLastAckCmd = -1;

setInterval(function() {
	var t = performance.now();
	var dt = (t - serverLastUpdateTime) / 1000;
	serverLastUpdateTime = t;
	serverUpdateAccum += serverUpdateRate * dt;
	
	var n = Math.floor(serverUpdateAccum);
	
	if(keystates["p"]) {
		var s = 0;
		for(var i = 0; i < 1000000; ++i) {
			s += Math.sqrt(Math.cos(i));
		}
	}
	
	for(var i = 0; i < n; ++i) {
		if(firstCmdNum < 0 && serverCmdBuff.length > 0) {
			firstCmdNum = serverCmdBuff[0].cmdNum;
			firstCmdUpdateNum = serverUpdateNum;
			lastMax = serverUpdateNum;
		}
		
		if(n > 1)
			console.log("fuck!", n);
		if(serverCmdBuff.length < 1)
			console.log("double fuck!");
		
		if(serverCmdBuff.length > 0) {
			serverLastAckCmd = Math.max(serverCmdBuff[serverCmdBuff.length - 1].cmdNum, serverLastAckCmd);
		}
		
		if(firstCmdNum >= 0) {
			var start, end;
			  
			  // Find first command with a time interval touching the current update interval:
			  for(start = 0; start < serverCmdBuff.length; ++start)
				if(c2s(serverCmdBuff[start].cmdNum + 1) > serverUpdateNum)
				  break;
			  
			  // Find first command with a time interval starting after the current update interval:
			  for(end = 0; end < serverCmdBuff.length; ++end)
				if(c2s(serverCmdBuff[end].cmdNum) >= serverUpdateNum + 1)
				  break;
				  
			  var moveX = 0;
			  var moveY = 0;
			  
			  for(var j = start; j < end; ++j) {
				var cmdNum = serverCmdBuff[j].cmdNum;
				var min1 = serverUpdateNum, max1 = serverUpdateNum + 1;
				var min2 = c2s(cmdNum), max2 = c2s(cmdNum + 1);
				
				// If there's a gap between the start of this interval and the end of the previous one...
				if(min2 > lastMax + 0.001) {
					//console.log("ext bw", min2, lastMax);
				  min2 = lastMax; // stretch this interval backwards to cover it (i.e. assign the same input to the gap)
				}
				
				lastMax = max2;
				var len = Math.min(max1, max2) - Math.max(min1, min2); // Length of the interval intersection
				moveX += len * serverCmdBuff[j].moveX;
				moveY += len * serverCmdBuff[j].moveY;
			  }
			  
			  // If the last command for this update doesn't cover the rest of its interval,
			  // we have a missing command that won't arrive on time, so extrapolate from what's available:
			  if(start < end && max2 + 0.001 < serverUpdateNum + 1) {
				moveX += serverCmdBuff[j - 1].moveX * (serverUpdateNum + 1 - max2);
				moveY += serverCmdBuff[j - 1].moveY * (serverUpdateNum + 1 - max2);
				//console.log("ext fw");
			  }
			  
			  
			  serverCmdBuff.splice(0, start);
			
				//console.log(moveX);
				//console.log(moveY);
			serverPlayer.moveVec.x = moveX;
			serverPlayer.moveVec.y = moveY;
			movePlayer(serverPlayer, 512, 512, 1/serverUpdateRate);
		}
		
		if(firstCmdNum >= 0) {
			(function(msg) {
				setTimeout(function() {
					lastMsgFromServer = msg;
				}, 500);
			})({
				lastCmdAck: serverLastAckCmd,
				posX: serverPlayer.pos.x,
				posY: serverPlayer.pos.y,
				velX: serverPlayer.vel.x,
				velY: serverPlayer.vel.y,
			});
		}
		
		++serverUpdateNum;
	}
	
	serverUpdateAccum -= n;
}, 1000/serverUpdateRate);