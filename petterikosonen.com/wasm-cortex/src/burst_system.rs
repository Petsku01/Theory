use wasm_bindgen::prelude::*;

/// Burst particle system -- particles emit from a selected node, then drift freely.
/// Each particle has a lifecycle: spawn -> burst outward -> free drift.
/// Color is set at spawn time and never changes.
///
/// Data layout per particle (12 f32s):
/// [px, py, pz, vx, vy, vz, size, alpha, life, color_r, color_g, color_b]
const BURST_STRIDE: usize = 12;

#[wasm_bindgen]
pub struct BurstSystem {
    data: Vec<f32>,
    free: Vec<u8>, // 0 = active/bursting, 1 = free-floating
    count: usize,
    has_spawned: bool,
    origin: [f32; 3],
    color: [f32; 3], // current spawn color
    rng_state: u64,
}

impl BurstSystem {
    fn rand(&mut self) -> f32 {
        // xorshift64
        let mut x = self.rng_state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.rng_state = x;
        (x >> 11) as f32 / (1u64 << 53) as f32
    }
}

#[wasm_bindgen]
impl BurstSystem {
    #[wasm_bindgen(constructor)]
    pub fn new(count: usize) -> BurstSystem {
        let count = count.min(10_000);
        // Initialize positions and sizes for free-floating start
        let mut data = vec![0.0f32; count * BURST_STRIDE];
        let mut rng_state: u64 = 0x9E3779B97F4A7C15;
        for i in 0..count {
            let base = i * BURST_STRIDE;
            // Random position in ambient field
            data[base] = (xorshift(&mut rng_state) - 0.5) * 20.0;
            data[base + 1] = (xorshift(&mut rng_state) - 0.5) * 14.0;
            data[base + 2] = (xorshift(&mut rng_state) - 0.5) * 14.0;
            // Small random velocity
            data[base + 3] = (xorshift(&mut rng_state) - 0.5) * 0.002;
            data[base + 4] = (xorshift(&mut rng_state) - 0.5) * 0.002;
            data[base + 5] = (xorshift(&mut rng_state) - 0.5) * 0.002;
            // Size: 0.04 - 0.10
            data[base + 6] = 0.04 + xorshift(&mut rng_state) * 0.06;
            // Alpha: start at 0.25 for ambient
            data[base + 7] = 0.25;
            // Life: start at 1 (not bursting)
            data[base + 8] = 1.0;
            // Color: default cyan
            data[base + 9] = 0.0;
            data[base + 10] = 0.94;
            data[base + 11] = 1.0;
        }
        // Initialize: free=0 (active, waiting to burst), life=1 (ready to respawn)
        BurstSystem {
            data,
            free: vec![0u8; count],
            count,
            has_spawned: false,
            origin: [0.0, 0.0, 0.0],
            color: [0.0, 0.94, 1.0],
            rng_state,
        }
    }

    #[wasm_bindgen]
    pub fn set_origin(&mut self, x: f32, y: f32, z: f32) {
        self.origin = [x, y, z];
    }

    #[wasm_bindgen]
    pub fn set_color(&mut self, r: f32, g: f32, b: f32) {
        self.color = [r, g, b];
    }

    #[wasm_bindgen]
    pub fn data_ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }

    #[wasm_bindgen]
    pub fn len(&self) -> usize {
        self.count
    }

    #[wasm_bindgen]
    pub fn stride(&self) -> usize {
        BURST_STRIDE
    }

    /// Update all particles. Returns pointer to data buffer.
    /// is_active: whether origin is set (node selected) or null (free drift).
    /// delta: frame delta time in seconds.
    #[wasm_bindgen]
    pub fn update(&mut self, is_active: bool, delta: f32) -> *const f32 {
        if is_active {
            self.has_spawned = true;
        }

        let count = self.count;
        let origin = self.origin;
        let spawn_color = self.color;

        // Pre-generate random values to avoid borrow conflicts.
        // We need up to 11 random values per particle per frame in the worst case.
        // Instead of pre-generating, we call rand() inline by separating the mutable
        // borrows: first gather randoms, then write to data.
        for i in 0..count {
            let base = i * BURST_STRIDE;

            // Read current state into local variables
            let mut px = self.data[base];
            let mut py = self.data[base + 1];
            let mut pz = self.data[base + 2];
            let mut vx = self.data[base + 3];
            let mut vy = self.data[base + 4];
            let mut vz = self.data[base + 5];
            let mut alpha = self.data[base + 7];
            let mut life = self.data[base + 8];
            let is_free = self.free[i] == 1;

            if is_active && !is_free {
                // Active bursting state
                life += delta * 0.5;

                if life >= 1.0 {
                    // Respawn at origin with new burst velocity
                    life = 0.0;
                    let r1 = self.rand();
                    let r2 = self.rand();
                    let r3 = self.rand();
                    px = origin[0] + (r1 - 0.5) * 0.1;
                    py = origin[1] + (r2 - 0.5) * 0.1;
                    pz = origin[2] + (r3 - 0.5) * 0.1;
                    let speed = 0.008 + self.rand() * 0.012;
                    let theta = self.rand() * std::f32::consts::PI * 2.0;
                    let phi = (2.0 * self.rand() - 1.0).acos();
                    vx = phi.sin() * theta.cos() * speed;
                    vy = phi.sin() * theta.sin() * speed;
                    vz = phi.cos() * speed;
                    // Color set at spawn time
                    self.data[base + 9] = spawn_color[0];
                    self.data[base + 10] = spawn_color[1];
                    self.data[base + 11] = spawn_color[2];
                } else {
                    // Continue burst trajectory
                    px += vx;
                    py += vy;
                    pz += vz;
                    vx *= 0.98;
                    vy *= 0.98;
                    vz *= 0.98;
                }

                // Alpha lifecycle: fade in then fade out
                alpha = if life < 0.15 {
                    life / 0.15 * 0.7
                } else {
                    (1.0 - life) * 0.7
                };
            } else if is_active && is_free {
                // Free particle being attracted back to origin
                let dx = origin[0] - px;
                let dy = origin[1] - py;
                let dz = origin[2] - pz;
                let dist = (dx * dx + dy * dy + dz * dz).sqrt() + 0.001;
                vx += (dx / dist) * 0.0004;
                vy += (dy / dist) * 0.0004;
                vz += (dz / dist) * 0.0004;
                let max_v = 0.015f32;
                if vx.abs() > max_v {
                    vx = max_v * vx.signum();
                }
                if vy.abs() > max_v {
                    vy = max_v * vy.signum();
                }
                if vz.abs() > max_v {
                    vz = max_v * vz.signum();
                }
                px += vx;
                py += vy;
                pz += vz;
                alpha = (alpha + delta * 0.5).min(0.45);
            } else {
                // Inactive: free-floating drift
                if !is_free {
                    // Transition from burst to free
                    self.free[i] = 1;
                    if life >= 1.0 || alpha <= 0.0 {
                        px = (self.rand() - 0.5) * 20.0;
                        py = (self.rand() - 0.5) * 14.0;
                        pz = (self.rand() - 0.5) * 14.0;
                        vx = (self.rand() - 0.5) * 0.002;
                        vy = (self.rand() - 0.5) * 0.002;
                        vz = (self.rand() - 0.5) * 0.002;
                        alpha = 0.25;
                    }
                }
                // Gentle random drift
                vx += (self.rand() - 0.5) * 0.0002;
                vy += (self.rand() - 0.5) * 0.0002;
                vz += (self.rand() - 0.5) * 0.0002;
                // Damping
                vx *= 0.995;
                vy *= 0.995;
                vz *= 0.995;
                px += vx;
                py += vy;
                pz += vz;
                // Boundary reflection
                let bounds_x = 15.0f32;
                let bounds_yz = 10.0f32;
                if px.abs() > bounds_x {
                    px = px.clamp(-bounds_x, bounds_x);
                    vx *= -0.2;
                }
                if py.abs() > bounds_yz {
                    py = py.clamp(-bounds_yz, bounds_yz);
                    vy *= -0.2;
                }
                if pz.abs() > bounds_yz {
                    pz = pz.clamp(-bounds_yz, bounds_yz);
                    vz *= -0.2;
                }
                // Ease alpha toward 0.25
                alpha += (0.25 - alpha) * delta * 0.3;
            }

            // Write back
            self.data[base] = px;
            self.data[base + 1] = py;
            self.data[base + 2] = pz;
            self.data[base + 3] = vx;
            self.data[base + 4] = vy;
            self.data[base + 5] = vz;
            self.data[base + 7] = alpha;
            self.data[base + 8] = life;
        }

        self.data.as_ptr()
    }

    #[wasm_bindgen]
    pub fn has_spawned(&self) -> bool {
        self.has_spawned
    }
}

/// Standalone xorshift64 helper for initialization.
fn xorshift(state: &mut u64) -> f32 {
    let mut x = *state;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    *state = x;
    (x >> 11) as f32 / (1u64 << 53) as f32
}