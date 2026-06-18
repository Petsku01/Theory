use wasm_bindgen::prelude::*;

/// Grid texture generator: produces RGBA pixel data for a cyber grid.
/// Matches CyberGrid.tsx canvas drawing but generates pixels in WASM.
/// Output: flat Vec<u8> of size (width * height * 4) RGBA pixels.

#[wasm_bindgen]
pub struct GridGenerator {
    pixels: Vec<u8>,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl GridGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GridGenerator {
        GridGenerator {
            pixels: Vec::new(),
            width: 0,
            height: 0,
        }
    }

    /// Generate grid texture pixels.
    /// size: width = height (e.g. 1024)
    /// spacing: grid line spacing in pixels (e.g. 64)
    /// line_color: [r, g, b, a] for grid lines (0-255)
    /// bg_gradient_center: [r, g, b, a] at gradient center (transparent)
    /// bg_gradient_edge: [r, g, b, a] at gradient edge (dark)
    /// Returns pointer to RGBA pixel data (size * size * 4 bytes).
    pub fn generate(
        &mut self,
        size: u32,
        spacing: u32,
        line_r: u8, line_g: u8, line_b: u8, line_a: u8,
        edge_r: u8, edge_g: u8, edge_b: u8, edge_a: u8,
    ) -> *const u8 {
        let w = size;
        let h = size;
        self.width = w;
        self.height = h;
        let total = (w * h * 4) as usize;
        let mut pixels = vec![0u8; total];

        let line_alpha = line_a as f32 / 255.0;
        let half_w = w as f32 / 2.0;
        let half_h = h as f32 / 2.0;
        let max_radius = half_w; // radial gradient radius

        for y in 0..h {
            for x in 0..w {
                let idx = ((y * w + x) * 4) as usize;

                // Default: transparent background
                let mut r = 0u8;
                let mut g = 0u8;
                let mut b = 0u8;
                let mut a = 0u8;

                // Check if on grid line (within line_width pixels of a spacing boundary)
                let line_width = 2u32; // 2px lines, matching JS lineWidth=2 with stroke
                let on_vertical = x >= spacing && (x % spacing) < line_width;
                let on_horizontal = y >= spacing && (y % spacing) < line_width;

                if on_vertical || on_horizontal {
                    // Grid line color with alpha
                    r = line_r;
                    g = line_g;
                    b = line_b;
                    a = line_a;
                }

                // Apply radial gradient overlay (darken edges)
                let dx = x as f32 - half_w;
                let dy = y as f32 - half_h;
                let dist = (dx * dx + dy * dy).sqrt();
                let t = (dist / max_radius).clamp(0.0, 1.0);

                // Gradient: transparent until 0.85, then fade to edge color
                let gradient_alpha = if t < 0.85 {
                    0.0
                } else {
                    ((t - 0.85) / 0.15).clamp(0.0, 1.0) * (edge_a as f32 / 255.0)
                };

                // Blend gradient over current pixel
                let out_a = a as f32 / 255.0;
                let final_a = out_a + gradient_alpha * (1.0 - out_a);
                if final_a > 0.0 {
                    let blend_r = r as f32 * out_a + edge_r as f32 * gradient_alpha * (1.0 - out_a);
                    let blend_g = g as f32 * out_a + edge_g as f32 * gradient_alpha * (1.0 - out_a);
                    let blend_b = b as f32 * out_a + edge_b as f32 * gradient_alpha * (1.0 - out_a);
                    r = (blend_r / final_a).round() as u8;
                    g = (blend_g / final_a).round() as u8;
                    b = (blend_b / final_a).round() as u8;
                    a = (final_a * 255.0).round() as u8;
                }

                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = a;
            }
        }

        self.pixels = pixels;
        self.pixels.as_ptr()
    }

    pub fn data_ptr(&self) -> *const u8 {
        self.pixels.as_ptr()
    }

    pub fn len(&self) -> usize {
        self.pixels.len()
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }
}