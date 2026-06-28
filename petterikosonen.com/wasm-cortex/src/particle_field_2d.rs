use wasm_bindgen::prelude::*;

/// 2D particle field for canvas-based background effects.
/// Replaces the old AssemblyScript particles.wasm.
/// Used by WasmParticleField (ClientEffects, layout-level background).
///
/// Memory layout per particle (12 f32s = 48 bytes):
/// [x, y, vx, vy, life, max_life, size, hue, ax, ay, opacity, phase]

const STRIDE: usize = 12;
const MAX_PARTICLES: usize = 3000;
const MOUSE_RADIUS: f32 = 200.0;
const MOUSE_FORCE: f32 = 0.08;
const DAMPING: f32 = 0.985;
const DRIFT_SPEED: f32 = 0.15;

struct Lcg {
    seed: u32,
}

impl Lcg {
    fn new(seed: u32) -> Self {
        Lcg { seed }
    }

    fn rand(&mut self) -> f32 {
        self.seed = self.seed.wrapping_mul(1103515245).wrapping_add(12345);
        ((self.seed >> 16) & 0x7FFF) as f32 / 32767.0
    }

    fn rand_range(&mut self, min: f32, max: f32) -> f32 {
        min + self.rand() * (max - min)
    }
}

#[wasm_bindgen]
pub struct ParticleField2D {
    data: Vec<f32>,
    count: usize,
    rng: Lcg,
}

#[wasm_bindgen]
impl ParticleField2D {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ParticleField2D {
        ParticleField2D {
            data: Vec::new(),
            count: 0,
            rng: Lcg::new(0xDEAD_BEEF),
        }
    }

    #[wasm_bindgen]
    pub fn init(&mut self, n: usize, width: f32, height: f32, rng_seed: u32) {
        self.rng = Lcg::new(rng_seed);
        self.count = n.min(MAX_PARTICLES);
        self.data = vec![0.0f32; self.count * STRIDE];

        for i in 0..self.count {
            let base = i * STRIDE;
            self.data[base] = self.rng.rand() * width;
            self.data[base + 1] = self.rng.rand() * height;
            self.data[base + 2] = self.rng.rand_range(-DRIFT_SPEED, DRIFT_SPEED);
            self.data[base + 3] = self.rng.rand_range(-DRIFT_SPEED, DRIFT_SPEED);
            let max_life = self.rng.rand_range(120.0, 360.0);
            self.data[base + 4] = self.rng.rand() * max_life;
            self.data[base + 5] = max_life;
            self.data[base + 6] = self.rng.rand_range(1.0, 3.5);
            self.data[base + 7] = self.rng.rand_range(170.0, 220.0);
            self.data[base + 8] = 0.0;
            self.data[base + 9] = 0.0;
            self.data[base + 10] = 1.0;
            self.data[base + 11] = self.rng.rand() * 6.28318;
        }
    }

    fn respawn(&mut self, i: usize, width: f32, height: f32) {
        let base = i * STRIDE;
        self.data[base] = self.rng.rand() * width;
        self.data[base + 1] = self.rng.rand() * height;
        self.data[base + 2] = self.rng.rand_range(-DRIFT_SPEED, DRIFT_SPEED);
        self.data[base + 3] = self.rng.rand_range(-DRIFT_SPEED, DRIFT_SPEED);
        let max_life = self.rng.rand_range(120.0, 360.0);
        self.data[base + 4] = max_life;
        self.data[base + 5] = max_life;
        self.data[base + 6] = self.rng.rand_range(1.0, 3.5);
        self.data[base + 7] = self.rng.rand_range(170.0, 220.0);
        self.data[base + 8] = 0.0;
        self.data[base + 9] = 0.0;
        self.data[base + 10] = 1.0;
        self.data[base + 11] = self.rng.rand() * 6.28318;
    }

    #[wasm_bindgen]
    pub fn update(
        &mut self,
        width: f32,
        height: f32,
        mouse_x: f32,
        mouse_y: f32,
        mouse_active: bool,
        time: f32,
    ) {
        let count = self.count;
        for i in 0..count {
            let base = i * STRIDE;
            let mut x = self.data[base];
            let mut y = self.data[base + 1];
            let mut vx = self.data[base + 2];
            let mut vy = self.data[base + 3];
            let mut life = self.data[base + 4];
            let max_life = self.data[base + 5];
            let phase = self.data[base + 11];

            life -= 1.0;
            if life <= 0.0 {
                self.respawn(i, width, height);
                continue;
            }

            if mouse_active {
                let dx = mouse_x - x;
                let dy = mouse_y - y;
                let dist_sq = dx * dx + dy * dy;
                let dist = dist_sq.sqrt();

                if dist < MOUSE_RADIUS && dist > 1.0 {
                    let force = MOUSE_FORCE * (1.0 - dist / MOUSE_RADIUS);
                    vx += (dx / dist) * force;
                    vy += (dy / dist) * force;
                }
            }

            let sin_offset = (time * 0.001 + phase).sin();
            vx += sin_offset * 0.003;
            vy += (time * 0.0008 + phase).cos() * 0.003;

            vx *= DAMPING;
            vy *= DAMPING;

            x += vx;
            y += vy;

            if x < -20.0 {
                x += width + 40.0;
            }
            if x > width + 20.0 {
                x -= width + 40.0;
            }
            if y < -20.0 {
                y += height + 40.0;
            }
            if y > height + 20.0 {
                y -= height + 40.0;
            }

            let life_ratio = life / max_life;
            let opacity = if life_ratio > 0.9 {
                (1.0 - life_ratio) * 10.0
            } else if life_ratio < 0.1 {
                life_ratio * 10.0
            } else {
                1.0
            };

            self.data[base] = x;
            self.data[base + 1] = y;
            self.data[base + 2] = vx;
            self.data[base + 3] = vy;
            self.data[base + 4] = life;
            self.data[base + 10] = opacity;
        }
    }

    #[wasm_bindgen]
    pub fn count(&self) -> usize {
        self.count
    }

    #[wasm_bindgen]
    pub fn data_ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }

    #[wasm_bindgen]
    pub fn stride(&self) -> usize {
        STRIDE
    }
}