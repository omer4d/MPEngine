define(["QUnit", "ResourceManager"], function(QUnit, ResourceManager) {	
	QUnit.module("ResourceManager");

	var deleteCounter = 0;
	
	function deleteResource(id) {
		++deleteCounter;
	}
	
	function registerSimpleLoaderMockup(rm) {
		rm.registerLoader("simp", function(rm, url, alias) {
			setTimeout(function() {
				rm.onDone(alias, url, deleteResource);
			}, Math.floor(200 + Math.random() * 200));
		});
	}
	
	function registerDepLoaderMockup(rm) {
		rm.registerLoader("dep", function(rm, url, alias) {
			setTimeout(function() {
				var obj = {deps: []};
				
				for(var i = 0; i < 5; ++i) {
					obj.deps[i] = rm.loadDep(alias, null, url + "_dep" + i + ".simp");
				}
				
				rm.onDone(alias, obj, deleteResource);
			}, Math.floor(200 + Math.random() * 200));
		});
	}
	
	function registerDep2LoaderMockup(rm) {
		rm.registerLoader("dep2", function(rm, url, alias) {
			setTimeout(function() {
				var obj = {deps: []};
				
				for(var i = 0; i < 5; ++i) {
					obj.deps[i] = rm.loadDep(alias, null, url + "_dep" + i + ".dep");
				}
				
				rm.onDone(alias, obj, deleteResource);
			}, Math.floor(200 + Math.random() * 200));
		});
	}
	
	QUnit.test("creation and errors", function(assert) {
		var rm = new ResourceManager();
		assert.ok(new ResourceManager(), "creation");
		
		assert.throws(function() {
			rm.add("foo");
		}, "can't call 'add' before 'begin'");
		
		assert.throws(function() {
			rm.end();
		}, "can't call 'end' before 'begin'");
		
		rm.begin();
		
		assert.throws(function() {
			rm.begin();
		}, "can't call 'begin' twice");
		
		assert.throws(function() {
			rm.get("foo");
		}, "can't call 'get' before done loading");
		
		rm.add("foo.bar");
		
		assert.throws(function() {
			rm.end(function() {
			});
		}, "can't load unregistered extensions");
	});
	
	QUnit.test("basic usage", function(assert) {
		var rm = new ResourceManager();
		registerSimpleLoaderMockup(rm);
		
		var done = assert.async();
		
		rm.begin();
		rm.add("foo", "data/foo.simp");
		rm.add("data/bar.simp");
		var anonHandle = rm.add(null, "data/anon.simp");
		
		var e1 = rm.add("baz", "data/baz.simp");
		var e2 = rm.add("baz", "data/baz.simp");
		
		assert.ok(anonHandle !== e1, "unique handles for different resources");
		assert.ok(e1 === e2, "don't load same thing twice");
		assert.ok(e1.get() === null, "resource handle data initially null");
		
		rm.end(function() {
			assert.equal(rm.get("foo"), "data/foo.simp", "url and alias");
			assert.equal(rm.get("data/bar.simp"), "data/bar.simp", "url only");
			assert.equal(rm.get("baz"), "data/baz.simp", "url and alias");
			assert.equal(rm.get("__anonymous0"), "data/anon.simp", "anonymous resource by key");
			assert.notOk(rm.get("crappy"), "getting non-existent resources returns null.");
			assert.equal(anonHandle.get(), "data/anon.simp", "anonymous resource through handle");
			done();
		});
	});
	
	QUnit.test("direct dependency loading", function(assert) {
		var rm = new ResourceManager();
		registerSimpleLoaderMockup(rm);
		registerDepLoaderMockup(rm);
		
		var done = assert.async();
		
		rm.begin();
		rm.add("foo", "data/foo.dep");
		rm.add("data/bar.dep");
		var anonHandle = rm.add(null, "data/anon.dep");
		
		rm.end(function() {
			assert.ok(rm.get("foo"), "url and alias");
			assert.ok(rm.get("data/bar.dep"), "url only");
			assert.ok(rm.get("__anonymous0"), "anonymous resource by key");
			
			for(var i = 0; i < 5; ++i) {
				assert.equal(rm.get("foo").deps[i].get(), "data/foo.dep_dep" + i + ".simp", "dep1 through handle");
				assert.equal(rm.get("data/bar.dep").deps[i].get(), "data/bar.dep_dep" + i + ".simp", "dep2 through handle");
				assert.equal(rm.get("__anonymous0").deps[i].get(), "data/anon.dep_dep" + i + ".simp", "dep3 through handle");
			}
			
			for(var i = 0; i < 16; ++i) {
				assert.ok(rm.get("__anonymous" + i), "anonymous deps by key");
			}
			
			assert.notOk(rm.get("__anonymous17"), "anonymous deps by key (end)");
			
			done();
		});
	});
	
	QUnit.test("nested dependency loading", function(assert) {
		var rm = new ResourceManager();
		registerSimpleLoaderMockup(rm);
		registerDepLoaderMockup(rm);
		registerDep2LoaderMockup(rm);
		
		var done = assert.async();
		
		rm.begin();
		rm.add("foo", "data/foo.dep2");
		
		rm.end(function() {
			assert.ok(rm.get("foo"));
			
			for(var i = 0; i < 5; ++i) {
				assert.ok(rm.get("foo").deps[i].get(), "direct deps");
				for(var j = 0; j < 5; ++j) {
					assert.ok(rm.get("foo").deps[i].get().deps[j].get(), "indirect deps");
				}
			}
			
			for(i = 0; i < 30; ++i)
				assert.ok(rm.get("__anonymous" + i), "all deps by key");
			
			assert.notOk(rm.get("__anonymous31"), "deps by key (limit)");
			done();
			//console.log(rm.getResourceList());
		});
		
		
	});
	
	QUnit.test("simple garbage collection+caching", function(assert) {
		var done1 = assert.async();
		var done2 = assert.async();
		
		var rm = new ResourceManager();
		registerSimpleLoaderMockup(rm);
		registerDepLoaderMockup(rm);
		registerDep2LoaderMockup(rm);
		
		rm.begin();
		var fooHandle = rm.add("foo.simp");
		rm.add("bar.simp");
		rm.add("baz.simp");
		rm.end(function() {
			assert.ok(rm.getResourceList().length === 3, "load simple resources");
			
			rm.begin();
			assert.ok(rm.add("foo.simp") === fooHandle, "recycle resource");
			rm.add("new.simp");
			
			deleteCounter = 0;
			
			rm.end(function() {
				assert.ok(deleteCounter === 2, "correct number of deletions");
				assert.ok(rm.getResourceList().length === 2, "correct number of resources remained");
				assert.notOk(rm.get("bar.simp") || rm.get("baz.sump"), "unused resources have been removed"); 
				assert.ok(rm.get("foo.simp") === "foo.simp", "recycled resource still there");
				assert.ok(rm.get("new.simp") === "new.simp", "new resource has been loaded");
				done2();
			});
			
			done1();
		});
	});
	
	QUnit.test("garbage collection+caching with deps", function(assert) {
		var done1 = assert.async();
		var done2 = assert.async();
		
		var rm = new ResourceManager();
		registerSimpleLoaderMockup(rm);
		registerDepLoaderMockup(rm);
		registerDep2LoaderMockup(rm);
		
		rm.begin();
		var fooHandle = rm.add("foo.dep2");
		rm.add("bar.dep2");
		rm.add("baz.dep2");
		rm.end(function() {
			assert.ok(rm.getResourceList().length === 3+3*5+3*5*5, "correct number of resources loaded");
			
			//rm.begin();
			
			
			//rm.begin();
			//assert.ok(rm.add("foo.simp") === fooHandle, "recycle resource");
			//rm.add("new.simp")
			/*
			rm.end(function() {
				console.log("zomg!");
				assert.ok(rm.getResourceList().length === 2, "correct number of resources remained");
				assert.notOk(rm.get("bar.simp") || rm.get("baz.sump"), "unused resources have been removed"); 
				assert.ok(rm.get("foo.simp") === "foo.simp", "recycled resource still there");
				assert.ok(rm.get("new.simp") === "new.simp", "new resource has been loaded");
				done2();
			});*/
			
			done1();
		});
	});
});