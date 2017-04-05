/*
function Pool(build, cap) {
  this.build = build;
  this.cap = cap;
  this.data = [];
  
  this.data.push(build());
  this.data[0].nextFree = null;
  
  for(var i = 1; i < cap; ++i) {
    this.data.push(build());
    this.data[i].nextFree = this.data[i - 1];
  }
  
  this.nextFree = this.data[cap - 1];
}

Pool.prototype.get = function() {
  var obj = this.nextFree;
  this.nextFree = obj.nextFree;
  return obj;
};

Pool.prototype.free = function(obj) {
  obj.nextFree = this.nextFree;
  this.nextFree = obj;
};*/

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

var pool = new Pool(new Float32Array(400), ["foo", "bar"]);


var a = pool.get();
var b = pool.get();
var c = pool.get();

a.foo = 10;
a.bar = 20;
b.foo = 30;
b.bar = 40;
c.foo = 50;
c.bar = 60;

pool.free(b);

b = pool.get();
b.foo = 70;
b.bar = 80;


pool;




























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























function printByteArray(arr) {
  var str = "";
  
  for(var i = 0; i < arr.length; ++i) {
    str += arr[i] + " ";
  }
  
  console.log(str);
}

function testPatch1() {
  var n = 200;//4 + Math.floor(Math.random() * 2000);
  var bytes1 = new Int8Array(n);
  var bytes2 = new Int8Array(n);
  
  for(var i = 0; i < n; ++i) {
    var x = Math.floor(Math.random() * 256);
    var y = Math.floor(Math.random() * 5);
    
    bytes1[i] = x;
    bytes2[i] = Math.random() < 0.1 ? (x + y) % 256 : x;
  }
  
  //console.log(bytes1);
  //console.log(bytes2);
  
  var patch = createPatch(bytes1, bytes2);
  applyPatch(bytes1, patch);
  
  var compression = patch.length / n;
  
  //console.log(bytes1);
  
  for(var i = 0; i < n; ++i)
    if(bytes1[i] !== bytes2[i]) {
      printByteArray(bytes1);
      console.log();
      printByteArray(bytes2);
      
      return [false, compression];
    }
  
  return [true, compression];
}

function testPatch() {
  var total = 0;
  var N = 10000;
  
  for(var i = 0; i < N; ++i) {
    var res = testPatch1();
    total += res[1];
    
    if(!res[0])
      console.log("WTF!");
  }
  
  console.log("Finished!", total/N);
}

//testPatch();

/*
var bytes1 = new Int8Array(4);
var bytes2 = new Int8Array(4);

bytes1[0] = 21;
bytes1[1] = 44;
bytes1[2] = 122;
bytes1[3] = 31;

bytes2[0] = 21;
bytes2[1] = 44;
bytes2[2] = 123;
bytes2[3] = 33;

var patch = createPatch(bytes1, bytes2);
console.log(patch);
applyPatch(bytes1, patch);
console.log(bytes1);
console.log(bytes2);*/

/*
var buffer = new ArrayBuffer(4*2);
var view = new Int32Array(buffer);
var view2 = new Int8Array(buffer);

view[0] = 0xEEEEEEEE;
view[1] = 0xAAAAAAAA;*/

/*
view2[0] = 255;
view2[1] = 255;
view2[2] = 255;
view2[3] = 255;
view[0];*/

//for(var i = 0; i < 10; ++i)
//  view[i] = i;

//console.log(view2);
//console.log(view);

//var buffer = new Float32Array(16);
//var dv = new DataView(buffer, 0);




/*
var pool = new Pool(function() {
  return {
    value: 0
  };
}, 10);*/

  
//for(var i = 0; i < 1000; ++i) {
//  var idx = Math.floor(Math.random() * 10);
//  free(vals[idx]);
//}
  
//vals;

/*
function NetNumber(x) {
  this.value = x;
}

NetNumber.prototype.valueOf = function() {
  return this.value;
};

123 + (new NetNumber(10));*/


/*
var o = {};

var bValue = 38;

Object.defineProperty(o, 'b', {
  get: function() { return bValue; },
  set: function(newValue) { bValue = newValue; },
  enumerable: true,
  configurable: false
});

o.b = 123;
console.log(o.b, bValue);*/










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

var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var lastFrameTime = performance.now();

var balls = [];

for(var i = 0; i < 10; ++i) {
	var r = randf(10, 60);
	
	balls.push({
		r: r,
		x: randf(r, canvas.width - r),
		y: randf(r, canvas.height - r),
		vx: randf(100, 300) * (randf() < 0.5 ? -1 : 1),
		vy: randf(100, 300) * (randf() < 0.5 ? -1 : 1)
	});
}

function logic(dt) {
	for(var i = 0; i < balls.length; ++i) {
		var ball = balls[i];
		ball.x += ball.vx * dt;
		ball.y += ball.vy * dt;
		ball.vx *= inRange(ball.x, ball.r, canvas.width - ball.r) ? 1 : -1;
		ball.vy *= inRange(ball.y, ball.r, canvas.height - ball.r) ? 1 : -1;
		ball.x = clamp(ball.x, ball.r, canvas.width - ball.r);
		ball.y = clamp(ball.y, ball.r, canvas.height - ball.r);
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
		drawCircle(context, balls[i].x, balls[i].y, balls[i].r, "green");
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