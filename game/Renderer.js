define(["ConVars", "Matrix4", "GLUtil", "DynamicMesh"], function(cvars, m4, GLUtil, DynamicMesh) {
	var vertexShaderSource = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		attribute vec2 a_texcoord;

		uniform mat4 u_matrix;

		varying vec4 v_color;
		varying vec2 v_texcoord;

		void main() {
		  gl_Position = u_matrix * a_position;
		  v_color = a_color;
		  v_texcoord = a_texcoord;
		}`;

	var simpleFragmentShaderSource = `
		precision mediump float;

		varying vec4 v_color;
		varying vec2 v_texcoord;

		uniform sampler2D u_texture;

		void main() {
			vec4 t4 = texture2D(u_texture, v_texcoord);
			
			if(t4.a < 0.01)
				discard;
			
			gl_FragColor =  t4 * v_color;
		}
		`;

	var fragmentShaderSource = `
		precision mediump float;

		varying vec4 v_color;
		varying vec2 v_texcoord;

		uniform sampler2D u_texture;


		float remap(in float a, float a0, float a1, float b0, float b1) {
			float k = (a - a0) / (a1 - a0);
			return mix(b0, b1, k);
		}

		float qremap(in float a, float a0, float a1, float b0, float b1) {
			float k = (a - a0) / (a1 - a0);
			return mix(b0, b1, k * k);
		}


		void main() {
			vec4 t4 = texture2D(u_texture, v_texcoord);
			
			if(t4.a < 0.01)
				discard;
			
			float n = 5.0;
			float f = 10000.0;
			float zndc = gl_FragCoord.z * 2.0 - 1.0;
			float z = -2.0*f*n / (zndc*(f-n)-(f+n));
			float minz = -n;
			float maxz = -1000.0;
			
			
			vec3 t = t4.xyz;
			float dark = 1.0 - v_color.r;
			float finalDarkness = 0.0;
			
			float level1 = 1.0;
			float level2 = 1.0-dark*0.5;
			float level3 = pow(1.0 - dark, 1.2);
			float level4 = pow(1.0 - dark, 1.7);
			float level5 = pow(1.0 - dark, 2.7);
			float level6 = pow(1.0 - dark, 3.1);
			
			float dist1 = n-20.0+25.0;
			float dist2 = n-20.0+50.0;
			float dist3 = n-20.0+90.0;
			float dist4 = n-20.0+150.0;
			float dist5 = n-20.0+300.0;
			float dist6 = n-20.0+500.0;
			
			if(z < dist2)
				finalDarkness = remap(z, dist1, dist2, level1, level2);
			else if(z < dist3)
				finalDarkness = remap(z, dist2, dist3, level2, level3);
			else if(z < dist4)
				finalDarkness = remap(z, dist3, dist4, level3, level4);
			else if(z < dist5)
				finalDarkness = qremap(z, dist4, dist5, level4, level5);
			else if(z < dist6)
				finalDarkness = qremap(z, dist5, dist6, level5, level6);
			else
				finalDarkness = level6;
			
			float grey = t.b * 0.7 + t.r * 0.1 + t.g * 0.2;    // + 0.59 * t.g + 0.11 * t.b;
			float low_contrast_grey = min(grey + 0.55, 1.0) - 0.55; 
			
			vec3 greycol = vec3(low_contrast_grey);
			
			float fd2 = min(1.0, finalDarkness * 2.3);
			
			vec3 mixed = mix(greycol, t, fd2);
			
			gl_FragColor = vec4(vec3(mixed *    finalDarkness * 1.3+0.1), t4.a);
		}
		`;
		
	var skyVertexShaderSource = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		attribute vec2 a_texcoord;

		uniform mat4 u_matrix;

		varying vec4 v_color;
		varying vec2 v_texcoord;

		void main() {
		  gl_Position = u_matrix * a_position;
		  gl_Position.z = 1.0;
		  v_color = a_color;
		  v_texcoord = a_texcoord;
		}`;
		
	var skyFragmentShaderSource = `
		precision mediump float;

		varying vec4 v_color;
		varying vec2 v_texcoord;

		uniform sampler2D u_texture;

		void main() {
			vec4 t4 = texture2D(u_texture, v_texcoord);
			
			if(t4.a < 0.01)
				discard;
			
			gl_FragColor =  t4 * v_color;
		}
		`;
		
	function getStandardLocations(gl, program) {
		return {
			coords: gl.getAttribLocation(program, "a_position"),
			colors: gl.getAttribLocation(program, "a_color"),
			texCoords: gl.getAttribLocation(program, "a_texcoord"),
			matrix: gl.getUniformLocation(program, "u_matrix"),
			texture: gl.getUniformLocation(program, "u_texture")
		};
	}
	
	function buildProgram(gl, vert, frag) {
		vert = (typeof vert === "string") ? GLUtil.createShader(gl, gl.VERTEX_SHADER, vert) : vert;
		frag = (typeof frag === "string") ? GLUtil.createShader(gl, gl.FRAGMENT_SHADER, frag) : frag;
		return GLUtil.createProgram(gl, vert, frag);
	}
	
	
	function Renderer(gl, levelMesh) {
		var program = buildProgram(gl, vertexShaderSource, (cvars.r_use_simple_shaders || cvars.debug_show_subsectors) ? simpleFragmentShaderSource : fragmentShaderSource);
		var spriteProgram = program;
		var skyProgram = buildProgram(gl, skyVertexShaderSource, skyFragmentShaderSource);
		
		var levelShaderLocations = getStandardLocations(gl, program);
		var spriteShaderLocations = getStandardLocations(gl, spriteProgram);
		var skyShaderLocations = getStandardLocations(gl, skyProgram);
		
		var sprites = new DynamicMesh(gl, 6*10000);
		var lastSpriteTex = 0;
		
		this.draw = function(projectionMatrix, cameraMatrix) {
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			//gl.enable(gl.CULL_FACE);
			gl.enable(gl.DEPTH_TEST);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.enable(gl.BLEND);
			
			var viewMatrix = m4.inverse(cameraMatrix);
			var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

			gl.useProgram(program);
			gl.uniformMatrix4fv(levelShaderLocations.matrix, false, viewProjectionMatrix);
			gl.uniform1i(levelShaderLocations.texture, 0);
			
			for(var i = 0; i < levelMesh.submeshes.length; ++i) {
				 if(levelMesh.submeshes[i].tex)
					gl.bindTexture(gl.TEXTURE_2D, levelMesh.submeshes[i].tex);
				else
					gl.bindTexture(gl.TEXTURE_2D, levelMesh.missingTexHandle);
				levelMesh.mesh.draw(levelShaderLocations, levelMesh.submeshes[i].start, levelMesh.submeshes[i].len);
			 }
			
			//levelMesh.draw(levelShaderLocations, program, skyShaderLocations, skyProgram);
			
			
			
			
			gl.useProgram(spriteProgram);
			gl.uniformMatrix4fv(spriteShaderLocations.matrix, false, viewProjectionMatrix);
			gl.uniform1i(spriteShaderLocations.texture, 0);
		};
		
		this.beginSprites = function() {
			lastSpriteTex = null;
			sprites.begin();
		};
		
		this.pushSprite = function(reg, x, y, z) {
			if(reg.textureHandle != lastSpriteTex) {
				sprites.flush(spriteShaderLocations);
				sprites.begin();
				gl.bindTexture(gl.TEXTURE_2D, reg.textureHandle);
			}
			
			sprites.coord(x, y, z);
			sprites.texCoord(reg.u0, reg.v0);
			sprites.color(255, 255, 255);
			
			sprites.coord(x, y + reg.height, z);
			sprites.texCoord(reg.u0, reg.v1);
			sprites.color(255, 255, 255);
			
			sprites.coord(x + reg.width, y + reg.height, z);
			sprites.texCoord(reg.u1, reg.v1);
			sprites.color(255, 255, 255);
			
			
			sprites.coord(x + reg.width, y + reg.height, z);
			sprites.texCoord(reg.u1, reg.v1);
			sprites.color(255, 255, 255);
			
			sprites.coord(x + reg.width, y, z);
			sprites.texCoord(reg.u1, reg.v0);
			sprites.color(255, 255, 255);
			
			sprites.coord(x, y, z);
			sprites.texCoord(reg.u0, reg.v0);
			sprites.color(255, 255, 255);
			
			lastSpriteTex = reg.textureHandle;
		};
		
		this.pushSprite2 = function(reg, x, y, z, nx, nz, light) {
			if(reg.textureHandle != lastSpriteTex) {
				sprites.flush(spriteShaderLocations);
				sprites.begin();
				gl.bindTexture(gl.TEXTURE_2D, reg.textureHandle);
			}
			
			nx *= reg.width / 2;
			nz *= reg.width / 2;
			
			sprites.coord(x - nx, y, z - nz);
			sprites.texCoord(reg.u0, reg.v0);
			sprites.color(light, light, light);
			
			sprites.coord(x - nx, y + reg.height, z - nz);
			sprites.texCoord(reg.u0, reg.v1);
			sprites.color(light, light, light);
			
			sprites.coord(x + nx, y + reg.height, z + nz);
			sprites.texCoord(reg.u1, reg.v1);
			sprites.color(light, light, light);
			
			
			sprites.coord(x + nx, y + reg.height, z + nz);
			sprites.texCoord(reg.u1, reg.v1);
			sprites.color(light, light, light);
			
			sprites.coord(x + nx, y, z + nz);
			sprites.texCoord(reg.u1, reg.v0);
			sprites.color(light, light, light);
			
			sprites.coord(x - nx, y, z - nz);
			sprites.texCoord(reg.u0, reg.v0);
			sprites.color(light, light, light);
			
			lastSpriteTex = reg.textureHandle;
		};
		
		this.endSprites = function() {
			gl.bindTexture(gl.TEXTURE_2D, lastSpriteTex);
			sprites.flush(spriteShaderLocations);
			sprites.begin();
		};
	}
	
	return Renderer;
});