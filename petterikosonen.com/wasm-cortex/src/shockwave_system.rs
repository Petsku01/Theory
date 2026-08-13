use wasm_bindgen::prelude::*;

/// Shockwave system: expanding ring effects triggered on node selection.
/// Max 3 simultaneous shockwaves (1 on mobile).
///
/// Data per active shockwave (6 f32s):
/// [cx, cy, cz, radius, opacity, intensity]

const MAX_SHOCKWAVES: usize = 3;
const SHOCKWAVE_STRIDE: usize = 6;

#[wasm_bindgen]
pub struct ShockwaveSystem {
    /// Active shockwave data (MAX_SHOCKWAVES * SHOCKWAVE_STRIDE f32s)
    data: Vec<f32>,
    /// Current radius of each shockwave slot
    radii: Vec<f32>,
    /// Max radius of each shockwave slot
    max_radii: Vec<f32>,
    /// Current age (seconds) of each slot; -1.0 = inactive
    ages: Vec<f32>,
    /// Center position [x, y, z] per slot
    centers: Vec<[f32; 3]>,
    /// Expansion speed (units/second) per slot
    speeds: Vec<f32>,
    /// Max concurrent shockwaves (3 desktop, 1 mobile)
    max_count: usize,
}

#[wasm_bindgen]
impl ShockwaveSystem {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ShockwaveSystem {
        ShockwaveSystem {
            data: vec![0.0f32; MAX_SHOCKWAVES * SHOCKWAVE_STRIDE],
            radii: vec![0.0; MAX_SHOCKWAVES],
            max_radii: vec![0.0; MAX_SHOCKWAVES],
            ages: vec![-1.0; MAX_SHOCKWAVES],
            centers: vec![[0.0, 0.0, 0.0]; MAX_SHOCKWAVES],
            speeds: vec![0.0; MAX_SHOCKWAVES],
            max_count: MAX_SHOCKWAVES,
        }
    }

    /// Set max concurrent shockwaves (3 desktop, 1 mobile).
    pub fn set_max_count(&mut self, max_count: usize) {
        self.max_count = max_count.min(MAX_SHOCKWAVES).max(1);
    }

    /// Trigger a new shockwave at (cx, cy, cz) with given max_radius and speed.
    /// Finds the oldest (or first inactive) slot to reuse.
    pub fn trigger(
        &mut self,
        cx: f32,
        cy: f32,
        cz: f32,
        max_radius: f32,
        speed: f32,
    ) {
        // Find slot: first inactive, or oldest active
        let mut slot = 0usize;
        let mut oldest_age = f32::MIN;
        let mut found_inactive = false;

        for i in 0..self.max_count {
            if self.ages[i] < 0.0 {
                slot = i;
                found_inactive = true;
                break;
            }
            // Track oldest for replacement
            if self.ages[i] > oldest_age {
                oldest_age = self.ages[i];
                slot = i;
            }
        }
        let _ = found_inactive; // suppress unused warning

        self.ages[slot] = 0.0;
        self.radii[slot] = 0.0;
        self.max_radii[slot] = max_radius;
        self.speeds[slot] = speed;
        self.centers[slot] = [cx, cy, cz];
    }

    /// Update all shockwaves. Returns pointer to data buffer (max_count * 6 f32s).
    /// delta: frame delta time in seconds.
    /// Returns data where each slot is [cx, cy, cz, radius, opacity, intensity].
    /// Inactive slots have opacity=0 and intensity=0.
    pub fn update(&mut self, delta: f32) -> *const f32 {
        for i in 0..MAX_SHOCKWAVES {
            let base = i * SHOCKWAVE_STRIDE;
            if self.ages[i] < 0.0 || i >= self.max_count {
                // Inactive slot
                self.data[base] = 0.0;
                self.data[base + 1] = 0.0;
                self.data[base + 2] = 0.0;
                self.data[base + 3] = 0.0; // radius
                self.data[base + 4] = 0.0; // opacity
                self.data[base + 5] = 0.0; // intensity
                continue;
            }

            // Age this shockwave
            self.ages[i] += delta;
            // Expand radius
            self.radii[i] += self.speeds[i] * delta;

            let radius = self.radii[i];
            let max_r = self.max_radii[i];
            let progress = if max_r > 0.001 { radius / max_r } else { 1.0 };

            if progress >= 1.0 {
                // Deactivate
                self.ages[i] = -1.0;
                self.data[base] = self.centers[i][0];
                self.data[base + 1] = self.centers[i][1];
                self.data[base + 2] = self.centers[i][2];
                self.data[base + 3] = 0.0;
                self.data[base + 4] = 0.0; // opacity
                self.data[base + 5] = 0.0; // intensity
                continue;
            }

            // Opacity: fade out as it expands (1 - progress)^2 for nice falloff
            let opacity = (1.0 - progress) * (1.0 - progress);
            // Intensity: starts strong, decays
            let intensity = 1.0 - progress;

            self.data[base] = self.centers[i][0];
            self.data[base + 1] = self.centers[i][1];
            self.data[base + 2] = self.centers[i][2];
            self.data[base + 3] = radius;
            self.data[base + 4] = opacity;
            self.data[base + 5] = intensity;
        }

        self.data.as_ptr()
    }

    pub fn data_ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }

    pub fn max_slots(&self) -> usize {
        MAX_SHOCKWAVES
    }

    pub fn stride(&self) -> usize {
        SHOCKWAVE_STRIDE
    }

    /// Get number of currently active shockwaves.
    pub fn active_count(&self) -> usize {
        let mut count = 0;
        for i in 0..self.max_count {
            if self.ages[i] >= 0.0 {
                count += 1;
            }
        }
        count
    }
}