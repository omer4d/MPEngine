define(Object.create({
	debug_show_subsectors: false,
	debug_show_grid: false,
	debug_show_solids: false,

	r_use_simple_shaders: false,
	r_use_mipmaps: false,
	r_show_sprites: true,

	v_fov: 90*0.8,
	v_fov_speed_factor: 1/28,
	v_bob_amount: 3,
	v_bob_cycle_speed_factor: 0.128,
	v_camera_lean_speed_factor: 2.61,

	mouse_sens: 1/250,

	g_ground_turn_speedup_factor: 2.5,
	g_air_turn_speedup_factor: 2,
	g_ground_accel: 3000,
	g_air_accel: 1000,
	g_jump_accel: 15000,
	g_speed_limit: 320,
	g_gravity: 800,
	g_friction: 0.9,
}));
