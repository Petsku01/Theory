/**
 * WASM Particle Physics Engine
 * Written in AssemblyScript — compiles to WebAssembly
 *
 * Memory layout per particle (48 bytes):
 *   [0..3]   x:       f32  — position X
 *   [4..7]   y:       f32  — position Y
 *   [8..11]  vx:      f32  — velocity X
 *   [12..15] vy:      f32  — velocity Y
 *   [16..19] life:    f32  — current life remaining
 *   [20..23] maxLife: f32  — maximum lifespan
 *   [24..27] size:    f32  — radius
 *   [28..31] hue:     f32  — color hue (0–360)
 *   [32..35] ax:      f32  — acceleration X (for mouse attraction)
 *   [36..39] ay:      f32  — acceleration Y
 *   [40..43] opacity: f32  — current opacity (derived from life)
 *   [44..47] phase:   f32  — unique phase offset for oscillation
 */

const STRIDE: i32 = 48;
const MAX_PARTICLES: i32 = 3000;
const MOUSE_RADIUS: f32 = 200.0;
const MOUSE_FORCE: f32 = 0.08;
const DAMPING: f32 = 0.985;
const DRIFT_SPEED: f32 = 0.15;

// LCG pseudo-random state
let seed: u32 = 0xDEAD_BEEF;

function rand(): f32 {
  seed = seed * 1103515245 + 12345;
  return <f32>((seed >> 16) & 0x7FFF) / 32767.0;
}

function randRange(min: f32, max: f32): f32 {
  return min + rand() * (max - min);
}

/** Exported: number of active particles */
export let count: i32 = 0;

/** Exported: pointer to particle data in linear memory */
export function getDataPointer(): i32 {
  return 0;
}

/** Initialize the particle field */
export function init(n: i32, width: f32, height: f32, rngSeed: u32): void {
  seed = rngSeed;
  count = min(n, MAX_PARTICLES);

  for (let i: i32 = 0; i < count; i++) {
    const off = i * STRIDE;
    // Position: random across canvas
    store<f32>(off, rand() * width);          // x
    store<f32>(off + 4, rand() * height);     // y
    // Velocity: gentle random drift
    store<f32>(off + 8, randRange(-DRIFT_SPEED, DRIFT_SPEED));  // vx
    store<f32>(off + 12, randRange(-DRIFT_SPEED, DRIFT_SPEED)); // vy
    // Life
    const maxLife = randRange(120.0, 360.0);
    store<f32>(off + 16, rand() * maxLife);   // life (start at random point)
    store<f32>(off + 20, maxLife);            // maxLife
    // Visual
    store<f32>(off + 24, randRange(1.0, 3.5));  // size
    store<f32>(off + 28, randRange(170.0, 220.0)); // hue (cyan-ish range)
    // Physics
    store<f32>(off + 32, 0.0);   // ax
    store<f32>(off + 36, 0.0);   // ay
    // Derived
    store<f32>(off + 40, 1.0);   // opacity
    store<f32>(off + 44, rand() * 6.28318); // phase
  }
}

/** Respawn a single particle at random position */
function respawn(off: i32, width: f32, height: f32): void {
  store<f32>(off, rand() * width);
  store<f32>(off + 4, rand() * height);
  store<f32>(off + 8, randRange(-DRIFT_SPEED, DRIFT_SPEED));
  store<f32>(off + 12, randRange(-DRIFT_SPEED, DRIFT_SPEED));
  const maxLife = randRange(120.0, 360.0);
  store<f32>(off + 16, maxLife);
  store<f32>(off + 20, maxLife);
  store<f32>(off + 24, randRange(1.0, 3.5));
  store<f32>(off + 28, randRange(170.0, 220.0));
  store<f32>(off + 32, 0.0);
  store<f32>(off + 36, 0.0);
  store<f32>(off + 40, 1.0);
  store<f32>(off + 44, rand() * 6.28318);
}

/**
 * Tick the simulation forward.
 * Called once per frame from JS via requestAnimationFrame.
 */
export function update(
  width: f32,
  height: f32,
  mouseX: f32,
  mouseY: f32,
  mouseActive: i32,
  time: f32
): void {
  for (let i: i32 = 0; i < count; i++) {
    const off = i * STRIDE;

    let x = load<f32>(off);
    let y = load<f32>(off + 4);
    let vx = load<f32>(off + 8);
    let vy = load<f32>(off + 12);
    let life = load<f32>(off + 16);
    const maxLife = load<f32>(off + 20);
    const phase = load<f32>(off + 44);

    // Decrease life
    life -= 1.0;
    if (life <= 0.0) {
      respawn(off, width, height);
      continue;
    }

    // Mouse interaction: attract or repel
    if (mouseActive) {
      const dx = mouseX - x;
      const dy = mouseY - y;
      const distSq = dx * dx + dy * dy;
      const dist = <f32>Math.sqrt(<f64>distSq);

      if (dist < MOUSE_RADIUS && dist > 1.0) {
        const force = MOUSE_FORCE * (1.0 - dist / MOUSE_RADIUS);
        vx += (dx / dist) * force;
        vy += (dy / dist) * force;
      }
    }

    // Gentle sinusoidal drift (organic feel)
    const sinOffset = <f32>Math.sin(<f64>(time * 0.001 + phase));
    vx += sinOffset * 0.003;
    vy += <f32>Math.cos(<f64>(time * 0.0008 + phase)) * 0.003;

    // Apply damping
    vx *= DAMPING;
    vy *= DAMPING;

    // Integrate position
    x += vx;
    y += vy;

    // Wrap around edges with margin
    if (x < -20.0) x += width + 40.0;
    if (x > width + 20.0) x -= width + 40.0;
    if (y < -20.0) y += height + 40.0;
    if (y > height + 20.0) y -= height + 40.0;

    // Compute opacity from life (fade in/out)
    const lifeRatio = life / maxLife;
    let opacity: f32;
    if (lifeRatio > 0.9) {
      opacity = (1.0 - lifeRatio) * 10.0; // fade in
    } else if (lifeRatio < 0.1) {
      opacity = lifeRatio * 10.0;          // fade out
    } else {
      opacity = 1.0;
    }

    // Store updated values
    store<f32>(off, x);
    store<f32>(off + 4, y);
    store<f32>(off + 8, vx);
    store<f32>(off + 12, vy);
    store<f32>(off + 16, life);
    store<f32>(off + 40, opacity);
  }
}
