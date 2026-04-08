/**
 * WASM Mouse Trail Engine
 * Manages trail point lifecycle, path interpolation between mouse samples,
 * age-based color gradient computation, and width/alpha decay.
 *
 * Memory layout per trail point (24 bytes):
 *   [0..3]   x:     f32  — position X
 *   [4..7]   y:     f32  — position Y
 *   [8..11]  age:   f32  — frames since creation
 *   [12..15] r:     f32  — computed red (0–255)
 *   [16..19] g:     f32  — computed green (0–255)
 *   [20..23] b:     f32  — computed blue (0–255)
 */

const POINT_STRIDE: i32 = 24;
const MAX_POINTS: i32 = 512;
const MAX_AGE: f32 = 60.0;

// Trail data starts at offset 0
// Glow data (last 15 points cache) at offset MAX_POINTS * POINT_STRIDE

let head: i32 = 0;   // write index (circular buffer)
let count: i32 = 0;  // number of active points
let lastX: f32 = -1000.0;
let lastY: f32 = -1000.0;

export function getDataPtr(): i32 { return 0; }
export function getCount(): i32 { return count; }
export function getMaxAge(): f32 { return MAX_AGE; }

export function init(): void {
  head = 0;
  count = 0;
  lastX = -1000.0;
  lastY = -1000.0;
}

/** Compute trail color based on age ratio t (0=new, 1=old): cyan → purple → pink */
function computeColor(t: f32): void {
  // Cyan (34,211,238) → Purple (139,92,246) → Pink (236,72,153)
  if (t < 0.5) {
    const s = t * 2.0;
    _r = 34.0 + (139.0 - 34.0) * s;
    _g = 211.0 + (92.0 - 211.0) * s;
    _b = 238.0 + (246.0 - 238.0) * s;
  } else {
    const s = (t - 0.5) * 2.0;
    _r = 139.0 + (236.0 - 139.0) * s;
    _g = 92.0 + (72.0 - 92.0) * s;
    _b = 246.0 + (153.0 - 246.0) * s;
  }
}

let _r: f32 = 0;
let _g: f32 = 0;
let _b: f32 = 0;

/** Add a single trail point */
function addPoint(x: f32, y: f32): void {
  const off = head * POINT_STRIDE;
  store<f32>(off, x);
  store<f32>(off + 4, y);
  store<f32>(off + 8, 0.0);  // age = 0
  store<f32>(off + 12, 34.0);  // r (cyan)
  store<f32>(off + 16, 211.0); // g
  store<f32>(off + 20, 238.0); // b

  head = (head + 1) % MAX_POINTS;
  if (count < MAX_POINTS) count++;
}

/**
 * Called each frame with current mouse position.
 * Interpolates points along the path for smooth trails,
 * then ages all existing points and computes their colors.
 */
export function update(mouseX: f32, mouseY: f32, mouseActive: i32): void {
  // Add new trail points with path interpolation
  if (mouseActive != 0 && mouseX > 0.0 && mouseY > 0.0) {
    if (lastX > -500.0) {
      const dx = mouseX - lastX;
      const dy = mouseY - lastY;
      const dist = <f32>Math.sqrt(<f64>(dx * dx + dy * dy));

      if (dist > 2.0) {
        // Interpolate points along mouse path
        let steps = <i32>(dist / 3.0);
        if (steps > 10) steps = 10;

        for (let i: i32 = 0; i < steps; i++) {
          const t = <f32>i / <f32>steps;
          addPoint(lastX + dx * t, lastY + dy * t);
        }
      }
    }

    addPoint(mouseX, mouseY);
    lastX = mouseX;
    lastY = mouseY;
  } else {
    lastX = -1000.0;
    lastY = -1000.0;
  }

  // Age all points and recompute colors
  // We iterate through all slots and compact live points
  let writeIdx: i32 = 0;
  const readStart = (head - count + MAX_POINTS) % MAX_POINTS;

  for (let i: i32 = 0; i < count; i++) {
    const readIdx = (readStart + i) % MAX_POINTS;
    const off = readIdx * POINT_STRIDE;

    let age = load<f32>(off + 8);
    age += 1.0;

    if (age < MAX_AGE) {
      // Update age
      store<f32>(off + 8, age);

      // Compute color based on age
      const t = age / MAX_AGE;
      computeColor(t);
      store<f32>(off + 12, _r);
      store<f32>(off + 16, _g);
      store<f32>(off + 20, _b);
    }
  }

  // Remove dead points from count (points at the tail that exceeded MAX_AGE)
  while (count > 0) {
    const tailIdx = (head - count + MAX_POINTS) % MAX_POINTS;
    const off = tailIdx * POINT_STRIDE;
    const age = load<f32>(off + 8);
    if (age >= MAX_AGE) {
      count--;
    } else {
      break;
    }
  }
}

/**
 * Get the actual index of the i-th active point (oldest first).
 * Returns the memory offset for that point.
 */
export function getPointOffset(i: i32): i32 {
  const readStart = (head - count + MAX_POINTS) % MAX_POINTS;
  const idx = (readStart + i) % MAX_POINTS;
  return idx * POINT_STRIDE;
}
