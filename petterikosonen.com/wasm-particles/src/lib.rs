use wasm_bindgen::prelude::*;

/// 3D particle with position, velocity, size, alpha.
/// Matches the SoftParticles JS implementation but runs in WASM.
const DAMPING: f32 = 0.998;
const MAX_VEL: f32 = 0.02;
const ATTRACTION_FORCE: f32 = 0.0003;

/// Particle state stored in a flat buffer for cache-friendly access.
/// Layout per particle: [x, y, z, vx, vy, vz, size, alpha] = 8 f32s
const PARTICLE_STRIDE: usize = 8;

#[wasm_bindgen]
pub struct ParticleSystem {
    data: Vec<f32>,
    count: usize,
    bounds: [f32; 3], // [x_bound, y_bound, z_bound]
}

#[wasm_bindgen]
impl ParticleSystem {
    #[wasm_bindgen(constructor)]
    pub fn new(count: usize, x_bound: f32, y_bound: f32, z_bound: f32) -> ParticleSystem {
        // Guard against overflow: count * PARTICLE_STRIDE must fit in usize
        const MAX_PARTICLES: usize = 100_000;
        let count = count.min(MAX_PARTICLES);
        if count == 0 {
            return ParticleSystem {
                data: Vec::new(),
                count: 0,
                bounds: [x_bound, y_bound, z_bound],
            };
        }
        let mut data = vec![0.0f32; count * PARTICLE_STRIDE];
        for i in 0..count {
            let base = i * PARTICLE_STRIDE;
            // Random position within bounds
            data[base]     = (pseudo_random(i, 0) - 0.5) * x_bound * 2.0;
            data[base + 1] = (pseudo_random(i, 1) - 0.5) * y_bound * 2.0;
            data[base + 2] = (pseudo_random(i, 2) - 0.5) * z_bound * 2.0;
            // Random velocity
            data[base + 3] = (pseudo_random(i, 3) - 0.5) * 0.005;
            data[base + 4] = (pseudo_random(i, 4) - 0.5) * 0.005;
            data[base + 5] = (pseudo_random(i, 5) - 0.5) * 0.005;
            // Size: 0.06 - 0.12
            data[base + 6] = 0.06 + pseudo_random(i, 6) * 0.06;
            // Alpha: 0.3 - 0.7
            data[base + 7] = 0.3 + pseudo_random(i, 7) * 0.4;
        }
        ParticleSystem {
            data,
            count,
            bounds: [x_bound, y_bound, z_bound],
        }
    }

    /// Update all particles. Returns pointer to position data (count * 3 f32s).
    /// target_pos: [x, y, z] of attraction target, or empty for no attraction.
    #[wasm_bindgen]
    pub fn update(&mut self, target_x: f32, target_y: f32, target_z: f32, has_target: bool) -> *const f32 {
        let count = self.count;
        let bounds = self.bounds;
        let data = &mut self.data;

        for i in 0..count {
            let base = i * PARTICLE_STRIDE;

            // Read current state
            let mut px = data[base];
            let mut py = data[base + 1];
            let mut pz = data[base + 2];
            let mut vx = data[base + 3];
            let mut vy = data[base + 4];
            let mut vz = data[base + 5];

            // Apply velocity
            px += vx;
            py += vy;
            pz += vz;

            // Boundary reflection (matches JS: bounce back with dampened velocity)
            if px.abs() > bounds[0] {
                px = (bounds[0] - 0.1) * -px.signum() + (pseudo_random(i, 10) - 0.5) * 0.3;
                vx *= -0.2;
            }
            if py.abs() > bounds[1] {
                py = (bounds[1] - 0.1) * -py.signum() + (pseudo_random(i, 11) - 0.5) * 0.3;
                vy *= -0.2;
            }
            if pz.abs() > bounds[2] {
                pz = (bounds[2] - 0.1) * -pz.signum() + (pseudo_random(i, 12) - 0.5) * 0.3;
                vz *= -0.2;
            }

            // Attraction toward target
            if has_target {
                let dx = target_x - px;
                let dy = target_y - py;
                let dz = target_z - pz;
                let dist = (dx * dx + dy * dy + dz * dz).sqrt() + 0.001;
                vx += (dx / dist) * ATTRACTION_FORCE;
                vy += (dy / dist) * ATTRACTION_FORCE;
                vz += (dz / dist) * ATTRACTION_FORCE;
            }

            // Damping
            vx *= DAMPING;
            vy *= DAMPING;
            vz *= DAMPING;

            // Clamp velocity
            if vx.abs() > MAX_VEL { vx = MAX_VEL * vx.signum(); }
            if vy.abs() > MAX_VEL { vy = MAX_VEL * vy.signum(); }
            if vz.abs() > MAX_VEL { vz = MAX_VEL * vz.signum(); }

            // Write back
            data[base]     = px;
            data[base + 1] = py;
            data[base + 2] = pz;
            data[base + 3] = vx;
            data[base + 4] = vy;
            data[base + 5] = vz;
        }

        data.as_ptr()
    }

    /// Get the particle count
    #[wasm_bindgen]
    pub fn len(&self) -> usize {
        self.count
    }

    /// Get raw data pointer (all particle data, stride = PARTICLE_STRIDE)
    #[wasm_bindgen]
    pub fn data_ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }

    /// Get stride (number of f32s per particle)
    #[wasm_bindgen]
    pub fn stride(&self) -> usize {
        PARTICLE_STRIDE
    }
}

/// Simple pseudo-random number generator (deterministic per particle + seed).
/// Returns value in [0, 1).
fn pseudo_random(particle_idx: usize, seed: usize) -> f32 {
    let hash = wrapping_hash(particle_idx.wrapping_mul(2654435761).wrapping_add(seed.wrapping_mul(40503)));
    (hash as f32) / (u32::MAX as f32)
}

fn wrapping_hash(mut x: usize) -> u32 {
    x ^= x >> 16;
    x = x.wrapping_mul(0x45d9f3b);
    x ^= x >> 16;
    x = x.wrapping_mul(0x45d9f3b);
    x ^= x >> 16;
    x as u32
}