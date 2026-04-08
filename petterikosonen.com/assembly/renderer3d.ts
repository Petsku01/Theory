/**
 * WASM 3D Icosahedron Renderer
 * All 3D math runs in WebAssembly — vertex generation, rotation,
 * perspective projection, color cycling, and orbiting particles.
 *
 * Memory layout:
 *   [0..143]       Original icosahedron vertices (12 * 3 * f32)
 *   [144..239]     Projected 2D vertices (12 * 2 * f32)
 *   [240..479]     Edge list (30 * 2 * i32)
 *   [480..959]     Inner icosahedron projected (12 * 2 * f32) + outer wireframe projected
 *   [1024..N]      Orbiting particles: x, y, z, px, py, brightness, hue (7 * f32 = 28 bytes each)
 *   [N..]          Sparkle particles
 */

// ── Constants ──────────────────────────────────────
const VERT_OFFSET: i32 = 0;          // 12 vertices * 3 floats * 4 bytes = 144
const PROJ_OFFSET: i32 = 144;        // 12 * 2 * 4 = 96
const EDGE_OFFSET: i32 = 240;        // 30 * 2 * 4 = 240
const INNER_PROJ_OFFSET: i32 = 480;  // 12 * 2 * 4 = 96
const OUTER_PROJ_OFFSET: i32 = 576;  // 42 * 2 * 4 = 336
const PARTICLE_OFFSET: i32 = 1024;
const SPARKLE_OFFSET: i32 = 8192;

const NUM_VERTICES: i32 = 12;
const NUM_EDGES: i32 = 30;
const NUM_PARTICLES: i32 = 180;
const NUM_SPARKLES: i32 = 200;
const PARTICLE_STRIDE: i32 = 28;  // 7 floats
const SPARKLE_STRIDE: i32 = 24;   // 6 floats: x, y, z, px, py, alpha

const PHI: f32 = 1.618033988749895;
const PI: f32 = 3.141592653589793;
const TWO_PI: f32 = 6.283185307179586;

// ── LCG RNG ──────────────────────────────────────
let seed: u32 = 0xCAFE_BABE;

function rand(): f32 {
  seed = seed * 1103515245 + 12345;
  return <f32>((seed >> 16) & 0x7FFF) / 32767.0;
}

function randRange(min: f32, max: f32): f32 {
  return min + rand() * (max - min);
}

// ── State ──────────────────────────────────────
let rotX: f32 = 0;
let rotY: f32 = 0;
let rotZ: f32 = 0;
let innerRotX: f32 = 0;
let innerRotY: f32 = 0;
let outerRotX: f32 = 0;
let outerRotY: f32 = 0;
let colorPhase: f32 = 0;

// Exported readable state
export let currentR: f32 = 0.13;
export let currentG: f32 = 0.83;
export let currentB: f32 = 0.93;

/** Number of icosahedron-1 subdivision vertices for outer wireframe */
const OUTER_VERTS: i32 = 42;

// ── Exported: memory pointer accessors ──────────
export function getVerticesPtr(): i32 { return VERT_OFFSET; }
export function getProjectedPtr(): i32 { return PROJ_OFFSET; }
export function getEdgesPtr(): i32 { return EDGE_OFFSET; }
export function getInnerProjPtr(): i32 { return INNER_PROJ_OFFSET; }
export function getOuterProjPtr(): i32 { return OUTER_PROJ_OFFSET; }
export function getParticlesPtr(): i32 { return PARTICLE_OFFSET; }
export function getSparklesPtr(): i32 { return SPARKLE_OFFSET; }
export function getNumVertices(): i32 { return NUM_VERTICES; }
export function getNumEdges(): i32 { return NUM_EDGES; }
export function getNumParticles(): i32 { return NUM_PARTICLES; }
export function getNumSparkles(): i32 { return NUM_SPARKLES; }
export function getOuterVerts(): i32 { return OUTER_VERTS; }

// ── Init: generate icosahedron geometry ────────
export function init(rngSeed: u32): void {
  seed = rngSeed;

  // Icosahedron vertices (golden ratio based)
  const verts: f32[][] = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ];

  // Normalize to unit sphere and scale
  const radius: f32 = 1.6;
  for (let i = 0; i < NUM_VERTICES; i++) {
    const x = verts[i][0];
    const y = verts[i][1];
    const z = verts[i][2];
    const len = <f32>Math.sqrt(<f64>(x * x + y * y + z * z));
    store<f32>(VERT_OFFSET + i * 12, (x / len) * radius);
    store<f32>(VERT_OFFSET + i * 12 + 4, (y / len) * radius);
    store<f32>(VERT_OFFSET + i * 12 + 8, (z / len) * radius);
  }

  // 30 edges of icosahedron
  const edges: i32[][] = [
    [0,11],[0,5],[0,1],[0,7],[0,10],
    [1,5],[1,7],[1,8],[1,9],
    [2,3],[2,4],[2,6],[2,10],[2,11],
    [3,4],[3,6],[3,8],[3,9],
    [4,5],[4,9],[4,11],
    [5,9],[5,11],
    [6,7],[6,8],[6,10],
    [7,8],[7,10],
    [8,9],
    [10,11],
  ];

  for (let i = 0; i < NUM_EDGES; i++) {
    store<i32>(EDGE_OFFSET + i * 8, edges[i][0]);
    store<i32>(EDGE_OFFSET + i * 8 + 4, edges[i][1]);
  }

  // Init orbiting particles
  for (let i = 0; i < NUM_PARTICLES; i++) {
    const off = PARTICLE_OFFSET + i * PARTICLE_STRIDE;
    const r = randRange(3.5, 6.5);
    const theta = rand() * TWO_PI;
    const phi = <f32>Math.acos(<f64>(2.0 * rand() - 1.0));
    store<f32>(off, r * <f32>Math.sin(<f64>phi) * <f32>Math.cos(<f64>theta));     // x
    store<f32>(off + 4, r * <f32>Math.cos(<f64>phi) * 0.8);                        // y
    store<f32>(off + 8, r * <f32>Math.sin(<f64>phi) * <f32>Math.sin(<f64>theta)); // z
    store<f32>(off + 12, 0.0);  // px (will be set in update)
    store<f32>(off + 16, 0.0);  // py
    store<f32>(off + 20, randRange(0.3, 0.8)); // brightness
    store<f32>(off + 24, randRange(170.0, 210.0)); // hue
  }

  // Init sparkles
  for (let i = 0; i < NUM_SPARKLES; i++) {
    const off = SPARKLE_OFFSET + i * SPARKLE_STRIDE;
    const r = randRange(2.5, 9.0);
    const theta = rand() * TWO_PI;
    const phi = <f32>Math.acos(<f64>(2.0 * rand() - 1.0));
    store<f32>(off, r * <f32>Math.sin(<f64>phi) * <f32>Math.cos(<f64>theta));
    store<f32>(off + 4, r * <f32>Math.cos(<f64>phi));
    store<f32>(off + 8, r * <f32>Math.sin(<f64>phi) * <f32>Math.sin(<f64>theta));
    store<f32>(off + 12, 0.0);
    store<f32>(off + 16, 0.0);
    store<f32>(off + 20, rand()); // alpha
  }
}

// ── Rotation helpers ───────────────────────────
function rotateX(x: f32, y: f32, z: f32, angle: f32): f32 {
  // Returns new Y after X-axis rotation
  const c = <f32>Math.cos(<f64>angle);
  const s = <f32>Math.sin(<f64>angle);
  return y * c - z * s;
}

function rotateXZ(x: f32, y: f32, z: f32, angle: f32): f32 {
  // Returns new Z after X-axis rotation
  const c = <f32>Math.cos(<f64>angle);
  const s = <f32>Math.sin(<f64>angle);
  return y * s + z * c;
}

function transformAndProject(
  srcX: f32, srcY: f32, srcZ: f32,
  rx: f32, ry: f32, rz: f32,
  scale: f32,
  cx: f32, cy: f32, fov: f32
): void {
  // Apply scale
  let x = srcX * scale;
  let y = srcY * scale;
  let z = srcZ * scale;

  // Rotate around X
  let cA = <f32>Math.cos(<f64>rx);
  let sA = <f32>Math.sin(<f64>rx);
  let ny = y * cA - z * sA;
  let nz = y * sA + z * cA;
  y = ny; z = nz;

  // Rotate around Y
  cA = <f32>Math.cos(<f64>ry);
  sA = <f32>Math.sin(<f64>ry);
  let nx = x * cA + z * sA;
  nz = -x * sA + z * cA;
  x = nx; z = nz;

  // Rotate around Z
  cA = <f32>Math.cos(<f64>rz);
  sA = <f32>Math.sin(<f64>rz);
  nx = x * cA - y * sA;
  ny = x * sA + y * cA;
  x = nx; y = ny;

  // Perspective projection
  const depth = fov / (fov + z + 5.0);

  // Store in temp globals (hack to return 2 values)
  _projX = cx + x * depth * fov * 0.5;
  _projY = cy + y * depth * fov * 0.5;
  _projDepth = depth;
}

let _projX: f32 = 0;
let _projY: f32 = 0;
let _projDepth: f32 = 0;

// ── Update: rotate and project everything ──────
export function update(
  dt: f32, time: f32,
  centerX: f32, centerY: f32, fov: f32,
  mouseX: f32, mouseY: f32
): void {
  // Update rotation angles
  rotX += dt * 0.25;
  rotY += dt * 0.4;
  rotZ = <f32>Math.sin(<f64>(time * 0.5)) * 0.1;

  innerRotX -= dt * 0.35;
  innerRotY -= dt * 0.2;

  outerRotX += dt * 0.08;
  outerRotY -= dt * 0.12;

  // Add mouse influence to rotation
  const mouseInfluenceX = (mouseX - 0.5) * 0.3;
  const mouseInfluenceY = (mouseY - 0.5) * 0.3;

  // Floating Y offset
  const floatY = <f32>Math.sin(<f64>(time * 0.8)) * 0.15;

  // Color cycling (5-color gradient: cyan → purple → pink → orange → green → cyan)
  colorPhase = (time * 0.12) % 1.0;
  if (colorPhase < 0.2) {
    const t = colorPhase * 5.0;
    currentR = 0.133 + (0.655 - 0.133) * t;
    currentG = 0.827 + (0.486 - 0.827) * t;
    currentB = 0.933 + (0.980 - 0.933) * t;
  } else if (colorPhase < 0.4) {
    const t = (colorPhase - 0.2) * 5.0;
    currentR = 0.655 + (0.957 - 0.655) * t;
    currentG = 0.486 + (0.447 - 0.486) * t;
    currentB = 0.980 + (0.714 - 0.980) * t;
  } else if (colorPhase < 0.6) {
    const t = (colorPhase - 0.4) * 5.0;
    currentR = 0.957 + (0.984 - 0.957) * t;
    currentG = 0.447 + (0.573 - 0.447) * t;
    currentB = 0.714 + (0.235 - 0.714) * t;
  } else if (colorPhase < 0.8) {
    const t = (colorPhase - 0.6) * 5.0;
    currentR = 0.984 + (0.204 - 0.984) * t;
    currentG = 0.573 + (0.827 - 0.573) * t;
    currentB = 0.235 + (0.600 - 0.235) * t;
  } else {
    const t = (colorPhase - 0.8) * 5.0;
    currentR = 0.204 + (0.133 - 0.204) * t;
    currentG = 0.827 + (0.827 - 0.827) * t;
    currentB = 0.600 + (0.933 - 0.600) * t;
  }

  // Project main icosahedron vertices
  for (let i = 0; i < NUM_VERTICES; i++) {
    const sx = load<f32>(VERT_OFFSET + i * 12);
    const sy = load<f32>(VERT_OFFSET + i * 12 + 4);
    const sz = load<f32>(VERT_OFFSET + i * 12 + 8);

    transformAndProject(
      sx, sy + floatY, sz,
      rotX + mouseInfluenceY, rotY + mouseInfluenceX, rotZ,
      1.0, centerX, centerY, fov
    );

    store<f32>(PROJ_OFFSET + i * 8, _projX);
    store<f32>(PROJ_OFFSET + i * 8 + 4, _projY);
  }

  // Project inner icosahedron (smaller, counter-rotating)
  for (let i = 0; i < NUM_VERTICES; i++) {
    const sx = load<f32>(VERT_OFFSET + i * 12);
    const sy = load<f32>(VERT_OFFSET + i * 12 + 4);
    const sz = load<f32>(VERT_OFFSET + i * 12 + 8);

    transformAndProject(
      sx, sy + floatY, sz,
      innerRotX + mouseInfluenceY, innerRotY + mouseInfluenceX, 0.0,
      0.5, centerX, centerY, fov
    );

    store<f32>(INNER_PROJ_OFFSET + i * 8, _projX);
    store<f32>(INNER_PROJ_OFFSET + i * 8 + 4, _projY);
  }

  // Update and project orbiting particles
  for (let i = 0; i < NUM_PARTICLES; i++) {
    const off = PARTICLE_OFFSET + i * PARTICLE_STRIDE;
    let px = load<f32>(off);
    let py = load<f32>(off + 4);
    let pz = load<f32>(off + 8);

    // Slowly orbit
    const orbitSpeed = dt * 0.05;
    const cO = <f32>Math.cos(<f64>orbitSpeed);
    const sO = <f32>Math.sin(<f64>orbitSpeed);
    const nx = px * cO + pz * sO;
    const nz = -px * sO + pz * cO;
    px = nx;
    pz = nz;

    // Bob vertically
    py += <f32>Math.sin(<f64>(time * 0.15 + <f32>i * 0.1)) * 0.002;

    store<f32>(off, px);
    store<f32>(off + 4, py);
    store<f32>(off + 8, pz);

    // Project
    transformAndProject(
      px, py + floatY, pz,
      mouseInfluenceY * 0.5, mouseInfluenceX * 0.5, 0.0,
      1.0, centerX, centerY, fov
    );

    store<f32>(off + 12, _projX);
    store<f32>(off + 16, _projY);

    // Pulse brightness
    const brightness = load<f32>(off + 20);
    store<f32>(off + 20, 0.3 + (<f32>Math.sin(<f64>(time + <f32>i * 0.5)) * 0.5 + 0.5) * 0.5);
  }

  // Update and project sparkles
  for (let i = 0; i < NUM_SPARKLES; i++) {
    const off = SPARKLE_OFFSET + i * SPARKLE_STRIDE;
    let sx = load<f32>(off);
    let sy = load<f32>(off + 4);
    let sz = load<f32>(off + 8);

    // Gentle drift
    sx += <f32>Math.sin(<f64>(time * 0.3 + <f32>i)) * 0.003;
    sy += <f32>Math.cos(<f64>(time * 0.2 + <f32>i * 0.7)) * 0.003;

    store<f32>(off, sx);
    store<f32>(off + 4, sy);

    // Project
    transformAndProject(
      sx, sy + floatY, sz,
      mouseInfluenceY * 0.3, mouseInfluenceX * 0.3, 0.0,
      1.0, centerX, centerY, fov
    );

    store<f32>(off + 12, _projX);
    store<f32>(off + 16, _projY);

    // Twinkle alpha
    store<f32>(off + 20,
      (<f32>Math.sin(<f64>(time * (1.0 + <f32>i * 0.02) + <f32>i * 2.0)) * 0.5 + 0.5) * 0.6
    );
  }
}
