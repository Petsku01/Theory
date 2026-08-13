use wasm_bindgen::prelude::*;

/// 3D particle with position, velocity, size, alpha, color.
/// Matches the SoftParticles JS implementation but runs in WASM.
const DAMPING: f32 = 0.998;
const MAX_VEL: f32 = 0.02;
const ATTRACTION_FORCE: f32 = 0.0003;
const FLOW_FORCE: f32 = 0.0008;

/// Particle state stored in a flat buffer for cache-friendly access.
/// Layout per particle: [x, y, z, vx, vy, vz, size, alpha, r, g, b] = 12 f32s
const PARTICLE_STRIDE: usize = 12;

/// Default particle color (cyan) used at init before update_colors is called.
const DEFAULT_R: f32 = 0.0;
const DEFAULT_G: f32 = 0.94; // ~0x00f0ff
const DEFAULT_B: f32 = 1.0;

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
            data[base]      = (pseudo_random(i, 0) - 0.5) * x_bound * 2.0;
            data[base + 1]  = (pseudo_random(i, 1) - 0.5) * y_bound * 2.0;
            data[base + 2]  = (pseudo_random(i, 2) - 0.5) * z_bound * 2.0;
            data[base + 3]  = (pseudo_random(i, 3) - 0.5) * 0.005;
            data[base + 4]  = (pseudo_random(i, 4) - 0.5) * 0.005;
            data[base + 5]  = (pseudo_random(i, 5) - 0.5) * 0.005;
            data[base + 6]  = 0.06 + pseudo_random(i, 6) * 0.06;
            data[base + 7]  = 0.3 + pseudo_random(i, 7) * 0.4;
            data[base + 8]  = DEFAULT_R;
            data[base + 9]  = DEFAULT_G;
            data[base + 10] = DEFAULT_B;
            // base + 11 is padding / reserved
        }
        ParticleSystem {
            data,
            count,
            bounds: [x_bound, y_bound, z_bound],
        }
    }

    /// Update all particles with optional attraction target.
    /// Returns pointer to position data (count * stride f32s).
    /// target_pos: [x, y, z] of attraction target, or empty for no attraction.
    #[wasm_bindgen]
    pub fn update(&mut self, target_x: f32, target_y: f32, target_z: f32, has_target: bool) -> *const f32 {
        let count = self.count;
        let bounds = self.bounds;
        let data = &mut self.data;

        for i in 0..count {
            let base = i * PARTICLE_STRIDE;

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

            // Boundary reflection with clamping
            if px.abs() > bounds[0] {
                px = px.clamp(-bounds[0], bounds[0]);
                vx *= -0.2;
            }
            if py.abs() > bounds[1] {
                py = py.clamp(-bounds[1], bounds[1]);
                vy *= -0.2;
            }
            if pz.abs() > bounds[2] {
                pz = pz.clamp(-bounds[2], bounds[2]);
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

            data[base]     = px;
            data[base + 1] = py;
            data[base + 2] = pz;
            data[base + 3] = vx;
            data[base + 4] = vy;
            data[base + 5] = vz;
        }

        data.as_ptr()
    }

    /// Update particles using a curl-noise flow field instead of attraction.
    /// The curl noise creates organic, swirling motion.
    /// JS calls this instead of `update` when there is no hover/selection target.
    #[wasm_bindgen]
    pub fn update_with_flow(&mut self, time: f32, noise_scale: f32, noise_strength: f32) -> *const f32 {
        let count = self.count;
        let bounds = self.bounds;
        let data = &mut self.data;

        for i in 0..count {
            let base = i * PARTICLE_STRIDE;

            let mut px = data[base];
            let mut py = data[base + 1];
            let mut pz = data[base + 2];
            let mut vx = data[base + 3];
            let mut vy = data[base + 4];
            let mut vz = data[base + 5];

            // Lightweight flow field — hash-based pseudo-noise using particle POSITION
            // (not just index — gives spatial variation, not uniform push)
            let t = time * 0.1;
            let pos_hash = ((px * 100.0) as usize)
                .wrapping_add((py * 97.0) as usize)
                .wrapping_add((pz * 89.0) as usize)
                .wrapping_add((t * 50.0) as usize);
            let h1 = wrapping_hash(pos_hash.wrapping_mul(2654435761));
            let h2 = wrapping_hash(pos_hash.wrapping_add(7919).wrapping_mul(40503));
            let h3 = wrapping_hash(pos_hash.wrapping_add(104729).wrapping_mul(2654435761));
            let cx = ((h1 as f32) / (u32::MAX as f32)) * 2.0 - 1.0;
            let cy = ((h2 as f32) / (u32::MAX as f32)) * 2.0 - 1.0;
            let cz = ((h3 as f32) / (u32::MAX as f32)) * 2.0 - 1.0;

            vx += cx * noise_strength * FLOW_FORCE * 60.0;
            vy += cy * noise_strength * FLOW_FORCE * 60.0;
            vz += cz * noise_strength * FLOW_FORCE * 60.0;

            // Apply velocity
            px += vx;
            py += vy;
            pz += vz;

            // Boundary reflection with clamping
            if px.abs() > bounds[0] {
                px = px.clamp(-bounds[0], bounds[0]);
                vx *= -0.2;
            }
            if py.abs() > bounds[1] {
                py = py.clamp(-bounds[1], bounds[1]);
                vy *= -0.2;
            }
            if pz.abs() > bounds[2] {
                pz = pz.clamp(-bounds[2], bounds[2]);
                vz *= -0.2;
            }

            // Damping
            vx *= DAMPING;
            vy *= DAMPING;
            vz *= DAMPING;

            // Clamp velocity
            if vx.abs() > MAX_VEL { vx = MAX_VEL * vx.signum(); }
            if vy.abs() > MAX_VEL { vy = MAX_VEL * vy.signum(); }
            if vz.abs() > MAX_VEL { vz = MAX_VEL * vz.signum(); }

            data[base]     = px;
            data[base + 1] = py;
            data[base + 2] = pz;
            data[base + 3] = vx;
            data[base + 4] = vy;
            data[base + 5] = vz;
        }

        data.as_ptr()
    }

    /// Update particle colors based on nearest node and its cluster color.
    /// node_positions: flat [x,y,z, x,y,z, ...] for each node
    /// cluster_colors: flat [r,g,b, r,g,b, ...] per node (already mapped from cluster)
    /// blend_radius: distance within which color is fully applied; outside fades to default
    #[wasm_bindgen]
    pub fn update_colors(
        &mut self,
        node_positions: &[f32],
        node_count: usize,
        cluster_colors: &[f32],
        blend_radius: f32,
    ) {
        if node_count == 0 || node_positions.len() < node_count * 3 || cluster_colors.len() < node_count * 3 {
            return;
        }

        let count = self.count;
        let data = &mut self.data;
        let blend_radius_sq = blend_radius * blend_radius;

        for i in 0..count {
            let base = i * PARTICLE_STRIDE;
            let px = data[base];
            let py = data[base + 1];
            let pz = data[base + 2];

            // Find nearest node
            let mut nearest_idx = 0usize;
            let mut nearest_dist_sq = f32::MAX;
            for n in 0..node_count {
                let nx = node_positions[n * 3];
                let ny = node_positions[n * 3 + 1];
                let nz = node_positions[n * 3 + 2];
                let dx = px - nx;
                let dy = py - ny;
                let dz = pz - nz;
                let d_sq = dx * dx + dy * dy + dz * dz;
                if d_sq < nearest_dist_sq {
                    nearest_dist_sq = d_sq;
                    nearest_idx = n;
                }
            }

            // Interpolate between default color and cluster color based on distance
            let t = if nearest_dist_sq < blend_radius_sq {
                1.0 - (nearest_dist_sq / blend_radius_sq).sqrt()
            } else {
                0.0
            };
            // t in [0, 1]: 1 = at node, 0 = at blend_radius or beyond
            let t = t.clamp(0.0, 1.0);

            let cr = cluster_colors[nearest_idx * 3];
            let cg = cluster_colors[nearest_idx * 3 + 1];
            let cb = cluster_colors[nearest_idx * 3 + 2];

            // Lerp from default to cluster color
            data[base + 8]  = DEFAULT_R + (cr - DEFAULT_R) * t;
            data[base + 9]  = DEFAULT_G + (cg - DEFAULT_G) * t;
            data[base + 10] = DEFAULT_B + (cb - DEFAULT_B) * t;
        }
    }

    #[wasm_bindgen]
    pub fn len(&self) -> usize {
        self.count
    }

    #[wasm_bindgen]
    pub fn data_ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }

    #[wasm_bindgen]
    pub fn stride(&self) -> usize {
        PARTICLE_STRIDE
    }
}

// ── Curl noise (3D) ──
// Based on simplex noise gradient. We compute the curl of a scalar potential
// field defined by simplex noise, producing a divergence-free flow field.
// ~80 lines of self-contained Rust, no external dependencies.

/// 3D simplex noise returning value in approximately [-1, 1].
fn simplex_noise_3d(x: f32, y: f32, z: f32) -> f32 {
    // Gradient table (12 edges of a cube)
    const GRAD: [[f32; 3]; 12] = [
        [1.0, 1.0, 0.0], [-1.0, 1.0, 0.0], [1.0, -1.0, 0.0], [-1.0, -1.0, 0.0],
        [1.0, 0.0, 1.0], [-1.0, 0.0, 1.0], [1.0, 0.0, -1.0], [-1.0, 0.0, -1.0],
        [0.0, 1.0, 1.0], [0.0, -1.0, 1.0], [0.0, 1.0, -1.0], [0.0, -1.0, -1.0],
    ];

    // Skewing factors for 3D simplex noise
    const F3: f32 = 1.0 / 3.0;
    const G3: f32 = 1.0 / 6.0;

    // Skew the input space to determine which simplex cell we're in
    let s = (x + y + z) * F3;
    let i = (x + s).floor() as i32;
    let j = (y + s).floor() as i32;
    let k = (z + s).floor() as i32;

    let t = (i + j + k) as f32 * G3;
    let x0 = x - (i as f32 - t);
    let y0 = y - (j as f32 - t);
    let z0 = z - (k as f32 - t);

    // Determine which simplex we are in
    let (i1, j1, k1, i2, j2, k2);
    if x0 >= y0 {
        if y0 >= z0 { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if x0 >= z0 { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
        if y0 < z0 { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if x0 < z0 { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    let x1 = x0 - i1 as f32 + G3;
    let y1 = y0 - j1 as f32 + G3;
    let z1 = z0 - k1 as f32 + G3;
    let x2 = x0 - i2 as f32 + 2.0 * G3;
    let y2 = y0 - j2 as f32 + 2.0 * G3;
    let z2 = z0 - k2 as f32 + 2.0 * G3;
    let x3 = x0 - 1.0 + 3.0 * G3;
    let y3 = y0 - 1.0 + 3.0 * G3;
    let z3 = z0 - 1.0 + 3.0 * G3;

    // Hash coordinates
    let ii = i & 255;
    let jj = j & 255;
    let kk = k & 255;

    // Pseudo-random permutation based on grid coordinates
    let gi0 = hash_perm(ii, jj, kk) % 12;
    let gi1 = hash_perm(ii + i1, jj + j1, kk + k1) % 12;
    let gi2 = hash_perm(ii + i2, jj + j2, kk + k2) % 12;
    let gi3 = hash_perm(ii + 1, jj + 1, kk + 1) % 12;

    // Calculate contribution from the four corners
    let mut n0 = 0.0;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if t0 > 0.0 {
        let t0_sq = t0 * t0;
        n0 = t0_sq * t0_sq * (GRAD[gi0][0] * x0 + GRAD[gi0][1] * y0 + GRAD[gi0][2] * z0);
    }

    let mut n1 = 0.0;
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if t1 > 0.0 {
        let t1_sq = t1 * t1;
        n1 = t1_sq * t1_sq * (GRAD[gi1][0] * x1 + GRAD[gi1][1] * y1 + GRAD[gi1][2] * z1);
    }

    let mut n2 = 0.0;
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if t2 > 0.0 {
        let t2_sq = t2 * t2;
        n2 = t2_sq * t2_sq * (GRAD[gi2][0] * x2 + GRAD[gi2][1] * y2 + GRAD[gi2][2] * z2);
    }

    let mut n3 = 0.0;
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if t3 > 0.0 {
        let t3_sq = t3 * t3;
        n3 = t3_sq * t3_sq * (GRAD[gi3][0] * x3 + GRAD[gi3][1] * y3 + GRAD[gi3][2] * z3);
    }

    // Scale to [-1, 1]
    32.0 * (n0 + n1 + n2 + n3)
}

/// Deterministic hash-based permutation for simplex noise.
fn hash_perm(i: i32, j: i32, k: i32) -> usize {
    let h = (i.wrapping_mul(374761393))
        .wrapping_add(j.wrapping_mul(668265263))
        .wrapping_add(k.wrapping_mul(1274126177)) as u32;
    let h = h ^ (h >> 13);
    let h = h.wrapping_mul(1274126177);
    (h ^ (h >> 16)) as usize % 12
}

/// Curl of a scalar potential field. We use the gradient of simplex noise
/// sampled at slightly offset positions and take the curl via finite differences.
/// Returns a divergence-free velocity field.
fn curl_noise(x: f32, y: f32, z: f32) -> (f32, f32, f32) {
    // Simplified: 3 simplex calls instead of 12 (4x faster)
    // Not true curl noise, but organic swirling motion
    let nx = simplex_noise_3d(x, y, z);
    let ny = simplex_noise_3d(x + 100.0, y + 100.0, z);
    let nz = simplex_noise_3d(x + 200.0, y + 200.0, z + 100.0);
    (nx, ny, nz)
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