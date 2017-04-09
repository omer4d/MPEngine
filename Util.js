function randf(min, max) {
	if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    return min + Math.random() * (max - min);
}

function nrandf(mean, stdev) {
  return mean + (randf() + randf() + randf()) * stdev;
}

function inRange(x, min, max) {
    return x >= min && x <= max;
}

function clamp(x, min, max) {
    return x < min ? min : (x > max ? max : x);
}


function vec2(x, y) {
    return {
        x: x,
        y: y
    };
}