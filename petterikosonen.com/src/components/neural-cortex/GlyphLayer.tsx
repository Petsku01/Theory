"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  KNOT_FLOW_DEFAULT,
  KNOT_GAUSS_GLSL,
  KNOT_HIT_GLSL,
  KNOT_LUMA_LIFT,
  KNOT_MASK_THRESHOLD,
  KNOT_MIX,
  KNOT_RADIUS_DEFAULT,
  KNOT_TIME_SCALE,
  makeKnotAzEl,
  makeKnotRgb,
} from "@/components/neural-cortex/knotGauss";

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

const HIST_SIZE = 64;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const HIST_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform float uContrast;
varying vec2 vUv;
float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float lum = clamp(pow(max(luma(c), 0.0), max(uContrast, 0.2)), 0.0, 1.0);
  gl_FragColor = vec4(lum, lum, lum, 1.0);
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
uniform float uP60;
uniform float uP97;
uniform vec3 uBg;
uniform vec3 uCyan;
uniform vec3 uGreen;
uniform vec3 uViolet;
uniform float uTime;
uniform float uFlow;
uniform float uRadius;
uniform vec3 uCameraPos;
uniform mat4 uInvViewProj;
uniform vec3 uKnots[4];
uniform vec3 uKnotColor[4];

varying vec2 vUv;

${KNOT_HIT_GLSL}
${KNOT_GAUSS_GLSL}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float lutQ(float idx) {
  float q = 0.04;
  q = mix(q, 0.12, step(0.5, idx));
  q = mix(q, 0.26, step(1.5, idx));
  q = mix(q, 0.47, step(2.5, idx));
  q = mix(q, 0.72, step(3.5, idx));
  q = mix(q, 1.00, step(4.5, idx));
  return q;
}

vec3 palette(float t) {
  float x = clamp(t, 0.0, 1.0);
  vec3 lo = mix(uCyan, uGreen, 0.32);
  float crest = smoothstep(0.47, 0.85, x);
  vec3 hueCol = mix(lo, uViolet, crest);
  float hl = max(luma(hueCol), 1e-4);
  float lift = clamp((x - hl) / max(1.0 - hl, 1e-4), 0.0, 0.55);
  vec3 lit = mix(hueCol, vec3(1.0), lift);
  float ll = max(luma(lit), 1e-4);
  return lit * (x / ll);
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
  float nL = clamp((lum - uP60) / max(uP97 - uP60, 0.02), 0.0, 1.0);

  float idx = floor(min(nL, 0.9999) * uCharsetCount);
  float qLum = lutQ(idx);
  vec2 local = fract(fragPx / cell);
  // 1-row atlas, square cells: map the full cell onto the full atlas cell.
  // Half-texel inset on U avoids neighbour bleed; V uses nearly the full row
  // so glyphs aren't clipped into horizontal bars.
  vec2 gLocal = mix(vec2(0.03, 0.02), vec2(0.97, 0.98), local);
  vec2 atlasUv = vec2((idx + gLocal.x) / uCharsetCount, gLocal.y);
  float glyph = dot(texture2D(tAtlas, atlasUv).rgb, vec3(0.299, 0.587, 0.114));

  vec3 pal = palette(qLum);
  float ink = glyph * smoothstep(0.0, 0.06, nL);
  vec3 asciiCol = mix(uBg, pal, ink);

  vec4 ks = knotSample(knotHit(sceneUv), uTime * ${KNOT_TIME_SCALE.toFixed(3)} * uFlow);
  if (ks.a > ${KNOT_MASK_THRESHOLD.toFixed(2)}) {
    asciiCol = mix(asciiCol, ks.rgb, ${KNOT_MIX.toFixed(2)});
    asciiCol *= (1.0 + ks.a * ${KNOT_LUMA_LIFT.toFixed(2)});
  }

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
  const clearColorScratch = useMemo(() => new THREE.Color(), []);
  const histAtRef = useRef(0);
  const histFrameRef = useRef(0);
  const histBufRef = useRef(new Uint8Array(HIST_SIZE * HIST_SIZE * 4));
  const histBinsRef = useRef(new Uint32Array(256));

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

    const histRT = new THREE.WebGLRenderTarget(HIST_SIZE, HIST_SIZE, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      stencilBuffer: false,
      depthBuffer: false,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
    });
    histRT.texture.colorSpace = THREE.NoColorSpace;

    const uniforms = {
      tScene: { value: rt.texture },
      tAtlas: { value: atlas },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCellSize: { value: 14 },
      uCharsetCount: { value: GLYPH_RAMP.length },
      uIntensity: { value: 0.85 },
      uContrast: { value: 1.38 },
      uP60: { value: 0.05 },
      uP97: { value: 0.35 },
      uBg: { value: BG.clone() },
      uCyan: { value: CYAN.clone() },
      uGreen: { value: GREEN.clone() },
      uViolet: { value: VIOLET.clone() },
      uTime: { value: 0 },
      uFlow: { value: KNOT_FLOW_DEFAULT },
      uRadius: { value: KNOT_RADIUS_DEFAULT },
      uCameraPos: { value: new THREE.Vector3() },
      uInvViewProj: { value: new THREE.Matrix4() },
      uKnots: {
        value: makeKnotAzEl().map((v) => new THREE.Vector3(v.x, v.y, v.z)),
      },
      uKnotColor: {
        value: makeKnotRgb().map((rgb) => new THREE.Color().fromArray(rgb)),
      },
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

    const histUniforms = {
      tScene: { value: rt.texture },
      uContrast: { value: 1.38 },
    };
    const histMaterial = new THREE.ShaderMaterial({
      uniforms: histUniforms,
      vertexShader: VERT,
      fragmentShader: HIST_FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    const histQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), histMaterial);
    histQuad.frustumCulled = false;
    const histScene = new THREE.Scene();
    histScene.add(histQuad);

    return {
      atlas,
      rt,
      histRT,
      uniforms,
      material,
      quad,
      passScene,
      passCamera,
      histUniforms,
      histMaterial,
      histQuad,
      histScene,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.rt.dispose();
      resources.histRT.dispose();
      resources.material.dispose();
      resources.histMaterial.dispose();
      resources.quad.geometry.dispose();
      resources.histQuad.geometry.dispose();
      resources.atlas?.dispose();
    };
  }, [resources]);

  // priority > 0: R3F skips default scene render. We own: 1 scene→RT, 1 blit quad.
  useFrame(({ clock }) => {
    if (!resources.atlas) return;

    const dpr = gl.getPixelRatio();
    gl.getDrawingBufferSize(scratch);
    const w = Math.max(1, scratch.x);
    const h = Math.max(1, scratch.y);
    if (resources.rt.width !== w || resources.rt.height !== h) {
      resources.rt.setSize(w, h);
    }

    const cssCell = Math.max(8, cellSizeRef.current);
    resources.uniforms.uCellSize.value = cssCell * dpr;
    resources.uniforms.uResolution.value.set(w, h);
    resources.uniforms.uIntensity.value = intensityRef.current;
    resources.uniforms.uContrast.value = contrastRef.current;
    resources.uniforms.tScene.value = resources.rt.texture;
    resources.uniforms.uTime.value = clock.elapsedTime;
    resources.uniforms.uFlow.value = KNOT_FLOW_DEFAULT;
    resources.uniforms.uRadius.value = KNOT_RADIUS_DEFAULT;
    resources.uniforms.uCameraPos.value.copy(camera.position);
    resources.uniforms.uInvViewProj.value.multiplyMatrices(
      camera.matrixWorld,
      camera.projectionMatrixInverse,
    );

    const prevTarget = gl.getRenderTarget();
    const prevAutoClear = gl.autoClear;
    const prevClearAlpha = gl.getClearAlpha();
    gl.getClearColor(clearColorScratch);

    gl.autoClear = true;
    gl.setClearColor(BG, 1);
    gl.setRenderTarget(resources.rt);
    gl.clear();
    gl.render(scene, camera);

    const frameN = ++histFrameRef.current;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (frameN > 1 && now - histAtRef.current >= 500) {
      histAtRef.current = now;
      resources.histUniforms.tScene.value = resources.rt.texture;
      resources.histUniforms.uContrast.value = contrastRef.current;
      gl.setRenderTarget(resources.histRT);
      gl.clear();
      gl.render(resources.histScene, resources.passCamera);
      gl.readRenderTargetPixels(
        resources.histRT,
        0,
        0,
        HIST_SIZE,
        HIST_SIZE,
        histBufRef.current,
      );
      const buf = histBufRef.current;
      const bins = histBinsRef.current;
      bins.fill(0);
      let count = 0;
      for (let i = 0; i < buf.length; i += 4) {
        bins[buf[i]!]++;
        count++;
      }
      const pick = (p: number) => {
        const target = p * count;
        let acc = 0;
        for (let b = 0; b < 256; b++) {
          acc += bins[b]!;
          if (acc >= target) return b / 255;
        }
        return 1;
      };
      let p60 = pick(0.6);
      let p97 = pick(0.97);
      if (p97 - p60 < 0.02) p97 = Math.min(1, p60 + 0.02);
      const u = resources.uniforms;
      u.uP60.value += (p60 - u.uP60.value) * 0.45;
      u.uP97.value += (p97 - u.uP97.value) * 0.45;
    }

    gl.setRenderTarget(null);
    gl.render(resources.passScene, resources.passCamera);
    gl.setRenderTarget(prevTarget);
    gl.setClearColor(clearColorScratch, prevClearAlpha);
    gl.autoClear = prevAutoClear;
  }, 1);

  return null;
}
