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
var router = {};
var server = new Server(new FakeDispatcher(router, "server"));

var disp = new FakeDispatcher(router, "client");
var client = new Client(keystates, new Renderer(canvas, context), disp);

router.client = client;
router.server = server;

console.log(client, router);
client.connectTo("server");