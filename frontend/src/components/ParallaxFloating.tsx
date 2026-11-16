import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';

interface RegisteredFloatingItem {
  element: HTMLDivElement;
  depth: number;
  currentX: number;
  currentY: number;
}

interface FloatingContextValue {
  registerElement: (id: string, element: HTMLDivElement, depth: number) => void;
  unregisterElement: (id: string) => void;
}

const FloatingContext = createContext<FloatingContextValue | null>(null);

export interface FloatingProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Fator multiplicador de deslocamento em relação ao ponteiro (valores negativos criam efeito inverso de profundidade). */
  sensitivity?: number;
  /** Fator de suavização (lerp) por frame entre 0.01 e 1. */
  easingFactor?: number;
}

/**
 * Container pai para camadas com efeito parallax flutuante sensível ao cursor e toque.
 */
export const Floating: React.FC<FloatingProps> = ({
  children,
  className = '',
  style,
  sensitivity = -1,
  easingFactor = 0.06,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Map<string, RegisteredFloatingItem>>(new Map());
  const normalizedPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  const registerElement = useCallback((id: string, element: HTMLDivElement, depth: number) => {
    const existing = elementsRef.current.get(id);
    elementsRef.current.set(id, {
      element,
      depth,
      currentX: existing?.currentX ?? 0,
      currentY: existing?.currentY ?? 0,
    });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    elementsRef.current.delete(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    const updatePointerFromClient = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const relX = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      normalizedPointerRef.current = {
        x: clamp(relX, -1, 1),
        y: clamp(relY, -1, 1),
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      updatePointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handlePointerLeave = () => {
      normalizedPointerRef.current = { x: 0, y: 0 };
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handlePointerLeave, { passive: true });

    const baseDisplacementPx = 22;

    const tick = () => {
      if (!prefersReducedMotion) {
        const ptr = normalizedPointerRef.current;
        const factor = clamp(easingFactor, 0.01, 1);

        elementsRef.current.forEach((item) => {
          const targetX = ptr.x * baseDisplacementPx * sensitivity * item.depth;
          const targetY = ptr.y * baseDisplacementPx * sensitivity * item.depth;

          const dx = targetX - item.currentX;
          const dy = targetY - item.currentY;

          if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
            item.currentX += dx * factor;
            item.currentY += dy * factor;
            item.element.style.transform = `translate3d(${item.currentX.toFixed(2)}px, ${item.currentY.toFixed(2)}px, 0)`;
          }
        });
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handlePointerLeave);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [sensitivity, easingFactor]);

  const contextValue = useMemo<FloatingContextValue>(
    () => ({ registerElement, unregisterElement }),
    [registerElement, unregisterElement]
  );

  return (
    <FloatingContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={className}
        style={{ position: 'relative', ...style }}
      >
        {children}
      </div>
    </FloatingContext.Provider>
  );
};

export interface FloatingElementProps {
  children: React.ReactNode;
  /** Multiplicador de profundidade e velocidade do parallax. */
  depth?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Elemento filho dentro de `<Floating>` que se desloca de acordo com `depth`.
 */
export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  depth = 1,
  className = '',
  style,
}) => {
  const id = useId();
  const elementRef = useRef<HTMLDivElement>(null);
  const ctx = useContext(FloatingContext);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !ctx) return;

    ctx.registerElement(id, el, depth);
    return () => {
      ctx.unregisterElement(id);
    };
  }, [ctx, depth, id]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{ willChange: 'transform', ...style }}
    >
      {children}
    </div>
  );
};
