use wasm_bindgen::prelude::*;

/// Color utilities: hex parsing, blending.
/// Matches the JS blendColors function in utils.ts.

/// Parse a hex color string (#RRGGBB or #RGB) into [r, g, b] floats (0.0-1.0).
fn parse_hex(hex: &str) -> [f32; 3] {
    let h = hex.trim_start_matches('#');

    let (r, g, b) = if h.len() == 6 {
        (
            u8::from_str_radix(&h[0..2], 16).unwrap_or(0),
            u8::from_str_radix(&h[2..4], 16).unwrap_or(0),
            u8::from_str_radix(&h[4..6], 16).unwrap_or(0),
        )
    } else if h.len() == 3 {
        (
            u8::from_str_radix(&h[0..1].repeat(2).as_str(), 16).unwrap_or(0),
            u8::from_str_radix(&h[1..2].repeat(2).as_str(), 16).unwrap_or(0),
            u8::from_str_radix(&h[2..3].repeat(2).as_str(), 16).unwrap_or(0),
        )
    } else {
        (0, 0, 0)
    };

    [
        r as f32 / 255.0,
        g as f32 / 255.0,
        b as f32 / 255.0,
    ]
}

/// Convert [r, g, b] floats (0.0-1.0) to a CSS hex string (#RRGGBB).
fn to_hex(r: f32, g: f32, b: f32) -> String {
    let clamp = |v: f32| (v.clamp(0.0, 1.0) * 255.0).round() as u8;
    format!("#{:02x}{:02x}{:02x}", clamp(r), clamp(g), clamp(b))
}

#[wasm_bindgen]
pub fn blend_colors(hex_a: &str, hex_b: &str, t: f32) -> String {
    let [ar, ag, ab] = parse_hex(hex_a);
    let [br, bg, bb] = parse_hex(hex_b);

    let t = t.clamp(0.0, 1.0);
    let r = ar + (br - ar) * t;
    let g = ag + (bg - ag) * t;
    let b = ab + (bb - ab) * t;

    to_hex(r, g, b)
}