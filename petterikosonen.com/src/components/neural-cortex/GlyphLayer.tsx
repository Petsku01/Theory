"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// GPU ASCII pass (three.js custom ShaderPass model): scene → WebGLRenderTarget,
// then one fullscreen GLSL pass samples luminance → glyph atlas.
// Atlas is baked once on a canvas; no per-frame CPU text.

/** Uniforms R2b may drive per-frame on the pass material. */
export const GLYPH_LAYER_UNIFORMS = {
  intensity: "uIntensity",
  cellSize: "uCellSize",
  contrast: "uContrast",
} as const;

const BG = new THREE.Color("#05070A");
const CYAN = new THREE.Color("#22D3EE");
const GREEN = new THREE.Color("#39FF88");
const VIOLET = new THREE.Color("#B47CFF");

// Dark → dense. Six-step ramp; space omitted so dim cells still ink.
const GLYPH_RAMP = ".:-=+#";
const ATLAS_CELL = 64;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tScene;
uniform sampler2D tAtlas;
uniform vec2 uResolution;
uniform float uCellSize;
uniform float uCharsetCount;
uniform float uIntensity;
uniform float uContrast;
uniform vec3 uBg;
uniform vec3 uCyan;
uniform vec3 uGreen;
uniform vec3 uViolet;

varying vec2 vUv;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 palette(float t, vec3 src) {
  float x = clamp(t, 0.0, 1.0);
  vec3 lo = mix(uCyan, uGreen, 0.32);
  float crest = smoothstep(0.55, 0.92, x);
  vec3 body = mix(uBg, lo, 0.50 + 0.28 * x);
  // Alpha-valley violet on # crests (L ≥ 60); no cyan wash.
  float vA = mix(0.48, 0.70, crest);
  return mix(body, uViolet * vA, crest);
}

void main() {
  vec2 fragPx = vUv * uResolution;
  float cell = max(uCellSize, 1.0);
  vec2 cellId = floor(fragPx / cell);
  vec2 cellCenter = (cellId + 0.5) * cell;
  vec2 sceneUv = cellCenter / uResolution;
  vec4 src = texture2D(tScene, sceneUv);

  float lum = luma(src.rgb);
  lum = clamp(pow(lum, max(uContrast, 0.2)), 0.0, 1.0);
  // Stretch in-range luma onto 6 steps so crests reach # (top ≥ 0.35).
  float stretched = clamp((lum - 0.055) / 0.28, 0.0, 1.0);

  float idx = floor(min(stretched, 0.9999) * uCharsetCount);
  float qLum = (idx + 0.5) / uCharsetCount;
  vec2 local = fract(fragPx / cell);
  // 1-row atlas, square cells: map the full cell onto the full atlas cell.
  // Half-texel inset on U avoids neighbour bleed; V uses nearly the full row
  // so glyphs aren't clipped into horizontal bars.
  vec2 gLocal = mix(vec2(0.03, 0.02), vec2(0.97, 0.98), local);
  vec2 atlasUv = vec2((idx + gLocal.x) / uCharsetCount, gLocal.y);
  float glyph = dot(texture2D(tAtlas, atlasUv).rgb, vec3(0.299, 0.587, 0.114));

  vec3 pal = palette(qLum, src.rgb);
  // Floor + ink gate only on glyph ink — do not crush whole-field luma.
  float ink = glyph * smoothstep(0.04, 0.09, lum);
  vec3 asciiCol = mix(uBg, pal, ink);

  vec3 outCol = mix(src.rgb, asciiCol, clamp(uIntensity, 0.0, 1.0));
  gl_FragColor = vec4(outCol, 1.0);
}
`;

function createGlyphAtlas(): THREE.CanvasTexture {
  const count = GLYPH_RAMP.length;
  const canvas = document.createElement("canvas");
  canvas.width = count * ATLAS_CELL;
  canvas.height = ATLAS_CELL;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.imageSmoothingEnabled = false;

  const fromCss =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim()
      : "";
  const family = fromCss || `"IBM Plex Mono", ui-monospace, monospace`;
  ctx.font = `${ATLAS_CELL}px ${family}`;

  for (let i = 0; i < count; i++) {
    const ch = GLYPH_RAMP[i] ?? " ";
    if (ch === " ") continue;
    const m = ctx.measureText(ch);
    const ascent = m.actualBoundingBoxAscent || ATLAS_CELL * 0.8;
    const descent = m.actualBoundingBoxDescent || ATLAS_CELL * 0.2;
    const gw = Math.max(m.width, 1);
    const gh = Math.max(ascent + descent, 1);
    const scale = Math.min((ATLAS_CELL * 0.9) / gw, (ATLAS_CELL * 0.92) / gh);
    ctx.save();
    ctx.translate((i + 0.5) * ATLAS_CELL, ATLAS_CELL * 0.5);
    ctx.scale(scale, scale);
    ctx.textBaseline = "alphabetic";
    ctx.fillText(ch, 0, (ascent - descent) * 0.5);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export type GlyphLayerProps = {
  /** 0 = raw scene, 1 = full glyph pass. R2b: uniform uIntensity. */
  intensity?: number;
  /** Glyph cell size in CSS pixels — multiplied by dpr so on-screen size is stable. */
  cellSize?: number;
  /** Luma curve. R2b: uniform uContrast. */
  contrast?: number;
};

export function GlyphLayer({
  intensity = 0.85,
  cellSize = 14,
  contrast = 1.38,
}: GlyphLayerProps) {
  const { gl, scene, camera } = useThree();
  const intensityRef = useRef(intensity);
  const cellSizeRef = useRef(cellSize);
  const contrastRef = useRef(contrast);
  intensityRef.current = intensity;
  cellSizeRef.current = cellSize;
  contrastRef.current = contrast;

  const scratch = useMemo(() => new THREE.Vector2(), []);

  const resources = useMemo(() => {
    const atlas =
      typeof document === "undefined" ? null : createGlyphAtlas();
    const rt = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      stencilBuffer: false,
      depthBuffer: true,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
    });
    rt.texture.colorSpace = THREE.NoColorSpace;

    const uniforms = {
      tScene: { value: rt.texture },
      tAtlas: { value: atlas },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCellSize: { value: 14 },
      uCharsetCount: { value: GLYPH_RAMP.length },
      uIntensity: { value: 0.85 },
      uContrast: { value: 1.38 },
      uBg: { value: BG.clone() },
      uCyan: { value: CYAN.clone() },
      uGreen: { value: GREEN.clone() },
      uViolet: { value: VIOLET.clone() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const passScene = new THREE.Scene();
    passScene.add(quad);
    const passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    return { atlas, rt, uniforms, material, quad, passScene, passCamera };
  }, []);

  useEffect(() => {
    return () => {
      resources.rt.dispose();
      resources.material.dispose();
      resources.quad.geometry.dispose();
      resources.atlas?.dispose();
    };
  }, [resources]);

  useFrame(() => {
    if (!resources.atlas) return;

    const dpr = gl.getPixelRatio();
    gl.getDrawingBufferSize(scratch);
    const w = Math.max(1, scratch.x);
    const h = Math.max(1, scratch.y);
    if (resources.rt.width !== w || resources.rt.height !== h) {
      resources.rt.setSize(w, h);
    }

    // Cell size in physical pixels = CSS px * dpr → same visual cell on any dpr.
    const cssCell = Math.max(8, cellSizeRef.current);
    resources.uniforms.uCellSize.value = cssCell * dpr;
    resources.uniforms.uResolution.value.set(w, h);
    resources.uniforms.uIntensity.value = intensityRef.current;
    resources.uniforms.uContrast.value = contrastRef.current;
    resources.uniforms.tScene.value = resources.rt.texture;

    const prevTarget = gl.getRenderTarget();
    const prevAutoClear = gl.autoClear;
    gl.autoClear = true;
    gl.setRenderTarget(resources.rt);
    gl.setClearColor(BG, 1);
    gl.clear();
    gl.render(scene, camera);

    gl.setRenderTarget(null);
    gl.render(resources.passScene, resources.passCamera);
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAutoClear;
  }, 1);

  return null;
}
