use wasm_bindgen::prelude::*;

/// Node animation system: computes breathing, bob, ring rotation, emissive lerp.
/// Matches NetworkNode.tsx useFrame computation but runs in WASM.
/// JS applies the computed values to Three.js objects.
///
/// Output per node (16 f32s):
/// [scale, pos_y, outer_emissive, core_emissive, core_opacity,
///  ring1_rot_x, ring1_rot_y, ring1_rot_z, ring1_opacity,
///  ring2_rot_x, ring2_rot_y, ring2_rot_z, ring2_opacity, _pad0, _pad1, _pad2]
///
/// The system computes for ALL nodes in one update call.
/// JS reads the flat output array and applies to each node's refs.

const BREATH_SPEED_ACTIVE: f32 = 4.5;
const BREATH_SPEED_IDLE: f32 = 2.0;
const BREATH_AMP_ACTIVE: f32 = 0.08;
const BREATH_AMP_IDLE: f32 = 0.04;

const BOB_AMP_ACTIVE: f32 = 0.1;
const BOB_AMP_IDLE: f32 = 0.04;
const BOB_SPEED: f32 = 0.7;

const OUTER_EMISSIVE_ACTIVE: f32 = 6.0;
const OUTER_EMISSIVE_IDLE: f32 = 1.8;

const CORE_EMISSIVE_ACTIVE: f32 = 8.0;
const CORE_OPACITY_ACTIVE: f32 = 0.8;
const CORE_OPACITY_IDLE: f32 = 0.45;

const RING1_SPEED_ACTIVE: f32 = 1.2;
const RING1_SPEED_IDLE: f32 = 0.4;
const RING2_SPEED_ACTIVE: f32 = -0.8;
const RING2_SPEED_IDLE: f32 = -0.25;

const RING1_OPACITY_ACTIVE: f32 = 0.6;
const RING1_OPACITY_IDLE: f32 = 0.3;
const RING2_OPACITY_ACTIVE: f32 = 0.45;
const RING2_OPACITY_IDLE: f32 = 0.2;

const LERP_DELTA: f32 = 8.0; // delta multiplier for outer emissive
const LERP_DELTA_CORE: f32 = 6.0;
const LERP_DELTA_OPACITY: f32 = 5.0;
const LERP_DELTA_RING: f32 = 4.0;

const OUTPUT_STRIDE: usize = 16;

#[wasm_bindgen]
pub struct NodeAnimationSystem {
    /// Per-node state: [prev_outer_emissive, prev_core_emissive, prev_core_opacity,
    ///                    prev_ring1_opacity, prev_ring2_opacity] = 5 f32s per node
    state: Vec<f32>,
    /// Output buffer: count * OUTPUT_STRIDE f32s
    output: Vec<f32>,
    /// Per-node phase offsets
    phases: Vec<f32>,
    /// Per-node tilt angles [tilt1_x, tilt1_y, tilt2_x, tilt2_y, tilt2_z] = 5 per node
    tilts: Vec<f32>,
    node_count: usize,
}

const STATE_STRIDE: usize = 5;
const TILT_STRIDE: usize = 5;

#[wasm_bindgen]
impl NodeAnimationSystem {
    #[wasm_bindgen(constructor)]
    pub fn new() -> NodeAnimationSystem {
        NodeAnimationSystem {
            state: Vec::new(),
            output: Vec::new(),
            phases: Vec::new(),
            tilts: Vec::new(),
            node_count: 0,
        }
    }

    /// Initialize with node phases and tilt angles.
    /// phases_ptr: per-node phase offset (count f32s)
    /// tilts_ptr: per-node tilt angles (count * 5 f32s)
    /// count: number of nodes
    pub fn init(
        &mut self,
        phases_ptr: *const f32,
        tilts_ptr: *const f32,
        count: usize,
    ) {
        self.node_count = count;
        self.phases = unsafe { std::slice::from_raw_parts(phases_ptr, count) }.to_vec();
        self.tilts = unsafe { std::slice::from_raw_parts(tilts_ptr, count * TILT_STRIDE) }.to_vec();
        self.state = vec![0.0f32; count * STATE_STRIDE];
        self.output = vec![0.0f32; count * OUTPUT_STRIDE];

        // Initialize state with idle values
        for i in 0..count {
            let s = i * STATE_STRIDE;
            self.state[s] = OUTER_EMISSIVE_IDLE;
            // Init core emissive to idle pulse at t=0: 1.5 + sin(phase) * 0.5
            let phase = self.phases[i];
            self.state[s + 1] = 1.5 + (phase).sin() * 0.5;
            self.state[s + 2] = CORE_OPACITY_IDLE;
            self.state[s + 3] = RING1_OPACITY_IDLE;
            self.state[s + 4] = RING2_OPACITY_IDLE;
        }
    }

    /// Update all nodes. Returns pointer to output buffer (count * 16 f32s).
    /// elapsed: clock elapsed time
    /// delta: frame delta time
    /// active_flags: per-node 0 (idle) or 1 (active/hovered/selected)
    pub fn update(
        &mut self,
        elapsed: f32,
        delta: f32,
        active_flags_ptr: *const u32,
    ) -> *const f32 {
        let count = self.node_count;
        if count == 0 {
            return self.output.as_ptr();
        }

        let flags = unsafe { std::slice::from_raw_parts(active_flags_ptr, count) };
        let delta_clamped = delta.min(0.1); // clamp delta to avoid jumps

        // Hoist lerp factors outside the loop (same for all nodes)
        let lerp_factor_outer = (delta_clamped * LERP_DELTA).min(1.0);
        let lerp_factor_core = (delta_clamped * LERP_DELTA_CORE).min(1.0);
        let lerp_factor_op = (delta_clamped * LERP_DELTA_OPACITY).min(1.0);
        let lerp_factor_ring = (delta_clamped * LERP_DELTA_RING).min(1.0);

        for i in 0..count {
            let phase = self.phases[i];
            let active = flags[i] != 0;
            let t = elapsed;

            // Breathing scale
            let breath_speed = if active { BREATH_SPEED_ACTIVE } else { BREATH_SPEED_IDLE };
            let breath_amp = if active { BREATH_AMP_ACTIVE } else { BREATH_AMP_IDLE };
            let scale = 1.0 + (t * breath_speed + phase).sin() * breath_amp;

            // Vertical bob
            let bob_amp = if active { BOB_AMP_ACTIVE } else { BOB_AMP_IDLE };
            let pos_y = (t * BOB_SPEED + phase).sin() * bob_amp;

            // Outer emissive lerp
            let s = i * STATE_STRIDE;
            let target_outer = if active { OUTER_EMISSIVE_ACTIVE } else { OUTER_EMISSIVE_IDLE };
            self.state[s] += (target_outer - self.state[s]) * lerp_factor_outer;

            // Core emissive pulse
            let core_pulse = 1.5 + (t * 3.0 + phase).sin() * 0.5;
            let target_core = if active { CORE_EMISSIVE_ACTIVE } else { core_pulse };
            self.state[s + 1] += (target_core - self.state[s + 1]) * lerp_factor_core;

            // Core opacity
            let target_core_op = if active { CORE_OPACITY_ACTIVE } else { CORE_OPACITY_IDLE };
            self.state[s + 2] += (target_core_op - self.state[s + 2]) * lerp_factor_op;

            // Ring rotations
            let tilt = i * TILT_STRIDE;
            let ring1_speed_z = if active { RING1_SPEED_ACTIVE } else { RING1_SPEED_IDLE };
            let ring2_speed_z = if active { RING2_SPEED_ACTIVE } else { RING2_SPEED_IDLE };

            let ring1_rot_x = self.tilts[tilt];
            let ring1_rot_y = self.tilts[tilt + 1] + t * 0.15;
            let ring1_rot_z = t * ring1_speed_z;

            let ring2_rot_x = self.tilts[tilt + 2];
            let ring2_rot_y = self.tilts[tilt + 3] - t * 0.1;
            let ring2_rot_z = t * ring2_speed_z;

            // Ring opacity lerp
            let target_ring1_op = if active { RING1_OPACITY_ACTIVE } else { RING1_OPACITY_IDLE };
            let target_ring2_op = if active { RING2_OPACITY_ACTIVE } else { RING2_OPACITY_IDLE };
            self.state[s + 3] += (target_ring1_op - self.state[s + 3]) * lerp_factor_ring;
            self.state[s + 4] += (target_ring2_op - self.state[s + 4]) * lerp_factor_ring;

            // Write output
            let o = i * OUTPUT_STRIDE;
            self.output[o] = scale;
            self.output[o + 1] = pos_y;
            self.output[o + 2] = self.state[s];       // outer emissive
            self.output[o + 3] = self.state[s + 1];   // core emissive
            self.output[o + 4] = self.state[s + 2];   // core opacity
            self.output[o + 5] = ring1_rot_x;
            self.output[o + 6] = ring1_rot_y;
            self.output[o + 7] = ring1_rot_z;
            self.output[o + 8] = self.state[s + 3];   // ring1 opacity
            self.output[o + 9] = ring2_rot_x;
            self.output[o + 10] = ring2_rot_y;
            self.output[o + 11] = ring2_rot_z;
            self.output[o + 12] = self.state[s + 4];  // ring2 opacity
            // o+13..15: padding (unused)
        }

        self.output.as_ptr()
    }

    pub fn data_ptr(&self) -> *const f32 {
        self.output.as_ptr()
    }

    pub fn len(&self) -> usize {
        self.node_count
    }

    pub fn stride(&self) -> usize {
        OUTPUT_STRIDE
    }
}