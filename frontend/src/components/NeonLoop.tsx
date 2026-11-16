import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface NeonLoopProps {
  /** Palavra ou marca que forma o anel tipográfico 3D giratório. */
  text?: string;
  /** Cor primária do neon (hex). */
  color?: string;
  /** Cor secundária de brilho/profundidade (hex). */
  accentColor?: string;
  /** Ajusta contraste para tema claro. */
  isLight?: boolean;
  /** Velocidade base da rotação em voltas por segundo. */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aUv;

  uniform float uAspect;
  uniform float uPitch;
  uniform float uYaw;
  uniform float uRoll;

  varying vec2 vUv;
  varying float vNormalZ;
  varying float vDepth;
  varying float vLocalY;

  mat3 rotX(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(
      1.0, 0.0, 0.0,
      0.0, c, -s,
      0.0, s, c
    );
  }

  mat3 rotY(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(
      c, 0.0, s,
      0.0, 1.0, 0.0,
      -s, 0.0, c
    );
  }

  mat3 rotZ(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(
      c, -s, 0.0,
      s, c, 0.0,
      0.0, 0.0, 1.0
    );
  }

  void main() {
    mat3 rot = rotZ(uRoll) * rotX(uPitch) * rotY(uYaw);
    vec3 pos = rot * aPosition;
    vec3 nrm = normalize(rot * aNormal);

    float camZ = 5.85;
    float viewZ = camZ - pos.z;

    float fX = min(1.94, uAspect * 1.38);
    float fY = fX * uAspect;

    gl_Position = vec4(
      pos.x * fX,
      pos.y * fY,
      (-pos.z * viewZ) / 12.0,
      viewZ
    );

    vUv = aUv;
    vNormalZ = nrm.z;
    vDepth = pos.z;
    vLocalY = aUv.y;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uScrollPhase;
  uniform float uTime;
  uniform float uPass;
  uniform float uBurst;
  uniform float uIsLight;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform vec3 uCoreColor;

  varying vec2 vUv;
  varying float vNormalZ;
  varying float vDepth;
  varying float vLocalY;

  void main() {
    if (uPass < 0.5 && vNormalZ >= 0.0) discard;
    if (uPass >= 0.5 && vNormalZ < 0.0) discard;

    // Usa UVs contínuas com gl.REPEAT para evitar salto de mipmap (fract quebra derivadas 2x2)
    float scrollU = vUv.x + uScrollPhase;
    vec4 tex = texture2D(uTexture, vec2(scrollU, vUv.y));

    float wideGlow = tex.r;
    float crispCore = tex.g;
    float tightGlow = tex.b;

    // Suavização nos limites verticais e nas curvas laterais sem tocar a borda do canvas
    float verticalSoft = smoothstep(0.0, 0.08, vLocalY) * smoothstep(1.0, 0.92, vLocalY);
    float facing = abs(vNormalZ);
    float turnFade = smoothstep(0.04, 0.42, facing);

    // Onda luminosa contínua percorrendo as letras ao longo do anel
    float wavePhase = vUv.x - uTime * 0.24;
    float comet = pow(0.5 + 0.5 * cos(wavePhase * 6.2831853), 5.0);
    float energyBoost = 1.0 + comet * 0.55 + uBurst * 0.85;

    // Iridescência holográfica sutil nas cristas do brilho
    vec3 holoRim = vec3(
      1.0 + 0.05 * sin(vUv.x * 12.566 + uTime * 1.4),
      0.96 + 0.05 * sin(vUv.x * 12.566 + uTime * 1.4 + 1.2),
      0.86 + 0.14 * sin(vUv.x * 12.566 + uTime * 1.4 + 2.5)
    );

    if (uPass < 0.5) {
      // Arco traseiro com desfoque óptico (bokeh) suave para profundidade 3D
      float depthNorm = clamp((vDepth + 1.05) / 2.1, 0.0, 1.0);
      float bokehMix = mix(wideGlow * 0.95 + tightGlow * 0.5, tightGlow * 0.65 + crispCore * 0.38, depthNorm);

      if (uIsLight > 0.5) {
        vec3 lightBackTone = mix(uAccent, uColor, depthNorm * 0.7);
        vec3 litLightBack = clamp(mix(lightBackTone, uCoreColor, comet * 0.22 + uBurst * 0.18), 0.0, 1.0);
        float lightBackAlpha = clamp(bokehMix * mix(0.24, 0.44, depthNorm), 0.0, 0.52) * turnFade * verticalSoft;
        if (lightBackAlpha < 0.005) discard;
        gl_FragColor = vec4(litLightBack * lightBackAlpha, lightBackAlpha);
        return;
      }

      vec3 backTone = mix(uAccent, uColor, depthNorm * 0.55) * holoRim;
      float backAlpha = clamp(bokehMix * mix(0.18, 0.36, depthNorm), 0.0, 0.48) * turnFade * verticalSoft;

      if (backAlpha < 0.005) discard;
      vec3 litBack = backTone * (0.85 + 0.32 * comet + uBurst * 0.35);
      gl_FragColor = vec4(litBack * backAlpha, backAlpha);
      return;
    }

    // Sombra suave deslocada para dar relevo atrás do tubo frontal
    vec4 depthTex = texture2D(uTexture, vec2(scrollU - 0.002, clamp(vUv.y + 0.012, 0.0, 1.0)));
    float shadowMask = depthTex.b * 0.34;

    if (uIsLight > 0.5) {
      // No tema claro, destaca a frente em amarelo forte (#FFC400 / #FFE026) com bisel âmbar nítido
      float coreMask = smoothstep(0.08, 0.72, crispCore);
      float crispRim = smoothstep(0.46, 0.92, tightGlow) * (1.0 - coreMask * 0.88);
      float bevelShadow = smoothstep(0.22, 0.86, depthTex.g) * (1.0 - coreMask);
      float auraMask = wideGlow * (0.14 + 0.08 * comet + uBurst * 0.14);

      float sheen = smoothstep(0.26, 0.74, vLocalY);
      vec3 deepYellow = mix(vec3(0.99, 0.69, 0.0), uColor, sheen);
      vec3 faceYellow = mix(deepYellow, uCoreColor, clamp(0.22 + comet * 0.58 + uBurst * 0.38, 0.0, 1.0));

      vec3 rimColor = mix(uAccent, vec3(0.62, 0.34, 0.0), clamp(bevelShadow * 0.85, 0.0, 1.0));
      vec3 auraColor = vec3(1.0, 0.84, 0.1);

      float rimAlpha = clamp(crispRim * 0.52 + bevelShadow * 0.86, 0.0, 0.92);
      float lightAlpha = clamp(max(coreMask, max(rimAlpha, auraMask)), 0.0, 1.0)
        * turnFade
        * verticalSoft;

      if (lightAlpha < 0.006) discard;

      vec3 stagedRgb = mix(auraColor, rimColor, smoothstep(0.04, 0.58, rimAlpha));
      vec3 finalLightRgb = mix(stagedRgb, faceYellow, coreMask);

      gl_FragColor = vec4(finalLightRgb * lightAlpha, lightAlpha);
      return;
    }

    // Camada frontal nítida com núcleo neon incandescente + halo dourado
    vec3 glowRgb = mix(uAccent, uColor, clamp(tightGlow * 1.15, 0.0, 1.0)) * holoRim;
    vec3 coreRgb = mix(uColor, uCoreColor, clamp(crispCore * 1.25, 0.0, 1.0));

    float haloLayer = wideGlow * 0.55 + tightGlow * 0.85;
    float frontIntensity = (haloLayer * 0.8 + crispCore * 1.25 + shadowMask) * energyBoost;

    vec3 combined = glowRgb * (haloLayer * 0.85 + shadowMask) * energyBoost
      + coreRgb * crispCore * (1.05 + 0.32 * comet + uBurst * 0.45);

    // Tone mapping suave para manter branco-dourado limpo sem estourar
    vec3 mapped = combined / (1.0 + combined * 0.28);
    float alpha = clamp(frontIntensity * 0.92, 0.0, 1.0) * turnFade * verticalSoft;

    if (alpha < 0.006) discard;
    gl_FragColor = vec4(mapped * alpha, alpha);
  }
`;

function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [1, 0.78, 0];
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

interface LoopMeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

function buildNeonTypographyMesh(segments = 256, rows = 12): LoopMeshData {
  const rx = 1.98;
  const rz = 0.94;
  const waveAmp = 0.095;
  const bandHalfH = 0.48;

  const vertsPerCol = rows + 1;
  const totalVerts = (segments + 1) * vertsPerCol;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = new Uint16Array(segments * rows * 6);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const theta = u * Math.PI * 2;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    const sx = rx * sinT;
    const sy = waveAmp * Math.sin(theta * 2);
    const sz = rz * cosT;

    const tx = rx * cosT;
    const ty = waveAmp * 2 * Math.cos(theta * 2);
    const tz = -rz * sinT;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    const tnx = tx / tLen;
    const tny = ty / tLen;
    const tnz = tz / tLen;

    let nx = -tnz;
    const ny = 0;
    let nz = tnx;
    const nLen = Math.hypot(nx, ny, nz) || 1;
    nx /= nLen;
    nz /= nLen;

    let ux = ny * tnz - nz * tny;
    let uy = nz * tnx - nx * tnz;
    let uz = nx * tny - ny * tnx;
    const uLen = Math.hypot(ux, uy, uz) || 1;
    ux /= uLen;
    uy /= uLen;
    uz /= uLen;

    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const offset = (v - 0.5) * 2 * bandHalfH;
      const idx = i * vertsPerCol + j;

      positions[idx * 3] = sx + ux * offset;
      positions[idx * 3 + 1] = sy + uy * offset;
      positions[idx * 3 + 2] = sz + uz * offset;

      normals[idx * 3] = nx;
      normals[idx * 3 + 1] = ny;
      normals[idx * 3 + 2] = nz;

      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  let ptr = 0;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * vertsPerCol + j;
      const b = (i + 1) * vertsPerCol + j;
      const c = (i + 1) * vertsPerCol + (j + 1);
      const d = i * vertsPerCol + (j + 1);

      indices[ptr++] = a;
      indices[ptr++] = b;
      indices[ptr++] = c;
      indices[ptr++] = a;
      indices[ptr++] = c;
      indices[ptr++] = d;
    }
  }

  return { positions, normals, uvs, indices };
}

function drawNeonTypographyAtlas(text: string, maxTextureSize: number): HTMLCanvasElement {
  const width = maxTextureSize >= 4096 ? 4096 : 2048;
  const height = width >= 4096 ? 512 : 256;
  const scaleFactor = height / 256;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cleanWord = text.trim() || 'NobleDeck';

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Calibra a proporção exata 1:1 das letras com o perímetro real da malha 3D
  const meshCircumference = 9.465;
  const ribbonWorldHeight = 0.96;
  const meshAspect = meshCircumference / ribbonWorldHeight;
  const canvasAspect = width / height;
  const horizStretch = canvasAspect / meshAspect;

  const repeats = 3;
  const slotPx = width / repeats;
  let fontSize = Math.round(118 * scaleFactor);
  ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;

  const measuredUnscaled = Math.max(ctx.measureText(cleanWord).width, 80);
  const maxAllowedUnscaled = (slotPx * 0.82) / horizStretch;
  if (measuredUnscaled > maxAllowedUnscaled) {
    fontSize = Math.max(24, Math.floor(fontSize * (maxAllowedUnscaled / measuredUnscaled)));
    ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const wordWidth = Math.max(ctx.measureText(cleanWord).width, 60);
  const slotUnscaled = slotPx / horizStretch;
  // Centraliza "NobleDeck" no arco frontal e mantém a emenda x=0 na área vazia entre palavras
  const startOffsetX = -(wordWidth * 0.5);
  const cy = height / 2 + 2 * scaleFactor;

  ctx.save();
  ctx.scale(horizStretch, 1);
  ctx.globalCompositeOperation = 'lighter';

  const drawRepeated = () => {
    for (let i = -1; i <= repeats + 1; i++) {
      ctx.fillText(cleanWord, startOffsetX + i * slotUnscaled, cy);
    }
  };

  // Canal R: halo bokeh amplo para profundidade do arco traseiro e aura frontal
  ctx.shadowColor = 'rgb(255, 0, 0)';
  ctx.shadowBlur = Math.round(28 * scaleFactor);
  ctx.fillStyle = 'rgb(195, 0, 0)';
  drawRepeated();

  // Canal B: halo médio vibrante ao redor do traço
  ctx.shadowColor = 'rgb(0, 0, 255)';
  ctx.shadowBlur = Math.round(9 * scaleFactor);
  ctx.fillStyle = 'rgb(0, 0, 240)';
  drawRepeated();

  // Canal G: núcleo tipográfico de altíssima definição
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgb(0, 255, 0)';
  drawRepeated();

  ctx.restore();
  return canvas;
}

/**
 * Anel tipográfico 3D em WebGL onde o próprio nome "NobleDeck" forma o loop neon giratório.
 */
export const NeonLoop: React.FC<NeonLoopProps> = ({
  text = 'NobleDeck',
  color,
  accentColor,
  isLight = false,
  speed = 0.055,
  className = '',
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerTargetRef = useRef({ yaw: 0, pitch: 0.36, roll: -0.13 });
  const hoverRef = useRef(false);
  const burstRef = useRef(0);
  const [webglReady, setWebglReady] = useState(true);

  const primaryHex = color ?? (isLight ? '#FFC400' : '#FFD21A');
  const secondaryHex = accentColor ?? (isLight ? '#D97700' : '#FF9D00');
  const coreHex = isLight ? '#FFE026' : '#FFFDF2';

  const cleanText = text.trim();

  const handleClickBurst = useCallback(() => {
    burstRef.current = 1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      setWebglReady(false);
      return;
    }

    const vShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vShader || !fShader) {
      if (vShader) gl.deleteShader(vShader);
      if (fShader) gl.deleteShader(fShader);
      setWebglReady(false);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      setWebglReady(false);
      return;
    }

    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      setWebglReady(false);
      return;
    }

    const mesh = buildNeonTypographyMesh();

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    const nrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    const maxTexSize = (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || 2048;
    const anisoExt =
      gl.getExtension('EXT_texture_filter_anisotropic') ||
      gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

    const texture = gl.createTexture();
    const uploadAtlas = () => {
      if (!texture) return;
      const atlas = drawNeonTypographyAtlas(cleanText, maxTexSize);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (anisoExt) {
        const maxAniso = (gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number) || 4;
        gl.texParameterf(gl.TEXTURE_2D, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
      }
      gl.generateMipmap(gl.TEXTURE_2D);
    };

    uploadAtlas();
    let mounted = true;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (mounted) uploadAtlas();
      });
    }

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aNormal = gl.getAttribLocation(program, 'aNormal');
    const aUv = gl.getAttribLocation(program, 'aUv');

    const uAspect = gl.getUniformLocation(program, 'uAspect');
    const uPitch = gl.getUniformLocation(program, 'uPitch');
    const uYaw = gl.getUniformLocation(program, 'uYaw');
    const uRoll = gl.getUniformLocation(program, 'uRoll');
    const uScrollPhase = gl.getUniformLocation(program, 'uScrollPhase');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uPass = gl.getUniformLocation(program, 'uPass');
    const uBurst = gl.getUniformLocation(program, 'uBurst');
    const uIsLight = gl.getUniformLocation(program, 'uIsLight');
    const uColor = gl.getUniformLocation(program, 'uColor');
    const uAccent = gl.getUniformLocation(program, 'uAccent');
    const uCoreColor = gl.getUniformLocation(program, 'uCoreColor');
    const uTexture = gl.getUniformLocation(program, 'uTexture');

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice =
      typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);

    const handlePointerMove = (e: PointerEvent) => {
      if (prefersReducedMotion) return;
      const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      pointerTargetRef.current.yaw = nx * 0.22;
      pointerTargetRef.current.pitch = 0.36 + ny * 0.14;
      pointerTargetRef.current.roll = -0.13 + nx * 0.04;
    };

    const handlePointerLeave = () => {
      pointerTargetRef.current.yaw = 0;
      pointerTargetRef.current.pitch = 0.36;
      pointerTargetRef.current.roll = -0.13;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    let cssWidth = canvas.clientWidth || 720;
    let cssHeight = canvas.clientHeight || 400;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      cssWidth = rect.width;
      cssHeight = rect.height;
      const maxDpr = isTouchDevice ? 1 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    resize();

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglReady(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    const [cr, cg, cb] = hexToRgbNorm(primaryHex);
    const [ar, ag, ab] = hexToRgbNorm(secondaryHex);
    const [kr, kg, kb] = hexToRgbNorm(coreHex);

    let currentYaw = 0;
    let currentPitch = 0.36;
    let currentRoll = -0.13;
    let currentVel = speed;
    let scrollPhase = 0;
    let rafId = 0;
    let lastNow = performance.now();
    const startNow = lastNow;

    const renderFrame = (now: number) => {
      if (!mounted) return;
      resize();

      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      const elapsed = prefersReducedMotion ? 0 : (now - startNow) / 1000;

      if (!prefersReducedMotion) {
        const targetVel = speed * (hoverRef.current ? 1.85 : 1) + burstRef.current * 0.16;
        currentVel += (targetVel - currentVel) * 0.07;
        scrollPhase = (scrollPhase + currentVel * dt) % 1;
        burstRef.current *= 0.92;
        if (burstRef.current < 0.002) burstRef.current = 0;
      }

      currentYaw += (pointerTargetRef.current.yaw - currentYaw) * 0.065;
      currentPitch += (pointerTargetRef.current.pitch - currentPitch) * 0.065;
      currentRoll += (pointerTargetRef.current.roll - currentRoll) * 0.065;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(program);

      if (aPosition >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
      }
      if (aNormal >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
        gl.enableVertexAttribArray(aNormal);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
      }
      if (aUv >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      }

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTexture, 0);

      gl.uniform1f(uAspect, cssWidth / Math.max(cssHeight, 1));
      gl.uniform1f(uPitch, currentPitch);
      gl.uniform1f(uYaw, currentYaw);
      gl.uniform1f(uRoll, currentRoll);
      gl.uniform1f(uScrollPhase, scrollPhase);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uBurst, burstRef.current);
      gl.uniform1f(uIsLight, isLight ? 1.0 : 0.0);
      gl.uniform3f(uColor, cr, cg, cb);
      gl.uniform3f(uAccent, ar, ag, ab);
      gl.uniform3f(uCoreColor, kr, kg, kb);

      // Passo 0: arco traseiro em bokeh óptico; Passo 1: arco frontal nítido
      gl.uniform1f(uPass, 0.0);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);

      gl.uniform1f(uPass, 1.0);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (posBuf) gl.deleteBuffer(posBuf);
      if (nrmBuf) gl.deleteBuffer(nrmBuf);
      if (uvBuf) gl.deleteBuffer(uvBuf);
      if (idxBuf) gl.deleteBuffer(idxBuf);
      if (texture) gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
    };
  }, [cleanText, primaryHex, secondaryHex, coreHex, isLight, speed]);

  return (
    <div
      className={`neon-loop-root ${className}`}
      onMouseEnter={() => {
        hoverRef.current = true;
        burstRef.current = Math.max(burstRef.current, 0.45);
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
      onClick={handleClickBurst}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        ...style,
      }}
    >
      <div aria-hidden="true" className="neon-loop-backdrop" />

      <h1 className="sr-only">{cleanText}</h1>

      {webglReady ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      ) : (
        <span className="neon-wordmark neon-wordmark-no-gl">{cleanText}</span>
      )}
    </div>
  );
};

export default NeonLoop;
