"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Uniforms R2b may drive per-frame on the field material. */
export const MYCELIUM_FIELD_UNIFORMS = {
  time: "uTime",
  density: "uDensity",
  flow: "uFlow",
} as const;

const VERT = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uDensity;
uniform float uFlow;
uniform float uMobile;
uniform vec3 uBg;
uniform vec3 uCyan;
uniform vec3 uGreen;
uniform vec3 uViolet;

varying vec3 vWorldPos;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  v += a * noise(p);
  p = p * 2.07 + vec2(1.7, 9.2);
  a *= 0.5;
  v += a * noise(p);
  p = p * 2.07 + vec2(1.7, 9.2);
  a *= 0.5;
  v += a * noise(p);
  p = p * 2.07 + vec2(1.7, 9.2);
  a *= 0.5;
  if (uMobile < 0.5) {
    v += a * noise(p);
    p = p * 2.07 + vec2(1.7, 9.2);
    a *= 0.5;
    v += a * noise(p);
  } else {
    v += a * 0.5;
  }
  return v;
}

void main() {
  vec3 p = vWorldPos * 0.038 * max(uDensity, 0.15);
  float t = uTime * 0.045 * uFlow;
  vec2 st = vec2(p.x + p.z * 0.35, p.y * 0.85 + p.z * 0.2);

  vec2 q = vec2(
    fbm(st + vec2(t, -t * 0.4)),
    fbm(st + vec2(5.2, 1.3) - t * 0.65)
  );
  vec2 r = vec2(
    fbm(st + 1.6 * q + vec2(1.7, 9.2) + t * 0.28),
    fbm(st + 1.6 * q + vec2(8.3, 2.8) - t * 0.22)
  );

  float n = fbm(st + 2.3 * r);
  float ridges = 1.0 - abs(n * 2.0 - 1.0);
  ridges = pow(ridges, 2.55);

  float veins = fbm(st * 2.15 + r * 2.8 + t * 0.12);
  veins = pow(max(0.0, veins * 1.22 - 0.40), 1.65);

  float hyphaRaw = max(ridges * 0.92, veins);
  float hyphaNorm;
  if (uMobile < 0.5) {
    float nA = fbm(st + 2.3 * r + vec2(0.22, 0.08));
    float nB = fbm(st + 2.3 * r + vec2(-0.14, 0.19));
    float rA = pow(1.0 - abs(nA * 2.0 - 1.0), 2.55);
    float rB = pow(1.0 - abs(nB * 2.0 - 1.0), 2.55);
    float localMax = max(hyphaRaw, max(rA, rB));
    hyphaNorm = hyphaRaw / max(localMax, 1e-4);
  } else {
    hyphaNorm = clamp(hyphaRaw * 1.12, 0.0, 1.0);
  }

  vec3 col = uBg;
  float ribbonMask = smoothstep(0.55, 0.85, hyphaNorm);
  col += uCyan * hyphaRaw * 1.65 * (1.0 - ribbonMask);
  col += uGreen * veins * 0.42 * (1.0 - ribbonMask);
  col += uViolet * ribbonMask * 0.85;

  // Growth knots: vertical field bands at ~28/118/208/298 deg, not geometry.
  // Luminance from the field itself; slow undulation rides uTime/flow (t).
  float az = atan(vWorldPos.z, vWorldPos.x);
  float knot = 0.0;
  float dAz;
  dAz = atan(sin(az - (0.488692 + 0.055 * sin(t * 2.4 + 0.4))), cos(az - (0.488692 + 0.055 * sin(t * 2.4 + 0.4))));
  knot += exp(-dAz * dAz * 28.0);
  dAz = atan(sin(az - (2.059489 + 0.055 * sin(t * 2.1 + 1.7))), cos(az - (2.059489 + 0.055 * sin(t * 2.1 + 1.7))));
  knot += exp(-dAz * dAz * 28.0);
  dAz = atan(sin(az - (3.630285 + 0.055 * sin(t * 2.6 + 2.9))), cos(az - (3.630285 + 0.055 * sin(t * 2.6 + 2.9))));
  knot += exp(-dAz * dAz * 28.0);
  dAz = atan(sin(az - (5.201081 + 0.055 * sin(t * 2.2 + 4.1))), cos(az - (5.201081 + 0.055 * sin(t * 2.2 + 4.1))));
  knot += exp(-dAz * dAz * 28.0);
  knot = min(knot, 1.0);
  col *= (1.0 + knot * mix(0.10, 0.18, 0.5 + 0.5 * sin(t * 1.6)));

  gl_FragColor = vec4(col, 1.0);
}
`;

export type MyceliumFieldProps = {
  density?: number;
  flow?: number;
  radius?: number;
  mobile?: boolean;
};

export function MyceliumField({
  density = 1.45,
  flow = 1.35,
  radius = 48,
  mobile = false,
}: MyceliumFieldProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const mobileLod = useMemo(() => {
    if (mobile) return true;
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 767px)").matches
    );
  }, [mobile]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDensity: { value: density },
      uFlow: { value: flow },
      uMobile: { value: mobileLod ? 1 : 0 },
      uBg: { value: new THREE.Color("#05070A") },
      uCyan: { value: new THREE.Color("#22D3EE") },
      uGreen: { value: new THREE.Color("#39FF88") },
      uViolet: { value: new THREE.Color("#B47CFF") },
    }),
    // Stable object — density/flow/lod are written each frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uDensity.value = density;
    mat.uniforms.uFlow.value = flow;
    mat.uniforms.uMobile.value = mobileLod ? 1 : 0;
  });

  return (
    <mesh renderOrder={-10} frustumCulled={false} scale={radius}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        ref={matRef}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest
        toneMapped={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
      />
    </mesh>
  );
}
