use wasm_bindgen::prelude::*;

/// Camera system: lerp toward target + sinusoidal shake decay.
/// Matches CameraController.tsx computation but runs in WASM.
///
/// Data layout (6 f32s):
/// [cam_x, cam_y, cam_z, target_x, target_y, target_z]
/// These are the desired camera position and look-at target after lerp + shake.

const SHAKE_FREQUENCY: f32 = 30.0;
const SHAKE_DECAY: f32 = 10.0;
const SHAKE_AMPLITUDE: f32 = 0.03;
const SHAKE_DURATION: f32 = 0.3;
const LERP_CAM_SPEED: f32 = 1.2;
const LERP_TARGET_SPEED: f32 = 1.5;
const ARRIVAL_THRESHOLD: f32 = 0.3;
const CAMERA_OFFSET: [f32; 3] = [0.0, 2.0, 4.0];

#[wasm_bindgen]
pub struct CameraSystem {
    // Current camera position
    cam_pos: [f32; 3],
    // Current look-at target
    target_pos: [f32; 3],
    // Desired target (set when target changes)
    desired_target: [f32; 3],
    // Whether we have a target
    has_target: bool,
    // Whether we're actively lerping
    is_lerping: bool,
    // Shake state
    shake_start_time: f32,
    shake_direction: [f32; 3],
    // Output buffer: [cam_x, cam_y, cam_z, target_x, target_y, target_z]
    output: Vec<f32>,
}

const OUTPUT_LEN: usize = 6;

#[wasm_bindgen]
impl CameraSystem {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CameraSystem {
        CameraSystem {
            cam_pos: [0.0, 8.0, 16.0],
            target_pos: [0.0, 0.0, 0.0],
            desired_target: [0.0, 0.0, 0.0],
            has_target: false,
            is_lerping: false,
            shake_start_time: -1.0,
            shake_direction: [0.0, 0.0, 0.0],
            output: vec![0.0f32; OUTPUT_LEN],
        }
    }

    /// Set the internal camera position and look-at target.
    /// Used to sync WASM state with current Three.js camera on init.
    pub fn set_position(&mut self, cx: f32, cy: f32, cz: f32, tx: f32, ty: f32, tz: f32) {
        self.cam_pos = [cx, cy, cz];
        self.target_pos = [tx, ty, tz];
    }

    /// Set a new target. Resets lerp state.
    /// tx/ty/tz: target position
    pub fn set_target(&mut self, tx: f32, ty: f32, tz: f32) {
        self.desired_target = [tx, ty, tz];
        self.has_target = true;
        self.is_lerping = true;
    }

    /// Clear target (deselect). Stops lerping.
    pub fn clear_target(&mut self) {
        self.has_target = false;
        self.is_lerping = false;
    }

    /// Mark that user took control (stops auto-lerp).
    pub fn user_controlled(&mut self) {
        self.is_lerping = false;
    }

    /// Trigger a shake effect.
    /// dir_x/y/z: normalized shake direction
    /// current_time: performance.now() in seconds
    pub fn trigger_shake(&mut self, dir_x: f32, dir_y: f32, dir_z: f32, current_time: f32) {
        self.shake_start_time = current_time;
        self.shake_direction = [dir_x, dir_y, dir_z];
    }

    /// Per-frame update. Returns pointer to output buffer (6 f32s).
    /// delta: frame delta time
    /// current_time: performance.now() in seconds (for shake elapsed)
    /// Returns [cam_x, cam_y, cam_z, target_x, target_y, target_z]
    pub fn update(&mut self, delta: f32, current_time: f32) -> *const f32 {
        // Lerp toward target
        if self.has_target && self.is_lerping {
            let desired_cam = [
                self.desired_target[0] + CAMERA_OFFSET[0],
                self.desired_target[1] + CAMERA_OFFSET[1],
                self.desired_target[2] + CAMERA_OFFSET[2],
            ];

            // Lerp camera position: pos += (desired - pos) * (delta * speed)
            let lerp_factor_cam = (delta * LERP_CAM_SPEED).min(1.0);
            self.cam_pos[0] += (desired_cam[0] - self.cam_pos[0]) * lerp_factor_cam;
            self.cam_pos[1] += (desired_cam[1] - self.cam_pos[1]) * lerp_factor_cam;
            self.cam_pos[2] += (desired_cam[2] - self.cam_pos[2]) * lerp_factor_cam;

            // Lerp look-at target
            let lerp_factor_target = (delta * LERP_TARGET_SPEED).min(1.0);
            self.target_pos[0] += (self.desired_target[0] - self.target_pos[0]) * lerp_factor_target;
            self.target_pos[1] += (self.desired_target[1] - self.target_pos[1]) * lerp_factor_target;
            self.target_pos[2] += (self.desired_target[2] - self.target_pos[2]) * lerp_factor_target;

            // Check arrival
            let dx = desired_cam[0] - self.cam_pos[0];
            let dy = desired_cam[1] - self.cam_pos[1];
            let dz = desired_cam[2] - self.cam_pos[2];
            let dist = (dx * dx + dy * dy + dz * dz).sqrt();
            if dist < ARRIVAL_THRESHOLD {
                self.is_lerping = false;
            }
        }

        // Apply shake
        if self.shake_start_time >= 0.0 {
            let elapsed = current_time - self.shake_start_time;
            if elapsed < SHAKE_DURATION {
                let magnitude = SHAKE_AMPLITUDE
                    * (SHAKE_FREQUENCY * elapsed).sin()
                    * (-SHAKE_DECAY * elapsed).exp();
                self.cam_pos[0] += self.shake_direction[0] * magnitude;
                self.cam_pos[1] += self.shake_direction[1] * magnitude;
                self.cam_pos[2] += self.shake_direction[2] * magnitude;
            }
        }

        // Write output
        self.output[0] = self.cam_pos[0];
        self.output[1] = self.cam_pos[1];
        self.output[2] = self.cam_pos[2];
        self.output[3] = self.target_pos[0];
        self.output[4] = self.target_pos[1];
        self.output[5] = self.target_pos[2];

        self.output.as_ptr()
    }

    /// Whether the system is currently lerping
    pub fn is_lerping(&self) -> bool {
        self.is_lerping
    }

    /// Whether the system has a target
    pub fn has_target(&self) -> bool {
        self.has_target
    }

    /// Output data pointer
    pub fn data_ptr(&self) -> *const f32 {
        self.output.as_ptr()
    }
}