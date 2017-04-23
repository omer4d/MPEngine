define([], function() {
	function State() {
		this.mouseX = 0;
		this.mouseY = 0;
		this.mouseButtons = 0;
		this.keys = {};
	};
	
	State.prototype.copy = function(other) {
		var self = this;
		self.mouseX = other.mouseX;
		self.mouseY = other.mouseY;
		self.mouseButtons = other.mouseButtons;
		self.keys = {};
		Object.keys(other.keys).forEach(function(key) {
			self.keys[key] = other.keys[key];
		});
	};
	
	var refreshCount = 0;
	var lastState = new State();
	var transientState = new State();
	var currState = new State();
	
	
	
	window.addEventListener('keydown', function(e) {
		transientState.keys[e.key] = true;
	});

	window.addEventListener('keyup', function(e) {
		transientState.keys[e.key] = false;
	});

	window.addEventListener('mousedown', function(e) {
		transientState.mouseButtons = e.buttons;
	});

	window.addEventListener('mouseup', function(e) {
		transientState.mouseButtons = e.buttons;
	});
	
	var normalMouseMoveListener = function(e) {
		transientState.mouseX = e.clientX;
		transientState.mouseY = e.clientY;
	};

	var lockedMouseMoveListener = function(e) {
		transientState.mouseX += e.movementX;
		transientState.mouseY += e.movementY;
	};

	window.addEventListener('mousemove', normalMouseMoveListener);

	var locked = false;
	var mouseLockElement;

	function lockChangeAlert(e) {
		var newLocked = document.pointerLockElement === mouseLockElement;
		
	  if (!locked && newLocked) {
		window.removeEventListener("mousemove", normalMouseMoveListener, false);
		window.addEventListener("mousemove", lockedMouseMoveListener, false);
	  } else if(!newLocked && locked) {
		window.removeEventListener("mousemove", lockedMouseMoveListener, false);
		window.addEventListener("mousemove", normalMouseMoveListener, false);
	  }
	  
	  locked = newLocked;
	}
	
	document.addEventListener('pointerlockchange', lockChangeAlert, false);
	document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
	
	var Input = {};
	
	Input.setMouseLockable = function(el) {
		mouseLockElement = el;
		el.requestPointerLock = el.requestPointerLock || el.mozRequestPointerLock || el.webkitRequestPointerLock;
		el.onclick = function() {
			el.requestPointerLock();
		};
	};
	
	Input.refresh = function() {
		lastState.copy(currState);
		currState.copy(transientState);
		++refreshCount;
	};
	
	Input.mouseX = function() {
		return currState.mouseX;
	};
	
	Input.mouseY = function() {
		return currState.mouseY;
	};
	
	Input.buttonPressed = function(btn) {
		return currState.mouseButtons & btn;
	};
	
	Input.keyPressed = function(key) {
		return currState.keys[key];
	};
	
	Input.buttonJustPressed = function(btn) {
		return refreshCount > 1 && (currState.mouseButtons & btn) && !(lastState.mouseButtons & btn);
	};
	
	Input.buttonJustReleased = function(btn) {
		return refreshCount > 1 && !(currState.mouseButtons & btn) && (lastState.mouseButtons & btn);
	};
	
	Input.keyJustPressed = function(key) {
		return refreshCount > 1 && currState.keys[key] && !lastState.keys[key];
	};
	
	Input.keyJustReleased = function(key) {
		return refreshCount > 1 && !currState.keys[key] && lastState.keys[key];
	};
	
	Input.mouseDeltaX = function() {
		return refreshCount > 1 ? currState.mouseX - lastState.mouseX : 0;
	};
	
	Input.mouseDeltaY = function() {
		return refreshCount > 1 ? currState.mouseY - lastState.mouseY : 0;
	};
	
	Input.mouseLocked = function() {
		return locked;
	};
	
	return Input;
});