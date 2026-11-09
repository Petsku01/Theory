import { clusterPositions } from "@/lib/cortex-data";

/** Shared 4-spot growth-knot gauss (per-patch anisotropic az×el). */

export const KNOT_TIME_SCALE = 0.045;
export const KNOT_FLOW_DEFAULT = 1.35;
export const KNOT_RADIUS_DEFAULT = 48;
export const KNOT_MASK_THRESHOLD = 0.35;
export const KNOT_MIX = 0.6;
export const KNOT_LUMA_LIFT = 0.28;
/** Horizontal/vertical gauss aspect (>1 → wider than tall). Experience default. */
export const KNOT_ASPECT_W = 1.6;
/**
 * Gauss σ scale vs previous isotropic spots (0.6 × 0.75 → 0.45× radius).
 * k ∝ 1/σ² so k is multiplied by 1/0.2025.
 */
export const KNOT_RADIUS_SCALE = 0.45;
/** Base k (azimuth of a 1.0-aspect reference). Vertical k of 1.6-aspect = this × 2.56. */
export const KNOT_K = 70.0 / (KNOT_RADIUS_SCALE * KNOT_RADIUS_SCALE);

type KnotShape = {
  /** σ_az / σ_el (>1 → wider than tall). */
  aspect: number;
  /** Extra k multiplier (higher → smaller/tighter). */
  kMul: number;
};

/**
 * Single az/el conversion for TS uniforms + GLSL knotSample.
 * Axes: GLSL `atan(n.z, n.x)` == JS `Math.atan2(z, x)` (from +X toward +Z).
 * Proof: (x=6,z=0)→0°; (x=0,z=6)→90°. Not Three.Spherical.theta (atan2(x,z)).
 */
export function knotAzElFromPos(pos: [number, number, number]): { azDeg: number; el: number } {
  const [x, y, z] = pos;
  const len = Math.hypot(x, y, z) || 1;
  let azDeg = (Math.atan2(z, x) * 180) / Math.PI;
  if (azDeg < 0) azDeg += 360;
  return { azDeg, el: Math.asin(y / len) };
}

/** Inward radial camera offset so cartesian pos and sky-knot share the view ray. */
export const CLUSTER_FLY_DIST = 9;

export function clusterFlyCameraOffset(
  pos: [number, number, number],
  dist = CLUSTER_FLY_DIST,
): [number, number, number] {
  const [x, y, z] = pos;
  const len = Math.hypot(x, y, z) || 1;
  return [(-x / len) * dist, (-y / len) * dist, (-z / len) * dist];
}

export const KNOT_COLORS = {
  core: "#B47CFF",
  projects: "#FFB454",
  skills: "#22D3EE",
  experience: "#39FF88",
} as const;

export type KnotId = keyof typeof KNOT_COLORS;

export const KNOTS = [
  { id: "core", ...knotAzElFromPos(clusterPositions.core), r: 1.05, color: KNOT_COLORS.core, aspect: 1.0, kMul: 1.0 },
  { id: "projects", ...knotAzElFromPos(clusterPositions.projects), r: 0.85, color: KNOT_COLORS.projects, aspect: 2.2, kMul: 1.0 },
  { id: "skills", ...knotAzElFromPos(clusterPositions.skills), r: 0.644, color: KNOT_COLORS.skills, aspect: 1.0, kMul: 1.0 },
  { id: "experience", ...knotAzElFromPos(clusterPositions.experience), r: 1.0, color: KNOT_COLORS.experience, aspect: 1.6, kMul: 0.62 },
] as const satisfies ReadonlyArray<
  {
    id: string;
    azDeg: number;
    el: number;
    r: number;
    color: string;
  } & KnotShape
>;

export type KnotSpec = (typeof KNOTS)[number];

const AZ_PHASE = [0.4, 1.7, 2.9, 4.1] as const;
const EL_PHASE = [1.1, 2.3, 3.6, 4.8] as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** kEl held to old vertical tightness (×σ0.75); kAz = kEl / aspect². */
function knotK(aspect: number, kMul: number): { kAz: number; kEl: number } {
  const kEl = KNOT_K * KNOT_ASPECT_W * KNOT_ASPECT_W * kMul;
  const kAz = kEl / (aspect * aspect);
  return { kAz, kEl };
}

/** CPU uniform: 4×vec3 (x=az rad, y=el rad, z=r scale). */
export function makeKnotAzEl(): Array<{ x: number; y: number; z: number }> {
  return KNOTS.map((k) => ({
    x: (k.azDeg * Math.PI) / 180,
    y: k.el,
    z: k.r,
  }));
}

/** CPU uniform: 4×vec3 rgb. */
export function makeKnotRgb(): Array<[number, number, number]> {
  return KNOTS.map((k) => hexToRgb(k.color));
}

function knotGaussBody(): string {
  return KNOTS.map((k, i) => {
    const { kAz, kEl } = knotK(k.aspect, k.kMul);
    const azP = AZ_PHASE[i]!.toFixed(1);
    const elP = EL_PHASE[i]!.toFixed(1);
    return `
  rScale = max(uKnots[${i}].z, 0.01);
  kAz = ${kAz.toFixed(2)} / (rScale * rScale);
  kEl = ${kEl.toFixed(2)} / (rScale * rScale);
  az0 = uKnots[${i}].x + 0.016 * sin(t * 1.05 + ${azP});
  dAz = atan(sin(az - az0), cos(az - az0));
  dEl = el - (uKnots[${i}].y + 0.008 * sin(t * 0.55 + ${elP}));
  m = exp(-dAz * dAz * kAz - dEl * dEl * kEl);
  knotCol += uKnotColor[${i}] * m;
  knotW += m;`;
  }).join("");
}

/**
 * Evaluates 4 anisotropic spots from uKnots (az+el+r) + uKnotColor.
 * core round · projects wide-az streak · skills small round · experience wide-soft.
 */
export const KNOT_GAUSS_GLSL = /* glsl */ `
vec4 knotSample(vec3 worldPos, float t) {
  vec3 n = normalize(worldPos);
  // Same axes as knotAzElFromPos: atan(z, x) from +X toward +Z.
  float az = atan(n.z, n.x);
  float el = asin(clamp(n.y, -1.0, 1.0));
  vec3 knotCol = vec3(0.0);
  float knotW = 0.0;
  float dAz;
  float dEl;
  float m;
  float az0;
  float rScale;
  float kAz;
  float kEl;
${knotGaussBody()}
  float mask = min(knotW, 1.0);
  knotCol /= max(knotW, 1e-4);
  return vec4(knotCol, mask);
}
`;

/** Ray → inner sky-sphere hit (camera inside radius). */
export const KNOT_HIT_GLSL = /* glsl */ `
vec3 knotHit(vec2 uv) {
  vec4 world = uInvViewProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(world.xyz / max(world.w, 1e-4) - uCameraPos);
  vec3 ro = uCameraPos;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - uRadius * uRadius;
  float h = max(b * b - c, 0.0);
  return ro + rd * (-b + sqrt(h));
}
`;
