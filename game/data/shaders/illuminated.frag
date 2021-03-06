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