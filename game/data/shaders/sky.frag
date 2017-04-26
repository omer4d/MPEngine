precision mediump float;

varying vec4 v_color;
varying vec2 v_texcoord;

uniform sampler2D u_texture;

void main() {
	gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);
}