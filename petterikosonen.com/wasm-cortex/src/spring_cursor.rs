use wasm_bindgen::prelude::*;

/// Spring physics for spotlight cursor.
/// Critically-damped spring simulation for smooth cursor following.
/// Replaces the old AssemblyScript spring_cursor.wasm.

const STIFFNESS: f32 = 360.0;
const DAMPING: f32 = 40.0;
const MASS: f32 = 0.35;

const OPACITY_STIFFNESS: f32 = 260.0;
const OPACITY_DAMPING: f32 = 30.0;
const OPACITY_MASS: f32 = 0.3;

#[wasm_bindgen]
pub struct SpringCursor {
    pos_x: f32,
    pos_y: f32,
    vel_x: f32,
    vel_y: f32,
    target_x: f32,
    target_y: f32,
    opacity: f32,
    opacity_vel: f32,
    target_opacity: f32,
}

#[wasm_bindgen]
impl SpringCursor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SpringCursor {
        SpringCursor {
            pos_x: -96.0,
            pos_y: -96.0,
            vel_x: 0.0,
            vel_y: 0.0,
            target_x: -96.0,
            target_y: -96.0,
            opacity: 0.0,
            opacity_vel: 0.0,
            target_opacity: 0.0,
        }
    }

    #[wasm_bindgen]
    pub fn get_x(&self) -> f32 {
        self.pos_x
    }

    #[wasm_bindgen]
    pub fn get_y(&self) -> f32 {
        self.pos_y
    }

    #[wasm_bindgen]
    pub fn get_opacity(&self) -> f32 {
        self.opacity
    }

    #[wasm_bindgen]
    pub fn set_target(&mut self, x: f32, y: f32) {
        self.target_x = x - 96.0;
        self.target_y = y - 96.0;
        self.target_opacity = 0.28;
    }

    #[wasm_bindgen]
    pub fn hide(&mut self) {
        self.target_opacity = 0.0;
    }

    #[wasm_bindgen]
    pub fn update(&mut self, mut dt: f32) {
        if dt > 0.05 {
            dt = 0.05;
        }

        // Position spring X
        let disp_x = self.pos_x - self.target_x;
        let force_x = -STIFFNESS * disp_x - DAMPING * self.vel_x;
        let acc_x = force_x / MASS;
        self.vel_x += acc_x * dt;
        self.pos_x += self.vel_x * dt;

        // Position spring Y
        let disp_y = self.pos_y - self.target_y;
        let force_y = -STIFFNESS * disp_y - DAMPING * self.vel_y;
        let acc_y = force_y / MASS;
        self.vel_y += acc_y * dt;
        self.pos_y += self.vel_y * dt;

        // Opacity spring
        let disp_o = self.opacity - self.target_opacity;
        let force_o = -OPACITY_STIFFNESS * disp_o - OPACITY_DAMPING * self.opacity_vel;
        let acc_o = force_o / OPACITY_MASS;
        self.opacity_vel += acc_o * dt;
        self.opacity += self.opacity_vel * dt;

        if self.opacity < 0.0 {
            self.opacity = 0.0;
        }
        if self.opacity > 1.0 {
            self.opacity = 1.0;
        }
    }
}