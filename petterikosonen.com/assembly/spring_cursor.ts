/**
 * WASM Spring Physics for Spotlight Cursor
 * Implements a critically-damped spring simulation for smooth cursor following.
 * No Framer Motion dependency — pure physics in WebAssembly.
 *
 * Memory: just global state (no linear memory arrays needed)
 */

// Spring configuration
const STIFFNESS: f32 = 360.0;
const DAMPING: f32 = 40.0;
const MASS: f32 = 0.35;

// Opacity spring (different params for softer fade)
const OPACITY_STIFFNESS: f32 = 260.0;
const OPACITY_DAMPING: f32 = 30.0;
const OPACITY_MASS: f32 = 0.3;

// Position state
let posX: f32 = -96.0;
let posY: f32 = -96.0;
let velX: f32 = 0.0;
let velY: f32 = 0.0;

// Target (set by JS on mousemove)
let targetX: f32 = -96.0;
let targetY: f32 = -96.0;

// Opacity state
let opacity: f32 = 0.0;
let opacityVel: f32 = 0.0;
let targetOpacity: f32 = 0.0;

// Exported state for JS to read
export function getX(): f32 { return posX; }
export function getY(): f32 { return posY; }
export function getOpacity(): f32 { return opacity; }

/** Set mouse target (called from JS on mousemove) */
export function setTarget(x: f32, y: f32): void {
  targetX = x - 96.0;  // offset by half the spotlight size
  targetY = y - 96.0;
  targetOpacity = 0.28;
}

/** Called when mouse leaves viewport */
export function hide(): void {
  targetOpacity = 0.0;
}

/**
 * Advance the spring simulation by one step.
 * dt should be in seconds (typically ~0.016 for 60fps).
 *
 * Uses semi-implicit Euler integration of the spring equation:
 *   F = -stiffness * displacement - damping * velocity
 *   acceleration = F / mass
 *   velocity += acceleration * dt
 *   position += velocity * dt
 */
export function update(dt: f32): void {
  // Clamp dt to prevent explosion on tab-switch
  if (dt > 0.05) dt = 0.05;

  // ── Position spring (X) ──
  const dispX = posX - targetX;
  const forceX = -STIFFNESS * dispX - DAMPING * velX;
  const accX = forceX / MASS;
  velX += accX * dt;
  posX += velX * dt;

  // ── Position spring (Y) ──
  const dispY = posY - targetY;
  const forceY = -STIFFNESS * dispY - DAMPING * velY;
  const accY = forceY / MASS;
  velY += accY * dt;
  posY += velY * dt;

  // ── Opacity spring ──
  const dispO = opacity - targetOpacity;
  const forceO = -OPACITY_STIFFNESS * dispO - OPACITY_DAMPING * opacityVel;
  const accO = forceO / OPACITY_MASS;
  opacityVel += accO * dt;
  opacity += opacityVel * dt;

  // Clamp opacity
  if (opacity < 0.0) opacity = 0.0;
  if (opacity > 1.0) opacity = 1.0;
}
