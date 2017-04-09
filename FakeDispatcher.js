// ******************
// * FakeDispatcher *
// ******************

function FakeDispatcher(router, sourceHandle) {
    var messageBuffer = [];
    var lastTickTime = performance.now();

    setInterval(function() {
        var t = performance.now();
        var dt = (t - lastTickTime) / 1000;
        lastTickTime = t;

        for (var i = messageBuffer.length - 1; i >= 0; --i) {
            var entry = messageBuffer[i];
            entry.delay -= dt;

            if (entry.delay <= 0) {
                messageBuffer.splice(i, 1);

                if (Math.random() < (1 - FAKE_LOSS)) {
                    var targetObj = router[entry.targetHandle];
                    if (entry.message.type in targetObj)
                        targetObj[entry.message.type](sourceHandle, entry.message);
                    else
                        targetObj.onMessage(sourceHandle, entry.message);
                }
            }
        }
    }, 5);

    this.messageBuffer = messageBuffer;
}

FakeDispatcher.prototype.send = function(targetHandle, msg) {
	//console.log(JSON.stringify(msg));
	
    this.messageBuffer.push({
        delay: nrandf(FAKE_LAG / 2 / 1000, FAKE_LAG_STDEV / 2 / 1000),
        targetHandle: targetHandle,
        message: msg
    });
};