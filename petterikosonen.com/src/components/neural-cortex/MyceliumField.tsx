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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.07 + vec2(1.7, 9.2);
    a *= 0.5;
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
  // Local max-normalization of this field (3-tap), independent of scene luma.
  float nA = fbm(st + 2.3 * r + vec2(0.22, 0.08));
  float nB = fbm(st + 2.3 * r + vec2(-0.14, 0.19));
  float rA = pow(1.0 - abs(nA * 2.0 - 1.0), 2.55);
  float rB = pow(1.0 - abs(nB * 2.0 - 1.0), 2.55);
  float localMax = max(hyphaRaw, max(rA, rB));
  float hyphaNorm = hyphaRaw / max(localMax, 1e-4);

  vec3 col = uBg;
  float ribbonMask = smoothstep(0.55, 0.85, hyphaNorm);
  col += uCyan * hyphaRaw * 1.65 * (1.0 - ribbonMask);
  col += uGreen * veins * 0.42 * (1.0 - ribbonMask);
  col += uViolet * ribbonMask * 0.85;

  gl_FragColor = vec4(col, 1.0);
}
`;

export type MyceliumFieldProps = {
  density?: number;
  flow?: number;
  radius?: number;
};

export function MyceliumField({
  density = 1.45,
  flow = 1.35,
  radius = 48,
}: MyceliumFieldProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDensity: { value: density },
      uFlow: { value: flow },
      uBg: { value: new THREE.Color("#05070A") },
      uCyan: { value: new THREE.Color("#22D3EE") },
      uGreen: { value: new THREE.Color("#39FF88") },
      uViolet: { value: new THREE.Color("#B47CFF") },
    }),
    // Stable object — density/flow are written each frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uDensity.value = density;
    mat.uniforms.uFlow.value = flow;
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
