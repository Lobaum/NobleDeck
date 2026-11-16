import React, { useEffect, useRef, useState } from 'react';
import blackLotusImg from '../assets/cards/black-lotus.jpg';
import charizardVmaxImg from '../assets/cards/charizard-vmax.png';
import luffyCardImg from '../assets/cards/luffy-op05-119.png';

interface AboutArenaWebGLProps {
  isLight: boolean;
}

const FEATURED_SLABS = [
  { label: 'Charizard VMAX', image: charizardVmaxImg },
  { label: 'Black Lotus', image: blackLotusImg },
  { label: 'Monkey D. Luffy OP05', image: luffyCardImg },
] as const;

const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec2 aUv;

  uniform float uAspect;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uRoll;
  uniform vec3 uOffset;
  uniform float uScale;
  uniform float uCurveAmp;
  uniform float uTime;

  varying vec2 vUv;
  varying float vTiltHighlight;

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
    vec3 p = aPosition * uScale;
    // Leve curvatura espacial de lâmina colecionável
    p.z += sin((aUv.x - 0.5) * 3.14159 + uTime * 1.1) * uCurveAmp;

    mat3 rot = rotZ(uRoll) * rotX(uPitch) * rotY(uYaw);
    vec3 pos = rot * p + uOffset;

    float camZ = 4.4;
    float viewZ = camZ - pos.z;
    float fX = min(1.85, uAspect * 1.45);
    float fY = fX * uAspect;

    gl_Position = vec4(pos.x * fX, pos.y * fY, -pos.z / 8.0, viewZ);
    vUv = aUv;
    vTiltHighlight = clamp(0.5 + (rot * vec3(0.0, 0.0, 1.0)).x * 0.65 - (rot * vec3(0.0, 0.0, 1.0)).y * 0.45, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uIsLight;
  uniform float uIsFocused;
  uniform float uTiltDim;

  varying vec2 vUv;
  varying float vTiltHighlight;

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float dist = sdRoundedBox(centered, vec2(0.492, 0.492), 0.055);
    if (dist > 0.0) discard;

    float edgeAlpha = smoothstep(0.002, -0.014, dist);
    float borderMask = smoothstep(-0.032, -0.008, dist);

    vec4 cardSample = texture2D(uTexture, vUv);

    // Varredura diagonal prismática sutil simulando laminação foil
    float sheenCoord = (vUv.x * 0.72 + vUv.y * 0.55) - mod(uTime * 0.28 + vTiltHighlight * 0.4, 2.2) + 0.5;
    float sheen = exp(-sheenCoord * sheenCoord * 42.0) * (0.16 + 0.24 * uIsFocused);

    vec3 foilGold = vec3(1.0, 0.78, 0.08);
    vec3 foilRim = mix(vec3(0.85, 0.52, 0.0), vec3(1.0, 0.86, 0.25), vTiltHighlight);

    vec3 faceColor = cardSample.rgb * mix(0.76, 1.0, uIsFocused) * uTiltDim;
    faceColor += foilGold * sheen;

    vec3 borderColor = mix(foilRim, foilGold, uIsFocused);
    if (uIsLight > 0.5 && uIsFocused < 0.5) {
      borderColor = mix(vec3(0.45, 0.28, 0.04), foilRim, 0.5);
    }

    vec3 rgb = mix(faceColor, borderColor, borderMask * 0.85);
    gl_FragColor = vec4(rgb * edgeAlpha, edgeAlpha);
  }
`;

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

function buildSubdividedCardMesh(cols = 10, rows = 14) {
  const halfW = 0.58;
  const halfH = 0.81;
  const vertsPerRow = cols + 1;
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((cols + 1) * (rows + 1) * 2);
  const indices = new Uint16Array(cols * rows * 6);

  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const idx = r * vertsPerRow + c;
      positions[idx * 3] = (u - 0.5) * 2 * halfW;
      positions[idx * 3 + 1] = (v - 0.5) * 2 * halfH;
      positions[idx * 3 + 2] = 0;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  let ptr = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * vertsPerRow + c;
      const b = a + 1;
      const d = a + vertsPerRow;
      const e = d + 1;
      indices[ptr++] = a;
      indices[ptr++] = b;
      indices[ptr++] = e;
      indices[ptr++] = a;
      indices[ptr++] = e;
      indices[ptr++] = d;
    }
  }

  return { positions, uvs, indices };
}

/**
 * Palco 3D em WebGL exibindo três cartas colecionáveis em profundidade espacial com foco interativo.
 */
export const AboutArenaWebGL: React.FC<AboutArenaWebGLProps> = ({ isLight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const activeIdxRef = useRef(0);
  const isLightRef = useRef(isLight);
  const redrawRef = useRef<(() => void) | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    isLightRef.current = isLight;
    redrawRef.current?.();
  }, [isLight]);

  useEffect(() => {
    activeIdxRef.current = activeIndex;
    redrawRef.current?.();
  }, [activeIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

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

    const mesh = buildSubdividedCardMesh();
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    let mounted = true;
    const textures = FEATURED_SLABS.map((slab) => {
      const tex = gl.createTexture();
      if (tex) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([28, 24, 16, 255])
        );

        const img = new Image();
        img.onload = () => {
          if (!mounted || !tex) return;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          redrawRef.current?.();
        };
        img.src = slab.image;
      }
      return tex;
    });

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aUv = gl.getAttribLocation(program, 'aUv');

    const uAspect = gl.getUniformLocation(program, 'uAspect');
    const uYaw = gl.getUniformLocation(program, 'uYaw');
    const uPitch = gl.getUniformLocation(program, 'uPitch');
    const uRoll = gl.getUniformLocation(program, 'uRoll');
    const uOffset = gl.getUniformLocation(program, 'uOffset');
    const uScale = gl.getUniformLocation(program, 'uScale');
    const uCurveAmp = gl.getUniformLocation(program, 'uCurveAmp');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uTexture = gl.getUniformLocation(program, 'uTexture');
    const uIsLight = gl.getUniformLocation(program, 'uIsLight');
    const uIsFocused = gl.getUniformLocation(program, 'uIsFocused');
    const uTiltDim = gl.getUniformLocation(program, 'uTiltDim');

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice =
      typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);

    const handlePointerMove = (e: PointerEvent) => {
      if (prefersReducedMotion) return;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerTargetRef.current.x = Math.min(Math.max(nx, -1), 1);
      pointerTargetRef.current.y = Math.min(Math.max(ny, -1), 1);
    };

    const handlePointerLeave = () => {
      pointerTargetRef.current.x = 0;
      pointerTargetRef.current.y = 0;
    };

    host.addEventListener('pointermove', handlePointerMove, { passive: true });
    host.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    let cssW = canvas.clientWidth || 540;
    let cssH = canvas.clientHeight || 420;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      cssW = rect.width;
      cssH = rect.height;
      const maxDpr = isTouchDevice ? 1 : 1.75;
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

    let isVisible = true;
    let rafId = 0;
    let smoothPx = 0;
    let smoothPy = 0;
    let orbitOffset = 0;
    const startNow = performance.now();

    const drawFrame = (now: number) => {
      if (!mounted) return;
      resize();

      const elapsed = prefersReducedMotion ? 0 : (now - startNow) / 1000;
      smoothPx += (pointerTargetRef.current.x - smoothPx) * 0.08;
      smoothPy += (pointerTargetRef.current.y - smoothPy) * 0.08;

      const targetOrbit = activeIdxRef.current * ((Math.PI * 2) / 3);
      orbitOffset += (targetOrbit - orbitOffset) * (prefersReducedMotion ? 1 : 0.085);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(program);

      if (aPosition >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
      }
      if (aUv >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

      const cardsState = FEATURED_SLABS.map((_, i) => {
        const angle = i * ((Math.PI * 2) / 3) - orbitOffset;
        const x = Math.sin(angle) * 0.72 + smoothPx * 0.08;
        const z = Math.cos(angle) * 0.42;
        const y =
          (prefersReducedMotion ? 0 : Math.sin(elapsed * 1.45 + i * 2.1) * 0.045) -
          smoothPy * 0.05;
        const isFront = i === activeIdxRef.current;
        return {
          index: i,
          x,
          y,
          z,
          scale: 0.76 + (z + 0.42) * 0.24,
          yaw: -Math.sin(angle) * 0.34 + smoothPx * 0.24,
          pitch: -smoothPy * 0.18 + (isFront ? 0.03 : -0.04),
          roll: -Math.sin(angle) * 0.11,
          isFront,
        };
      }).sort((a, b) => a.z - b.z);

      gl.uniform1f(uAspect, cssW / Math.max(cssH, 1));
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uIsLight, isLightRef.current ? 1.0 : 0.0);

      for (const card of cardsState) {
        const tex = textures[card.index];
        if (!tex) continue;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(uTexture, 0);

        gl.uniform1f(uYaw, card.yaw);
        gl.uniform1f(uPitch, card.pitch);
        gl.uniform1f(uRoll, card.roll);
        gl.uniform3f(uOffset, card.x, card.y, card.z);
        gl.uniform1f(uScale, card.scale);
        gl.uniform1f(uCurveAmp, card.isFront ? 0.018 : 0.008);
        gl.uniform1f(uIsFocused, card.isFront ? 1.0 : 0.0);
        gl.uniform1f(uTiltDim, card.isFront ? 1.0 : 0.86);

        gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      }

      if (!prefersReducedMotion && isVisible) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        rafId = 0;
      }
    };

    redrawRef.current = () => {
      if (prefersReducedMotion && rafId === 0) {
        requestAnimationFrame(drawFrame);
      }
    };

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              isVisible = entry.isIntersecting;
              if (isVisible && !prefersReducedMotion && rafId === 0) {
                rafId = requestAnimationFrame(drawFrame);
              } else if (!isVisible && rafId !== 0) {
                cancelAnimationFrame(rafId);
                rafId = 0;
              }
            },
            { threshold: 0.01 }
          )
        : null;

    intersectionObserver?.observe(host);
    rafId = requestAnimationFrame(drawFrame);

    return () => {
      mounted = false;
      redrawRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (posBuf) gl.deleteBuffer(posBuf);
      if (uvBuf) gl.deleteBuffer(uvBuf);
      if (idxBuf) gl.deleteBuffer(idxBuf);
      for (const tex of textures) {
        if (tex) gl.deleteTexture(tex);
      }
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
    };
  }, []);

  return (
    <div ref={hostRef} className="about-webgl-stage">
      <div className="about-webgl-canvas-wrap" onClick={() => setActiveIndex((i) => (i + 1) % FEATURED_SLABS.length)}>
        {webglReady ? (
          <canvas
            ref={canvasRef}
            aria-label="Exposição 3D interativa de cartas raras da Noble Deck"
            className="about-webgl-canvas"
          />
        ) : (
          <div className="about-webgl-fallback">
            {FEATURED_SLABS.map((slab, idx) => (
              <img
                key={slab.label}
                src={slab.image}
                alt={slab.label}
                className={idx === activeIndex ? 'is-front' : ''}
              />
            ))}
          </div>
        )}
      </div>

      <div className="about-webgl-controls" role="tablist" aria-label="Alternar carta em foco no palco 3D">
        {FEATURED_SLABS.map((slab, idx) => (
          <button
            key={slab.label}
            type="button"
            role="tab"
            aria-selected={activeIndex === idx}
            onClick={() => setActiveIndex(idx)}
            className={`about-slab-tab ${activeIndex === idx ? 'is-active' : ''}`}
          >
            {slab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AboutArenaWebGL;
