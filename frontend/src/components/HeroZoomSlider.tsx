import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { Product } from '../types';

export interface ZoomCardItem {
  id: number;
  number: string;
  name: string;
  rarity: string;
  rarityColor?: string;
  game: string;
  image: string;
  description: string;
  badge?: string;
  productId?: number;
}

interface HeroZoomSliderProps {
  cards: ZoomCardItem[];
}

export const HeroZoomSlider: React.FC<HeroZoomSliderProps> = ({ cards }) => {
  const { setSelectedProductForModal, products } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelAccumulator = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const totalCards = cards.length;

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  const goToIndex = (idx: number) => {
    setActiveIndex(idx);
  };

  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      goToNext();
    }, 2000);

    return () => clearInterval(timer);
  }, [isHovered, goToNext]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      wheelAccumulator.current += e.deltaY;

      const threshold = 35;
      if (wheelAccumulator.current > threshold) {
        goToNext();
        wheelAccumulator.current = 0;
      } else if (wheelAccumulator.current < -threshold) {
        goToPrev();
        wheelAccumulator.current = 0;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [totalCards, goToNext, goToPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.touches[0].clientX;
    const diffY = touchStartY.current - e.touches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        goToNext();
        touchStartX.current = null;
        touchStartY.current = null;
      } else if (diffX < 0) {
        goToPrev();
        touchStartX.current = null;
        touchStartY.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleCardClick = (card: ZoomCardItem) => {
    const matchedProduct =
      products.find((p) => p.id === card.productId || p.nome.toLowerCase().includes(card.name.toLowerCase())) ||
      products.find((p) => p.id === card.id);

    const gameCategory: 'pokemon' | 'magic' | 'yugioh' | 'onepiece' =
      card.game.toLowerCase().includes('pok')
        ? 'pokemon'
        : card.game.toLowerCase().includes('magic')
        ? 'magic'
        : card.game.toLowerCase().includes('yu-gi')
        ? 'yugioh'
        : 'onepiece';

    const estimatedPrice =
      matchedProduct?.preco ||
      (card.name.includes('Lotus')
        ? 125000.0
        : card.name.includes('Luffy')
        ? 8900.0
        : card.name.includes('Shanks')
        ? 7500.0
        : card.name.includes('Moonbreon') || card.name.includes('Umbreon')
        ? 4800.0
        : card.name.includes('Dragão Branco')
        ? 4200.0
        : card.name.includes('Mago Negro')
        ? 2400.0
        : card.name.includes('The One Ring')
        ? 15000.0
        : 1850.0);

    const fullProduct: Product = {
      id: card.productId || card.id,
      nome: card.name,
      subtitulo: `${card.game} • ${card.badge || 'Edição de Colecionador'}`,
      preco: estimatedPrice,
      estoque: matchedProduct?.estoque || 2,
      jogo: gameCategory,
      jogoNome: card.game,
      categoria: 'Carta Avulsa',
      descricao: `${card.description} Exemplar autêntico em estado impecável de conservação (Near Mint), perfeitamente preservado com sleeve e toploader. Ideal para colecionadores exigentes e jogadores competitivos.`,
      imagemUrl: card.image,
      raridade: card.rarity,
      isNovo: true,
      isDestaque: true,
      idioma: card.game.toLowerCase().includes('yu-gi') ? 'Português' : 'Inglês',
      ano: 2024,
    };

    setSelectedProductForModal(fullProduct);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        height: '540px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        perspective: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Slider */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '440px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {cards.map((card, idx) => {
          let offset = idx - activeIndex;
          if (offset > totalCards / 2) {
            offset -= totalCards;
          } else if (offset < -totalCards / 2) {
            offset += totalCards;
          }
          const isCurrent = offset === 0;

          let translateX = 0;
          let translateY = 0;
          let scale = 1;
          let rotateZ = 0;
          let opacity = 1;
          let filter = 'none';
          let zIndex = 10;
          let pointerEvents: 'auto' | 'none' = 'none';

          if (isCurrent) {
            translateX = 0;
            translateY = isHovered ? -10 : 0;
            scale = isHovered ? 1.05 : 1;
            rotateZ = 0;
            opacity = 1;
            filter = 'drop-shadow(0 25px 45px rgba(0,0,0,0.65))';
            zIndex = 25;
            pointerEvents = 'auto';
          } else if (offset < 0) {
            const absOffset = Math.abs(offset);
            translateX = -95 * absOffset;
            translateY = 32 * absOffset;
            scale = Math.max(0.72, 1 - absOffset * 0.12);
            rotateZ = -14 * Math.min(1.5, absOffset);
            opacity = Math.max(0, 0.85 - absOffset * 0.35);
            filter = `blur(${Math.min(4, absOffset * 2)}px)`;
            zIndex = 20 - absOffset;
            pointerEvents = absOffset === 1 ? 'auto' : 'none';
          } else {
            translateX = 95 * offset;
            translateY = 26 * offset;
            scale = Math.max(0.72, 1 - offset * 0.12);
            rotateZ = 13 * Math.min(1.5, offset);
            opacity = Math.max(0, 0.85 - offset * 0.35);
            filter = `blur(${Math.min(4, offset * 2)}px)`;
            zIndex = 20 - offset;
            pointerEvents = offset === 1 ? 'auto' : 'none';
          }

          return (
            <div
              key={card.id}
              onClick={() => {
                if (isCurrent) {
                  handleCardClick(card);
                } else {
                  goToIndex(idx);
                }
              }}
              className="tcg-card shimmer-effect"
              style={{
                position: 'absolute',
                width: '280px',
                height: '392px',
                transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotate(${rotateZ}deg)`,
                transformOrigin: 'center center',
                transition:
                  'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease, filter 0.45s ease, box-shadow 0.3s ease',
                opacity,
                filter,
                zIndex,
                pointerEvents,
                cursor: 'pointer',
                borderRadius: '16px',
                overflow: 'hidden',
                padding: 0,
                backgroundColor: 'var(--card-bg)',
                border: isCurrent
                  ? '2.5px solid var(--color-primary)'
                  : '1px solid var(--card-border)',
                boxShadow: isCurrent
                  ? '0 25px 50px var(--shadow-color), 0 0 35px var(--glow-color)'
                  : '0 12px 30px var(--shadow-color)',
              }}
              title={`${card.name} - Clique para ver detalhes`}
            >
              <img
                src={card.image}
                alt={card.name}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  borderRadius: '15px',
                  transition: 'transform 0.4s ease',
                  transform: isCurrent && isHovered ? 'scale(1.03)' : 'scale(1)',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '15px',
                  background:
                    isCurrent && isHovered
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.05) 40%, transparent 65%)'
                      : 'transparent',
                  pointerEvents: 'none',
                  transition: 'background 0.3s ease',
                }}
              />

              {isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--color-surface)',
                    backdropFilter: 'blur(12px)',
                    color: 'var(--color-on-surface)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--card-border)',
                    boxShadow: '0 6px 18px var(--shadow-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Eye size={13} color="var(--color-primary)" />
                  <span>Ver detalhes</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controles */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '360px',
          marginTop: '12px',
          padding: '0 8px',
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Carta anterior"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--nav-border)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: 1,
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToIndex(i)}
              aria-label={`Ir para carta ${i + 1}`}
              style={{
                width: i === activeIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor:
                  i === activeIndex ? 'var(--color-primary)' : 'var(--color-outline)',
                opacity: i === activeIndex ? 1 : 0.35,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goToNext}
          aria-label="Próxima carta"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--nav-border)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: 1,
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-on-surface-variant)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: 0.8,
        }}
      >
        <span>
          {activeIndex + 1} de {totalCards} cartas
        </span>
      </div>
    </div>
  );
};
