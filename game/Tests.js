require.config({
    paths: {
        "QUnit": "tests/qunit-2.3.2"
    },
});

require(["QUnit", "tests/TestResourceManager"], function(QUnit) {
	QUnit.load();
    QUnit.start();
});