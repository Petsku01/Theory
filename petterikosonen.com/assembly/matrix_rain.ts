/**
 * WASM Matrix Rain Engine
 * Manages column state, character positions, and brightness.
 * All state lives in linear memory — JS just reads for rendering.
 *
 * Memory layout per column (16 bytes):
 *   [0..3]   y:         f32  — current Y position
 *   [4..7]   speed:     f32  — fall speed
 *   [8..11]  charIndex: i32  — index into glyph set (for display)
 *   [12..15] brightness: f32 — 0–1 brightness
 */

const COL_STRIDE: i32 = 16;
const MAX_COLS: i32 = 200;
const CELL_SIZE: f32 = 18.0;

let seed: u32 = 0xFACE_FEED;
let numCols: i32 = 0;
let canvasWidth: f32 = 0;
let canvasHeight: f32 = 0;

function rand(): f32 {
  seed = seed * 1103515245 + 12345;
  return <f32>((seed >> 16) & 0x7FFF) / 32767.0;
}

export function getDataPtr(): i32 { return 0; }
export function getNumCols(): i32 { return numCols; }

export function init(width: f32, height: f32, rngSeed: u32): void {
  seed = rngSeed;
  canvasWidth = width;
  canvasHeight = height;
  numCols = min(<i32>(width / CELL_SIZE), MAX_COLS);
  if (numCols < 1) numCols = 1;

  for (let i: i32 = 0; i < numCols; i++) {
    const off = i * COL_STRIDE;
    store<f32>(off, rand() * height);        // y — start at random position
    store<f32>(off + 4, 0.5 + rand() * 1.5); // speed
    store<i32>(off + 8, <i32>(rand() * 27.0));  // charIndex (0–26)
    store<f32>(off + 12, 0.1 + rand() * 0.1);  // brightness
  }
}

export function resize(width: f32, height: f32): void {
  canvasWidth = width;
  canvasHeight = height;
  const newCols = min(<i32>(width / CELL_SIZE), MAX_COLS);
  if (newCols < 1) return;

  // Add new columns if needed
  for (let i = numCols; i < newCols; i++) {
    const off = i * COL_STRIDE;
    store<f32>(off, rand() * height);
    store<f32>(off + 4, 0.5 + rand() * 1.5);
    store<i32>(off + 8, <i32>(rand() * 27.0));
    store<f32>(off + 12, 0.1 + rand() * 0.1);
  }

  numCols = newCols;
}

export function update(): void {
  for (let i: i32 = 0; i < numCols; i++) {
    const off = i * COL_STRIDE;
    let y = load<f32>(off);
    const speed = load<f32>(off + 4);

    y += CELL_SIZE * speed;

    // Randomly change character
    if (rand() > 0.92) {
      store<i32>(off + 8, <i32>(rand() * 27.0));
    }

    // Reset column when it goes past bottom
    if (y > canvasHeight && rand() > 0.985) {
      y = 0;
      store<f32>(off + 4, 0.5 + rand() * 1.5);  // new speed
      store<f32>(off + 12, 0.08 + rand() * 0.12); // new brightness
    }

    store<f32>(off, y);
  }
}
