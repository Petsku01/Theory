use wasm_bindgen::prelude::*;

/// Fibonacci spiral layout for cluster nodes.
/// Matches the JS computePositions algorithm in utils.ts.
/// Deterministic: same seeds = same positions.

const GOLDEN_ANGLE: f32 = 2.399963229728653; // PI * (3 - sqrt(5))

/// Simple deterministic PRNG matching JS seededRandom.
/// JS: s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646;
struct SeededRng {
    state: u64,
}

impl SeededRng {
    fn new(seed: u32) -> Self {
        SeededRng { state: seed as u64 }
    }

    fn next(&mut self) -> f32 {
        self.state = (self.state * 16807) % 2147483647;
        (self.state - 1) as f32 / 2147483646.0
    }
}

/// LayoutSystem computes Fibonacci spiral positions for cluster nodes.
/// Positions are stored in a flat Vec<f32> (count * 3).
/// JS reads via data_ptr() + Float32Array view into WASM memory.
#[wasm_bindgen]
pub struct LayoutSystem {
    positions: Vec<f32>,
}

#[wasm_bindgen]
impl LayoutSystem {
    #[wasm_bindgen(constructor)]
    pub fn new() -> LayoutSystem {
        LayoutSystem {
            positions: Vec::new(),
        }
    }

    /// Compute positions for a single cluster of nodes.
    /// seeds: per-node seed values (from JS: node.id.length * 127 + i * 31)
    /// Passed as raw pointer + length into WASM linear memory.
    /// center_x/y/z: cluster center position
    /// Returns pointer to flat positions array (count * 3 f32s).
    pub fn compute_cluster(
        &mut self,
        seeds_ptr: *const u32,
        seeds_len: usize,
        center_x: f32,
        center_y: f32,
        center_z: f32,
    ) -> *const f32 {
        // Safety: seeds_ptr points to a Uint32Array written by JS into WASM memory.
        let seeds = unsafe { std::slice::from_raw_parts(seeds_ptr, seeds_len) };
        let count = seeds.len();

        if count <= 1 {
            self.positions = vec![center_x, center_y, center_z];
            return self.positions.as_ptr();
        }

        let spread = 3.2 + count as f32 * 0.3;
        let mut positions = vec![0.0f32; count * 3];

        for i in 0..count {
            let angle = i as f32 * GOLDEN_ANGLE;
            let r = ((i as f32 + 0.5) / count as f32).sqrt() * spread;

            let mut rng = SeededRng::new(seeds[i]);
            let jx = (rng.next() - 0.5) * 0.3;
            let jy = (rng.next() - 0.5) * 1.0;
            let jz = (rng.next() - 0.5) * 0.3;

            let off_x = angle.cos() * r + jx;
            let off_y = (angle * 0.7 + i as f32 * 1.1).sin() * 0.8 + jy;
            let off_z = angle.sin() * r + jz;

            positions[i * 3] = center_x + off_x;
            positions[i * 3 + 1] = center_y + off_y;
            positions[i * 3 + 2] = center_z + off_z;
        }

        self.positions = positions;
        self.positions.as_ptr()
    }

    /// Number of nodes (positions.len() / 3)
    pub fn len(&self) -> usize {
        self.positions.len() / 3
    }

    /// Raw pointer to positions data
    pub fn data_ptr(&self) -> *const f32 {
        self.positions.as_ptr()
    }
}