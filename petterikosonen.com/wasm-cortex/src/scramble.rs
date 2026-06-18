use wasm_bindgen::prelude::*;

/// Text scramble state machine.
/// Matches useScramble.ts logic but runs char generation in WASM.
/// JS handles timing (setInterval/setTimeout) and React state.
/// WASM holds: target text (as char codes), revealed flags, generates scrambled output.
///
/// Protocol:
/// 1. init(char_codes_ptr, len) -- store target text
/// 2. tick() -> ptr to output char codes (len u8s)
/// 3. reveal_next() -- reveal one more character
/// 4. reset() -- clear all revealed

#[wasm_bindgen]
pub struct ScrambleSystem {
    /// Target text as char codes
    target: Vec<u8>,
    /// Revealed flags per character
    revealed: Vec<bool>,
    /// Current output buffer (char codes)
    output: Vec<u8>,
    /// Reveal index (how many chars revealed so far)
    reveal_index: usize,
    /// Frame counter for per-frame random variation
    frame_counter: u32,
}

const SCRAMBLE_CHARS: &[u8] = b"0123456789ABCDEF<>/\\";

#[wasm_bindgen]
impl ScrambleSystem {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ScrambleSystem {
        ScrambleSystem {
            target: Vec::new(),
            revealed: Vec::new(),
            output: Vec::new(),
            reveal_index: 0,
            frame_counter: 0,
        }
    }

    /// Initialize with target text (as char codes).
    /// char_codes: pointer to u8 array, len: number of chars
    pub fn init(&mut self, char_codes_ptr: *const u8, len: usize) {
        let codes = unsafe { std::slice::from_raw_parts(char_codes_ptr, len) };
        self.target = codes.to_vec();
        self.revealed = vec![false; len];
        self.output = vec![0u8; len];
        self.reveal_index = 0;

        // Fill output with target initially
        self.output.copy_from_slice(&self.target);
    }

    /// Generate one frame of scrambled text.
    /// Returns pointer to output char codes (len u8s).
    /// frame_counter: increments each call to produce different output per frame.
    pub fn tick(&mut self) -> *const u8 {
        let len = self.target.len();
        if len == 0 {
            return self.output.as_ptr();
        }

        self.frame_counter = self.frame_counter.wrapping_add(1);

        for i in 0..len {
            if self.revealed[i] {
                self.output[i] = self.target[i];
            } else if self.target[i] == b' ' {
                self.output[i] = b' ';
            } else {
                // Random char from SCRAMBLE_CHARS, varies per frame
                let idx = pseudo_random_u32(i as u32, self.frame_counter) as usize
                    % SCRAMBLE_CHARS.len();
                self.output[i] = SCRAMBLE_CHARS[idx];
            }
        }

        self.output.as_ptr()
    }

    /// Reveal one more character (left to right).
    pub fn reveal_next(&mut self) {
        if self.reveal_index < self.target.len() {
            self.revealed[self.reveal_index] = true;
            self.reveal_index += 1;
        }
    }

    /// Check if all characters are revealed.
    pub fn is_complete(&self) -> bool {
        self.reveal_index >= self.target.len()
    }

    /// Reset scramble state (clear all revealed).
    pub fn reset(&mut self) {
        for i in 0..self.revealed.len() {
            self.revealed[i] = false;
        }
        self.reveal_index = 0;
    }

    /// Number of characters in target text.
    pub fn len(&self) -> usize {
        self.target.len()
    }

    /// Output data pointer.
    pub fn data_ptr(&self) -> *const u8 {
        self.output.as_ptr()
    }

    /// Get target char code at index.
    pub fn target_char(&self, index: usize) -> u8 {
        self.target.get(index).copied().unwrap_or(0)
    }
}

/// Deterministic pseudo-random for scramble char selection.
/// Uses a simple hash of (char_index, reveal_index) to vary output per frame.
fn pseudo_random_u32(a: u32, b: u32) -> u32 {
    let mut x = a.wrapping_mul(2654435761).wrapping_add(b.wrapping_mul(40503));
    x ^= x >> 16;
    x = x.wrapping_mul(0x45d9f3b);
    x ^= x >> 16;
    x
}