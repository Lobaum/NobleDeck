import React, { useEffect, useRef, useState } from 'react';

interface FooterHoloHorizonProps {
  isLight: boolean;
}

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uMouseActive;
  uniform float uTime;
  uniform float uIsLight;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // Projeção de horizonte arquitetônico sem divisão por zero
    float horizon = clamp(1.0 - uv.y * 0.84, 0.16, 1.0);
    float perspectiveFactor = 1.0 / horizon;

    // Interação magnética sutil acompanhando o ponteiro
    vec2 aspectDelta = (uv - uMouse) * vec2(aspect, 1.0);
    float mDist = length(aspectDelta);
    float pointerGlow = exp(-mDist * 2.9) * (0.2 + 0.65 * uMouseActive);
    float ripple = sin(mDist * 13.0 - uTime * 2.0) * exp(-mDist * 3.8) * 0.045 * uMouseActive;

    float px = (uv.x - 0.5) * aspect * perspectiveFactor;
    float pz = 1.1 * perspectiveFactor + uTime * 0.22;

    // Curva topográfica sutil simulando lâmina holográfica sobre mesa de cartas
    float bend = sin(px * 0.85 + uTime * 0.35) * 0.08 + ripple;
    vec2 gridCoord = vec2(px * 1.45 + bend, pz * 1.15 - pointerGlow * 0.25);
    vec2 cell = abs(fract(gridCoord - 0.5) - 0.5);

    float lineWidth = 0.022 + 0.048 * (1.0 - horizon);
    float gx = smoothstep(lineWidth, 0.0, cell.x);
    float gz = smoothstep(lineWidth, 0.0, cell.y);
    float horizonFade = smoothstep(0.92, 0.24, uv.y);
    float gridMask = max(gx, gz) * horizonFade;

    // Faixa diagonal de reflexo foil passando pelos cantos
    float diagPhase = (uv.x * 2.4 - uv.y * 1.55) * 3.14159 + sin(uv.x * 3.5 + uTime * 0.45) * 0.9 - uTime * 0.36;
    float foilWave = pow(0.5 + 0.5 * cos(diagPhase), 6.0);
    float edgeGlow = smoothstep(0.75, 0.0, uv.y) * 0.16;

    vec3 darkBase = vec3(0.039, 0.039, 0.043);
    vec3 darkHorizon = vec3(0.075, 0.063, 0.032);
    vec3 goldPrimary = vec3(1.0, 0.769, 0.0);
    vec3 goldAmber = vec3(1.0, 0.616, 0.0);

    vec3 lightBase = vec3(0.972, 0.968, 0.955);
    vec3 lightHorizon = vec3(0.955, 0.925, 0.845);
    vec3 lightGoldLine = vec3(0.76, 0.47, 0.0);
    vec3 lightHighlight = vec3(1.0, 0.804, 0.102);

    if (uIsLight > 0.5) {
      vec3 bg = mix(lightBase, lightHorizon, edgeGlow + foilWave * 0.28 + pointerGlow * 0.35);
      vec3 foilTint = mix(lightHighlight, lightGoldLine, 0.45);
      vec3 color = mix(bg, lightGoldLine, gridMask * (0.14 + pointerGlow * 0.22));
      color = mix(color, foilTint, foilWave * horizonFade * 0.12);
      gl_FragColor = vec4(color, 1.0);
      return;
    }

    vec3 bg = mix(darkBase, darkHorizon, edgeGlow + foilWave * 0.36 + pointerGlow * 0.42);
    vec3 lineTone = mix(goldAmber, goldPrimary, 0.55 + 0.45 * foilWave);
    vec3 color = bg + lineTone * gridMask * (0.24 + pointerGlow * 0.48 + foilWave * 0.22);
    color += goldPrimary * foilWave * horizonFade * (0.045 + pointerGlow * 0.08);
    gl_FragColor = vec4(color, 1.0);
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

/**
 * Campo WebGL de horizonte holográfico interativo para o fundo do rodapé.
 * Pausa automaticamente fora da viewport via IntersectionObserver para custo zero de GPU em repouso.
 */
export const FooterHoloHorizon: React.FC<FooterHoloHorizonProps> = ({ isLight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerTargetRef = useRef({ x: 0.5, y: 0.45, active: 0 });
  const isLightRef = useRef(isLight);
  const redrawRef = useRef<(() => void) | null>(null);
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    isLightRef.current = isLight;
    redrawRef.current?.();
  }, [isLight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const footerHost = canvas.closest('footer');

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      powerPreference: 'low-power',
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

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uMouseActive = gl.getUniformLocation(program, 'uMouseActive');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uIsLight = gl.getUniformLocation(program, 'uIsLight');

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice =
      typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);

    const handlePointerMove = (e: PointerEvent) => {
      if (prefersReducedMotion) return;
      const rect = (footerHost || canvas).getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = 1 - (e.clientY - rect.top) / rect.height;
      pointerTargetRef.current.x = Math.min(Math.max(nx, 0), 1);
      pointerTargetRef.current.y = Math.min(Math.max(ny, 0), 1);
      pointerTargetRef.current.active = 1;
    };

    const handlePointerLeave = () => {
      pointerTargetRef.current.active = 0;
    };

    footerHost?.addEventListener('pointermove', handlePointerMove, { passive: true });
    footerHost?.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
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

    let mounted = true;
    let isVisible = true;
    let rafId = 0;
    let currentMouseX = 0.5;
    let currentMouseY = 0.45;
    let currentMouseActive = 0;
    const startNow = performance.now();

    const drawFrame = (now: number) => {
      if (!mounted) return;
      resize();

      const elapsed = prefersReducedMotion ? 0 : (now - startNow) / 1000;
      currentMouseX += (pointerTargetRef.current.x - currentMouseX) * 0.08;
      currentMouseY += (pointerTargetRef.current.y - currentMouseY) * 0.08;
      currentMouseActive += (pointerTargetRef.current.active - currentMouseActive) * 0.06;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);

      if (aPosition >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      }

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uMouse, currentMouseX, currentMouseY);
      gl.uniform1f(uMouseActive, currentMouseActive);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uIsLight, isLightRef.current ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!prefersReducedMotion && isVisible) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        rafId = 0;
      }
    };

    redrawRef.current = () => {
      if (prefersReducedMotion) {
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

    if (intersectionObserver && (footerHost || canvas)) {
      intersectionObserver.observe(footerHost || canvas);
    }

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      mounted = false;
      redrawRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      footerHost?.removeEventListener('pointermove', handlePointerMove);
      footerHost?.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (quadBuf) gl.deleteBuffer(quadBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
    };
  }, []);

  return (
    <div aria-hidden="true" className="footer-webgl-backdrop">
      {webglReady ? (
        <canvas ref={canvasRef} className="footer-webgl-canvas" />
      ) : (
        <div className="footer-webgl-fallback" />
      )}
    </div>
  );
};

export default FooterHoloHorizon;
