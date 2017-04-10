window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

var keystates = {};

document.body.addEventListener('keydown', function(e) {
	console.log("ZOMG!");
    keystates[e.key] = true;
});


document.body.addEventListener('keyup', function(e) {
    keystates[e.key] = false;
});



function bindSlider(sliderName, displayName, obj, fieldName) {
	var rangeInput = document.getElementById(sliderName);
	obj[fieldName] = rangeInput.value;
	document.getElementById(displayName).textContent = rangeInput.value;
	
	rangeInput.addEventListener("change", function() {
		document.getElementById(displayName).textContent = rangeInput.value;
		obj[fieldName] = rangeInput.value;
		console.log("ZOMFG", FAKE_LAG);
	}, false);
}

//bindSlider("lag", "lag-value", window, "FAKE_LAG");

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