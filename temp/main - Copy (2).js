function createHandleDescriptor(idx) {
  return {
    enumerable: true,
    configurable: false,
    get: function() {
      return this.data[idx];
    },
    set: function(x) {
      this.data[idx] = x;
    }
  };
}

function Pool(data, props) {
  var freeList = null;

  for(var i = 0; i < data.length; i += props.length) {
    var handle = {index: data.length - props.length - i, data: data, next: freeList};
    
    for(var j = 0; j < props.length; ++j)
      Object.defineProperty(handle, props[j], createHandleDescriptor(data.length - props.length - i + j));
    
    freeList = handle;
  }

  this.data = data;
  this.freeList = freeList;
}

Pool.prototype.get = function() {
  var handle = this.freeList;
  this.freeList = this.freeList.next;
  return handle;
};

Pool.prototype.free = function(handle) {
  handle.next = this.freeList;
  this.freeList = handle;
};



function createPatch(bytes1, bytes2) {
  var masks = [0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80];
  var out = [];
  
  if(bytes1.length !== bytes2.length)
    throw new Error("Input arrays must be of equal length.");
  
  var count = ((bytes1[0] ^ bytes2[0]) & 0x1) ? 1 : 0, last = !count;
  
  for(var i = 0; i < bytes1.length; ++i) {
    for(var j = 0; j < 8; ++j) {
      var curr = (bytes1[i] ^ bytes2[i]) & masks[j];
      if(curr && last || !curr && !last) {
        ++count;
        if(count === 255) {
          out.push(count);
          count = 0;
          last = !curr;
        }
      }else {
        out.push(count);
        last = curr;
        count = 1;
      }
    }
  }
  
  out.push(count);
  
  return out;
}

function applyPatch(bytes, patch) {
  var masks = [0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80];
  var byteIdx = 0, leftoverBits = 0;
  var curr = patch[0];
  var i, j;
  
  for(i = 1; i < patch.length; ++i) {
    var p = patch[i];
    
    if(leftoverBits > 0) {
      var n = Math.min(p, leftoverBits);
      
      if(curr) {
        var start = 8 - leftoverBits;
        
        for(j = start; j < start + n; ++j)
            bytes[byteIdx] ^= masks[j];
      }
      
      p -= n;
      leftoverBits -= n;
      
      if(leftoverBits === 0)
        ++byteIdx;
    }
    
    if(p > 0) {
      if(curr) {
        for(j = 0; j < Math.floor(p / 8); ++j)
          bytes[byteIdx++] ^= 0xFF;
        for(j = 0; j < p % 8; ++j)
          bytes[byteIdx] ^= masks[j];
      }
      else
        byteIdx += Math.floor(p / 8);
      leftoverBits = 8 - (p % 8);
    }

    curr = !curr;
  }
}





window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) { window.setTimeout(callback, 1000 / 60); };

function randf(min, max) {
	if(min === undefined) 	min = 0;
	if(max === undefined)	max = 1;
	return min + Math.random() * (max - min);
}

function inRange(x, min, max) {
	return x >= min && x <= max;
}

function clamp(x, min, max) {
	return x < min ? min : (x > max ? max : x);
}

var vec2Pool = new Pool(new Float32Array(4000*2), ["x", "y"]);

function vec2(x, y) {
	var v = vec2Pool.get();
	v.x = x;
	v.y = y;
	return v;
}

var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var lastFrameTime = performance.now();



var balls = [];

for(var i = 0; i < 10; ++i) {
	var r = randf(10, 60);
	
	balls.push({
		r: r,
		pos: vec2(randf(r, canvas.width - r), randf(r, canvas.height - r)),
		vel: vec2(randf(100, 300) * (randf() < 0.5 ? -1 : 1), randf(100, 300) * (randf() < 0.5 ? -1 : 1))
	});
}

function logic(dt) {
	for(var i = 0; i < balls.length; ++i) {
		var ball = balls[i];
		ball.pos.x += ball.vel.x * dt;
		ball.pos.y += ball.vel.y * dt;
		ball.vel.x *= inRange(ball.pos.x, ball.r, canvas.width - ball.r) ? 1 : -1;
		ball.vel.y *= inRange(ball.pos.y, ball.r, canvas.height - ball.r) ? 1 : -1;
		ball.pos.x = clamp(ball.pos.x, ball.r, canvas.width - ball.r);
		ball.pos.y = clamp(ball.pos.y, ball.r, canvas.height - ball.r);
	}
}

function drawCircle(context, x, y, r, col) {
	context.beginPath();
	context.arc(x, y, r, 0, 2 * Math.PI, false);
	context.fillStyle = col;
	context.fill();
}

function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	for(var i = 0; i < balls.length; ++i)
		drawCircle(context, balls[i].pos.x, balls[i].pos.y, balls[i].r, "green");
}

function renderLoop() {
	var t = performance.now();
	var dt = (t - lastFrameTime) / 1000;
	lastFrameTime = t;
	
	logic(dt);
	render();
	
	requestAnimFrame(renderLoop);
}

requestAnimFrame(renderLoop);