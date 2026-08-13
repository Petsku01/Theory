use wasm_bindgen::prelude::*;

/// Edge system: computes cylinder geometry and pulse positions for network edges.
/// Matches NetworkEdges.tsx computation but runs in WASM.
///
/// Data layout per edge (8 f32s):
/// [mid_x, mid_y, mid_z, length, quat_x, quat_y, quat_z, quat_w]
///
/// Pulse data per edge (3 f32s):
/// [pulse_x, pulse_y, pulse_z]

#[wasm_bindgen]
pub struct EdgeSystem {
    /// Cylinder data: per edge [mid_x, mid_y, mid_z, length, dir_x, dir_y, dir_z, quat_w]
    cylinder_data: Vec<f32>,
    /// Pulse positions: per edge [px, py, pz]
    pulse_data: Vec<f32>,
    /// Per-edge pulse offsets (randomized phase)
    pulse_offsets: Vec<f32>,
    /// Per-edge pulse speeds
    pulse_speeds: Vec<f32>,
    /// Edge count
    edge_count: usize,
    /// Highlight flags per edge (0 = not highlighted, 1 = highlighted)
    highlights: Vec<u32>,
}

const CYLINDER_STRIDE: usize = 8;
const PULSE_STRIDE: usize = 3;

#[wasm_bindgen]
impl EdgeSystem {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EdgeSystem {
        EdgeSystem {
            cylinder_data: Vec::new(),
            pulse_data: Vec::new(),
            pulse_offsets: Vec::new(),
            pulse_speeds: Vec::new(),
            edge_count: 0,
            highlights: Vec::new(),
        }
    }

    /// Initialize edges from node positions and edge list.
    /// from_positions: flat array [x0,y0,z0, x1,y1,z1, ...] for "from" nodes
    /// to_positions: flat array [x0,y0,z0, x1,y1,z1, ...] for "to" nodes
    /// edge_indices: indices into the position arrays (from_idx, to_idx pairs)
    /// highlight_flags: 1 if this edge is highlighted (connects selected node), 0 otherwise
    /// Returns pointer to cylinder data.
    pub fn init_edges(
        &mut self,
        from_positions: *const f32,
        to_positions: *const f32,
        edge_count: usize,
        highlight_flags: *const u32,
    ) -> *const f32 {
        self.edge_count = edge_count;
        self.cylinder_data = vec![0.0f32; edge_count * CYLINDER_STRIDE];
        self.pulse_data = vec![0.0f32; edge_count * PULSE_STRIDE];
        self.pulse_offsets = vec![0.0f32; edge_count];
        self.pulse_speeds = vec![0.0f32; edge_count];
        self.highlights = vec![0u32; edge_count];

        let from_pos = unsafe { std::slice::from_raw_parts(from_positions, edge_count * 3) };
        let to_pos = unsafe { std::slice::from_raw_parts(to_positions, edge_count * 3) };
        let flags = unsafe { std::slice::from_raw_parts(highlight_flags, edge_count) };

        for i in 0..edge_count {
            let fx = from_pos[i * 3];
            let fy = from_pos[i * 3 + 1];
            let fz = from_pos[i * 3 + 2];
            let tx = to_pos[i * 3];
            let ty = to_pos[i * 3 + 1];
            let tz = to_pos[i * 3 + 2];

            // Direction vector
            let dx = tx - fx;
            let dy = ty - fy;
            let dz = tz - fz;
            let len = (dx * dx + dy * dy + dz * dz).sqrt();

            // Midpoint
            let mid_x = (fx + tx) * 0.5;
            let mid_y = (fy + ty) * 0.5;
            let mid_z = (fz + tz) * 0.5;

            // Normalized direction
            let inv_len = if len > 0.001 { 1.0 / len } else { 0.0 };
            let ndx = dx * inv_len;
            let ndy = dy * inv_len;
            let ndz = dz * inv_len;

            // Quaternion from (0,1,0) to direction
            // Quaternion from (0,1,0) to direction
            // axis = cross((0,1,0), dir) = (ndz, 0, -ndx)
            let dot = ndy; // dot product with (0,1,0)
            let axis_x = ndz;
            let axis_y = 0.0;
            let axis_z = -ndx;
            let axis_len = (axis_x * axis_x + axis_z * axis_z).sqrt();

            let (qx, qy, qz, qw) = if axis_len < 0.0001 {
                // Parallel or anti-parallel
                if dot > 0.0 {
                    // Same direction: identity quaternion
                    (0.0, 0.0, 0.0, 1.0)
                } else {
                    // Opposite: 180 degree rotation around X axis
                    (1.0, 0.0, 0.0, 0.0)
                }
            } else {
                // Half-angle quaternion
                let half_angle = dot.acos() * 0.5;
                let sin_half = half_angle.sin();
                let inv_axis = 1.0 / axis_len;
                let qxn = axis_x * inv_axis * sin_half;
                let qyn = axis_y * inv_axis * sin_half;
                let qzn = axis_z * inv_axis * sin_half;
                let qwn = half_angle.cos();
                // Normalize
                let qmag = (qxn * qxn + qyn * qyn + qzn * qzn + qwn * qwn).sqrt();
                let inv_qmag = if qmag > 0.001 { 1.0 / qmag } else { 1.0 };
                (qxn * inv_qmag, qyn * inv_qmag, qzn * inv_qmag, qwn * inv_qmag)
            };

            let base = i * CYLINDER_STRIDE;
            self.cylinder_data[base] = mid_x;
            self.cylinder_data[base + 1] = mid_y;
            self.cylinder_data[base + 2] = mid_z;
            self.cylinder_data[base + 3] = len;
            self.cylinder_data[base + 4] = qx;
            self.cylinder_data[base + 5] = qy;
            self.cylinder_data[base + 6] = qz;
            self.cylinder_data[base + 7] = qw;

            // Pulse offset (deterministic per edge index)
            self.pulse_offsets[i] = ((i as f32 * 0.37) % 1.0) * 2.0;
            self.pulse_speeds[i] = if flags[i] != 0 { 1.2 } else { 2.0 };
            self.highlights[i] = flags[i];
        }

        self.cylinder_data.as_ptr()
    }

    /// Update pulse positions for all edges.
    /// elapsed: current clock time
    /// Returns pointer to pulse data (edge_count * 3 f32s).
    pub fn update_pulses(&mut self, from_positions: *const f32, to_positions: *const f32, elapsed: f32) -> *const f32 {
        let edge_count = self.edge_count;
        if edge_count == 0 {
            return self.pulse_data.as_ptr();
        }

        let from_pos = unsafe { std::slice::from_raw_parts(from_positions, edge_count * 3) };
        let to_pos = unsafe { std::slice::from_raw_parts(to_positions, edge_count * 3) };

        for i in 0..edge_count {
            let speed = self.pulse_speeds[i];
            let offset = self.pulse_offsets[i];
            let t = (elapsed + offset) % speed;
            let progress = t / speed;

            let fx = from_pos[i * 3];
            let fy = from_pos[i * 3 + 1];
            let fz = from_pos[i * 3 + 2];
            let tx = to_pos[i * 3];
            let ty = to_pos[i * 3 + 1];
            let tz = to_pos[i * 3 + 2];

            let px = fx + (tx - fx) * progress;
            let py = fy + (ty - fy) * progress;
            let pz = fz + (tz - fz) * progress;

            let base = i * PULSE_STRIDE;
            self.pulse_data[base] = px;
            self.pulse_data[base + 1] = py;
            self.pulse_data[base + 2] = pz;
        }

        self.pulse_data.as_ptr()
    }

    /// Update highlight flags (called when selection changes).
    pub fn update_highlights(&mut self, flags: *const u32) {
        let flags = unsafe { std::slice::from_raw_parts(flags, self.edge_count) };
        for i in 0..self.edge_count {
            self.highlights[i] = flags[i];
            self.pulse_speeds[i] = if flags[i] != 0 { 1.2 } else { 2.0 };
        }
    }

    pub fn cylinder_data_ptr(&self) -> *const f32 {
        self.cylinder_data.as_ptr()
    }

    pub fn pulse_data_ptr(&self) -> *const f32 {
        self.pulse_data.as_ptr()
    }

    pub fn len(&self) -> usize {
        self.edge_count
    }

    pub fn cylinder_stride(&self) -> usize {
        CYLINDER_STRIDE
    }

    pub fn pulse_stride(&self) -> usize {
        PULSE_STRIDE
    }

    pub fn is_highlighted(&self, index: usize) -> bool {
        self.highlights.get(index).copied().unwrap_or(0) != 0
    }
}