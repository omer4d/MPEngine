define([], function() {
	function TextureRegion(textureHandle, width, height, u0, v0, u1, v1) {
		this.textureHandle = textureHandle;
		this.width = width;
		this.height = height;
		this.u0 = u0;
		this.v0 = v0;
		this.u1 = u1;
		this.v1 = v1;
	}
	
	function SpriteAtlas(resMan, sheets, sheetTexHandles) {
		this.resMan = resMan;
		this.sheets = sheets;
		this.sheetTexHandles = sheetTexHandles;
		this.cache = null;
	}
	
	SpriteAtlas.prototype.buildCache = function() {
		this.cache = {};
		
		for(var i = 0; i < this.sheets.length; ++i) {
			var sheet = this.sheets[i];
			var keys = Object.keys(sheet.frames);
			var texHandle = this.sheetTexHandles[i].get().handle;
			
			for(var j = 0; j < keys.length; ++j) {
				var key = keys[j];
				var entry = sheet.frames[key];
				this.cache[key] = new TextureRegion(texHandle,
					entry.frame.w,
					entry.frame.h,
					entry.frame.x / sheet.meta.size.w,
					1 - (entry.frame.y + entry.frame.h) / sheet.meta.size.h,
					(entry.frame.x + entry.frame.w) / sheet.meta.size.w,
					1 - entry.frame.y / sheet.meta.size.h);
			}
		}
	};
	
	SpriteAtlas.prototype.get = function(name) {
		if(!this.cache)
			this.buildCache();
		return this.cache[name];
	};
	
	return SpriteAtlas;
});