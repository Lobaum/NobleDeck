import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Floating, FloatingElement } from '../components/ParallaxFloating';
import { NeonLoop } from '../components/NeonLoop';
import {
  ArrowRight,
  ArrowUpRight,
  Crown,
  Layers,
  Plus,
} from 'lucide-react';
import type { ExternalCard, GameId, Product } from '../types';
import { searchLiveCards } from '../services/tcgApi';
import { externalCardToProduct, formatBRL } from '../services/api';
import nobleLogo from '../assets/noble-logo.png';
import retroCardPlayerImg from '../assets/retro-card-player.jpg';

import charizardVmaxImg from '../assets/cards/charizard-vmax.png';
import blackLotusImg from '../assets/cards/black-lotus.jpg';
import blueEyesImg from '../assets/cards/blue-eyes.jpg';
import luffyCardImg from '../assets/cards/luffy-op05-119.png';
import moonbreonImg from '../assets/cards/moonbreon.png';
import darkMagicianImg from '../assets/cards/dark-magician.jpg';
import oneRingImg from '../assets/cards/the-one-ring.jpg';
import shanksCardImg from '../assets/cards/shanks-op01-120.png';

import pokemonLogo from '../assets/games/pokemon.png';
import magicLogo from '../assets/games/magic.png';
import yugiohLogo from '../assets/games/yugioh.png';
import onepieceLogo from '../assets/games/onepiece.png';

interface HeroFloatingCardItem {
  id: string;
  name: string;
  game: string;
  gameId: GameId;
  image: string;
  price?: number;
  product?: Product;
  externalCard?: ExternalCard;
}

const HERO_FLOAT_SLOTS = [
  { slotClass: 'hero-float-slot-0', depth: 1.1, tiltDeg: -7, delaySec: 0.05 },
  { slotClass: 'hero-float-slot-1', depth: 0.65, tiltDeg: 6, delaySec: 0.14 },
  { slotClass: 'hero-float-slot-2', depth: 0.7, tiltDeg: -6, delaySec: 0.2 },
  { slotClass: 'hero-float-slot-3', depth: 1.45, tiltDeg: 8, delaySec: 0.1 },
  { slotClass: 'hero-float-slot-4', depth: 2.35, tiltDeg: -4, delaySec: 0.24 },
  { slotClass: 'hero-float-slot-5', depth: 2.15, tiltDeg: 5, delaySec: 0.28 },
  { slotClass: 'hero-float-slot-6', depth: 1.65, tiltDeg: 7, delaySec: 0.34 },
  { slotClass: 'hero-float-slot-7', depth: 1.85, tiltDeg: -6, delaySec: 0.38 },
] as const;

const CURATED_HERO_FALLBACKS: HeroFloatingCardItem[] = [
  { id: 'fallback-charizard', name: 'Charizard VMAX', game: 'Pokémon TCG', gameId: 'pokemon', image: charizardVmaxImg },
  { id: 'fallback-lotus', name: 'Black Lotus', game: 'Magic: The Gathering', gameId: 'magic', image: blackLotusImg },
  { id: 'fallback-dark-magician', name: 'Dark Magician', game: 'Yu-Gi-Oh!', gameId: 'yugioh', image: darkMagicianImg },
  { id: 'fallback-blue-eyes', name: 'Blue-Eyes White Dragon', game: 'Yu-Gi-Oh!', gameId: 'yugioh', image: blueEyesImg },
  { id: 'fallback-luffy', name: 'Monkey D. Luffy OP05', game: 'One Piece Card Game', gameId: 'onepiece', image: luffyCardImg },
  { id: 'fallback-moonbreon', name: 'Umbreon VMAX Alt Art', game: 'Pokémon TCG', gameId: 'pokemon', image: moonbreonImg },
  { id: 'fallback-one-ring', name: 'The One Ring', game: 'Magic: The Gathering', gameId: 'magic', image: oneRingImg },
  { id: 'fallback-shanks', name: 'Shanks OP01-120', game: 'One Piece Card Game', gameId: 'onepiece', image: shanksCardImg },
];

export const HomePage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const {
    setCurrentTab,
    setSelectedGameFilter,
    products,
    setSelectedProductForModal,
    addToCart,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useApp();

  const [liveApiCards, setLiveApiCards] = useState<ExternalCard[]>([]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.ativo !== false),
    [products]
  );

  // Apenas busca acervo externo como fallback se a loja não tiver nenhum produto cadastrado
  useEffect(() => {
    if (activeProducts.length > 0) return;

    let active = true;
    searchLiveCards('all', '', 1)
      .then(({ cards }) => {
        if (active && cards.length > 0) {
          setLiveApiCards(cards);
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [activeProducts.length]);

  const handleGameSelect = (game: GameId | 'all') => {
    setSelectedGameFilter(game);
    setCurrentTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heroFloatingCards: HeroFloatingCardItem[] = useMemo(() => {
    const items: HeroFloatingCardItem[] = [];
    const seenImages = new Set<string>();

    const validStoreCards = activeProducts.filter((p) => Boolean(p.imagemUrl) && p.preco > 0);
    const storePool = validStoreCards.length > 0
      ? validStoreCards
      : activeProducts.filter((p) => Boolean(p.imagemUrl));

    const sortedStore = [...storePool].sort((a, b) => {
      if (a.isDestaque && !b.isDestaque) return -1;
      if (!a.isDestaque && b.isDestaque) return 1;
      return (b.estoque > 0 ? 1 : 0) - (a.estoque > 0 ? 1 : 0);
    });

    for (const p of sortedStore) {
      if (items.length >= HERO_FLOAT_SLOTS.length) break;
      if (!p.imagemUrl || seenImages.has(p.imagemUrl)) continue;
      seenImages.add(p.imagemUrl);
      items.push({
        id: `store-${p.id}`,
        name: p.nome,
        game: p.jogoNome,
        gameId: p.jogo,
        image: p.imagemUrl,
        price: p.preco,
        product: p,
      });
    }

    if (items.length < HERO_FLOAT_SLOTS.length && liveApiCards.length > 0) {
      const apiPool = liveApiCards.filter((c) => Boolean(c.imagemUrl));
      for (const c of apiPool) {
        if (items.length >= HERO_FLOAT_SLOTS.length) break;
        if (seenImages.has(c.imagemUrl)) continue;
        seenImages.add(c.imagemUrl);
        items.push({
          id: `ext-${c.uid}`,
          name: c.nome,
          game: c.jogoNome,
          gameId: c.jogo,
          image: c.imagemUrl,
          price: c.precoMercadoBrl,
          externalCard: c,
        });
      }
    }

    for (const fallback of CURATED_HERO_FALLBACKS) {
      if (items.length >= HERO_FLOAT_SLOTS.length) break;
      if (seenImages.has(fallback.image)) continue;
      seenImages.add(fallback.image);
      items.push(fallback);
    }

    return items;
  }, [activeProducts, liveApiCards]);

  const handleHeroCardClick = (card: HeroFloatingCardItem) => {
    if (card.product) {
      setSelectedProductForModal(card.product);
      return;
    }
    if (card.externalCard) {
      setSelectedProductForModal(externalCardToProduct(card.externalCard));
      return;
    }
    handleGameSelect(card.gameId);
  };

  const featuredProducts: Product[] = useMemo(() => {
    const pricedProducts = activeProducts.filter((p) => p.preco > 0);
    const storeFeatured = pricedProducts.filter((p) => p.isDestaque);
    if (storeFeatured.length > 0) return storeFeatured.slice(0, 4);
    if (pricedProducts.length > 0) return pricedProducts.slice(0, 4);
    if (activeProducts.length > 0) return activeProducts.slice(0, 4);
    const validApi = liveApiCards.filter((c) => c.precoMercadoBrl > 0);
    const apiPool = validApi.length > 0 ? validApi : liveApiCards;
    return apiPool.slice(0, 4).map((c) => externalCardToProduct(c));
  }, [activeProducts, liveApiCards]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Hero Parallax Floating */}
      <section aria-label="Destaque principal">
        <Floating
          className="hero-parallax-stage"
          sensitivity={-1.15}
          easingFactor={0.055}
        >
          <div className="hero-subtle-grid" />

          {/* Orbes de profundidade ambiente em parallax */}
          <FloatingElement
            depth={0.4}
            style={{
              position: 'absolute',
              top: '12%',
              right: '14%',
              width: '440px',
              height: '440px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 196, 0, 0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <div />
          </FloatingElement>

          <FloatingElement
            depth={0.55}
            style={{
              position: 'absolute',
              bottom: '8%',
              left: '10%',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 157, 0, 0.11) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <div />
          </FloatingElement>

          {/* Camada de cartas flutuantes com profundidades distintas */}
          {HERO_FLOAT_SLOTS.map((slot, index) => {
            const card = heroFloatingCards[index];
            if (!card) return null;

            return (
              <FloatingElement
                key={card.id}
                depth={slot.depth}
                className={`hero-float-slot ${slot.slotClass}`}
              >
                <div
                  className="hero-float-card-anim"
                  style={{ animationDelay: `${slot.delaySec}s` }}
                >
                  <button
                    type="button"
                    className="hero-float-card"
                    onClick={() => handleHeroCardClick(card)}
                    aria-label={`${card.name} - ${card.game}`}
                    style={{ transform: `rotate(${slot.tiltDeg}deg)` }}
                  >
                    <img
                      src={card.image}
                      alt={card.name}
                      loading="eager"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = nobleLogo;
                      }}
                    />
                    <div className="hero-float-card-caption">
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {card.name}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-primary)',
                          marginTop: '2px',
                        }}
                      >
                        {card.price && card.price > 0 ? `R$ ${formatBRL(card.price)}` : card.game}
                      </div>
                    </div>
                  </button>
                </div>
              </FloatingElement>
            );
          })}

          {/* Conteúdo central focado com anel tipográfico 3D giratório */}
          <div className="hero-center-content">
            <NeonLoop
              text="NobleDeck"
              isLight={isLight}
              speed={0.055}
              className="hero-neon-loop"
            />
          </div>

          {/* Vitrine compacta para telas mobile */}
          <div className="hero-mobile-cards">
            {heroFloatingCards.slice(0, 4).map((card, idx) => {
              const mobileTilts = [-6, -2, 2, 6];
              return (
                <button
                  key={`mobile-${card.id}`}
                  type="button"
                  className="hero-float-card"
                  onClick={() => handleHeroCardClick(card)}
                  aria-label={`${card.name} — ${card.game}`}
                  style={{
                    flex: '1 1 0',
                    maxWidth: '112px',
                    transform: `rotate(${mobileTilts[idx]}deg)`,
                  }}
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = nobleLogo;
                    }}
                  />
                </button>
              );
            })}
          </div>
        </Floating>
      </section>

      <div className="landing-editorial-root">
        {/* Faixa horizontal full-bleed dos universos */}
        <nav aria-label="Atalhos por universo TCG" className="landing-universe-ticker">
          <div className="landing-ticker-track">
            {[0, 1].map((dupIndex) => (
              <div
                key={`ticker-group-${dupIndex}`}
                className="landing-ticker-group"
                aria-hidden={dupIndex === 1 ? 'true' : undefined}
              >
                {(
                  [
                    { id: 'pokemon', label: 'Pokémon TCG' },
                    { id: 'magic', label: 'Magic: The Gathering' },
                    { id: 'yugioh', label: 'Yu-Gi-Oh!' },
                    { id: 'onepiece', label: 'One Piece Card Game' },
                    { id: 'all', label: 'Acervo Completo' },
                  ] as const
                ).map((entry, idx, list) => (
                  <React.Fragment key={`${dupIndex}-${entry.id}`}>
                    <button
                      type="button"
                      tabIndex={dupIndex === 1 ? -1 : 0}
                      className="landing-ticker-btn"
                      onClick={() => handleGameSelect(entry.id)}
                    >
                      <span>{entry.label}</span>
                      <ArrowUpRight size={14} />
                    </button>
                    {idx < list.length - 1 && (
                      <span className="landing-ticker-sep" aria-hidden="true">
                        /
                      </span>
                    )}
                  </React.Fragment>
                ))}
                <span className="landing-ticker-sep" aria-hidden="true">
                  /
                </span>
              </div>
            ))}
          </div>
        </nav>

        {/* Band 1: Manifesto descentralizado + Ilustração cartoon retrô */}
        <section className="landing-editorial-section" aria-label="Cultura de mesa Noble Deck">
          <div className="landing-band-wide">
            <div className="landing-editorial-split">
              <div className="landing-manifesto-col">
                <h2 className="landing-display-heading">
                  Cartas certas mudam a <span className="landing-highlight-mark">mesa inteira.</span>
                </h2>

                <p className="landing-lead-copy">
                  De singles raras a decks prontos para torneio, reunimos cada edição com avaliação rigorosa, proteção reforçada e busca rápida.
                </p>

                <div className="landing-ledger-pair">
                  <div className="landing-ledger-item">
                    <h3>Singles verificadas</h3>
                    <p>
                      Curadoria direta em estado Near Mint e Slightly Played, com envio protegido em toploader.
                    </p>
                  </div>
                  <div className="landing-ledger-item">
                    <h3>Quatro frentes de duelo</h3>
                    <p>
                      Pokémon, Magic, Yu-Gi-Oh! e One Piece organizados por coleção, raridade e disponibilidade.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="landing-btn-print"
                  onClick={() => handleGameSelect('all')}
                >
                  <span>Explorar catálogo</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>

              <div className="landing-art-col">
                <figure className="landing-art-plate" style={{ margin: 0 }}>
                  <img
                    src={retroCardPlayerImg}
                    alt="Ilustração em cartoon retrô de um jogador lançando cartas sobre a mesa em ação dinâmica"
                  />
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* Band 2: Bento assimétrico para os 4 universos */}
        <section className="landing-editorial-section" aria-label="Universos de Card Games">
          <div className="landing-band-wide">
            <div className="landing-section-head">
              <h2>Escolha o seu campo de jogo</h2>
            </div>

            <div className="landing-bento-grid">
              <button
                type="button"
                onClick={() => handleGameSelect('pokemon')}
                className="landing-bento-tile bento-span-wide bento-surface-alt"
              >
                <div className="bento-copy-zone">
                  <img
                    src={pokemonLogo}
                    alt="Pokémon TCG"
                    className="bento-game-logo"
                  />
                  <h3>Pokémon TCG</h3>
                  <p>
                    Cartas ex, ilustrações alternativas e boosters selados para montar seu baralho competitivo ou ampliar sua pasta.
                  </p>
                </div>
                <span className="bento-tile-action">
                  <span>Filtrar Pokémon</span>
                  <ArrowRight size={14} />
                </span>
                <div className="bento-card-fan" aria-hidden="true">
                  <img src={moonbreonImg} alt="" className="bento-fan-card bento-fan-card-back" />
                  <img src={charizardVmaxImg} alt="" className="bento-fan-card bento-fan-card-front" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGameSelect('onepiece')}
                className="landing-bento-tile bento-span-compact bento-surface-highlight"
              >
                <div className="bento-copy-zone">
                  <img
                    src={onepieceLogo}
                    alt="One Piece Card Game"
                    className="bento-game-logo"
                  />
                  <h3>One Piece</h3>
                  <p>
                    Líderes icônicos, cartas secretas da Grand Line e decks estruturados prontos para o próximo torneio.
                  </p>
                </div>
                <span className="bento-tile-action">
                  <span>Filtrar One Piece</span>
                  <ArrowRight size={14} />
                </span>
                <div className="bento-card-fan" aria-hidden="true">
                  <img src={shanksCardImg} alt="" className="bento-fan-card bento-fan-card-back" />
                  <img src={luffyCardImg} alt="" className="bento-fan-card bento-fan-card-front" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGameSelect('magic')}
                className="landing-bento-tile bento-span-compact bento-surface-striped"
              >
                <div className="bento-copy-zone">
                  <img
                    src={magicLogo}
                    alt="Magic: The Gathering"
                    className="bento-game-logo"
                  />
                  <h3>Magic: The Gathering</h3>
                  <p>
                    Peças clássicas, míticas de Commander e staples de formato para estratégias profundas.
                  </p>
                </div>
                <span className="bento-tile-action">
                  <span>Filtrar Magic</span>
                  <ArrowRight size={14} />
                </span>
                <div className="bento-card-fan" aria-hidden="true">
                  <img src={oneRingImg} alt="" className="bento-fan-card bento-fan-card-back" />
                  <img src={blackLotusImg} alt="" className="bento-fan-card bento-fan-card-front" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGameSelect('yugioh')}
                className="landing-bento-tile bento-span-wide bento-surface-alt"
              >
                <div className="bento-copy-zone">
                  <img
                    src={yugiohLogo}
                    alt="Yu-Gi-Oh!"
                    className="bento-game-logo"
                  />
                  <h3>Yu-Gi-Oh!</h3>
                  <p>
                    Dragões lendários, cartas de extra deck e suporte direto para combos rápidos na hora do duelo.
                  </p>
                </div>
                <span className="bento-tile-action">
                  <span>Filtrar Yu-Gi-Oh!</span>
                  <ArrowRight size={14} />
                </span>
                <div className="bento-card-fan" aria-hidden="true">
                  <img src={darkMagicianImg} alt="" className="bento-fan-card bento-fan-card-back" />
                  <img src={blueEyesImg} alt="" className="bento-fan-card bento-fan-card-front" />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Band 3: Vitrine assimétrica com foco lateral + trilho de itens */}
        <section className="landing-editorial-section" aria-label="Vitrine em destaque">
          <div className="landing-band-wide">
            <div className="landing-vitrine-header">
              <h2>
                {featuredProducts.length > 0 ? 'Produtos em destaque' : 'Curadoria em rotação'}
              </h2>
              <button
                type="button"
                className="landing-inline-link"
                onClick={() => handleGameSelect('all')}
              >
                <span>Explorar catálogo</span>
                <ArrowUpRight size={15} />
              </button>
            </div>

            {(() => {
              const hasLiveInventory = featuredProducts.length > 0;
              const curatedFallback = [
                CURATED_HERO_FALLBACKS[1],
                CURATED_HERO_FALLBACKS[0],
                CURATED_HERO_FALLBACKS[4],
                CURATED_HERO_FALLBACKS[3],
              ];

              const leadStore = hasLiveInventory ? featuredProducts[0] : null;
              const railStore = hasLiveInventory ? featuredProducts.slice(1) : [];

              const leadFallback = !hasLiveInventory ? curatedFallback[0] : null;
              const railFallback = !hasLiveInventory ? curatedFallback.slice(1) : [];

              const leadUnavailable = leadStore
                ? Boolean(leadStore.externalCard) || leadStore.id < 0 || leadStore.preco <= 0 || leadStore.estoque <= 0
                : true;

              return (
                <div className="landing-showcase-grid">
                  {leadStore ? (
                    <article className="landing-spotlight-card">
                      <div className="landing-spotlight-stage">
                        <img
                          src={leadStore.imagemUrl || nobleLogo}
                          alt={leadStore.nome}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = nobleLogo;
                          }}
                        />
                      </div>
                      <div className="landing-spotlight-body">
                        <span className="landing-spotlight-meta">
                          {leadStore.subtitulo || leadStore.jogoNome}
                        </span>
                        <h3>{leadStore.nome}</h3>
                        <p className="landing-spotlight-price">
                          {leadStore.preco > 0 ? `R$ ${formatBRL(leadStore.preco)}` : 'Sob consulta'}
                        </p>
                        <div className="landing-spotlight-actions">
                          <button
                            type="button"
                            className="landing-btn-print"
                            onClick={() => setSelectedProductForModal(leadStore)}
                          >
                            <span>Ver produto</span>
                            <ArrowUpRight size={15} />
                          </button>
                          <button
                            type="button"
                            className="landing-btn-print-secondary"
                            disabled={leadUnavailable}
                            onClick={() => addToCart(leadStore)}
                          >
                            {Boolean(leadStore.externalCard) || leadStore.id < 0
                              ? 'Sob encomenda'
                              : leadStore.preco <= 0
                                ? 'Sob consulta'
                                : leadStore.estoque <= 0
                                  ? 'Esgotado'
                                  : 'Adicionar'}
                          </button>
                        </div>
                      </div>
                    </article>
                  ) : leadFallback ? (
                    <article className="landing-spotlight-card">
                      <div className="landing-spotlight-stage">
                        <img src={leadFallback.image} alt={leadFallback.name} />
                      </div>
                      <div className="landing-spotlight-body">
                        <span className="landing-spotlight-meta">{leadFallback.game}</span>
                        <h3>{leadFallback.name}</h3>
                        <p className="landing-lead-copy" style={{ fontSize: '14px' }}>
                          Edição icônica destacada do nosso acervo. Abra a seção correspondente para buscar exemplares disponíveis e lançamentos.
                        </p>
                        <div className="landing-spotlight-actions">
                          <button
                            type="button"
                            className="landing-btn-print"
                            onClick={() => handleGameSelect(leadFallback.gameId)}
                          >
                            <span>Abrir universo</span>
                            <ArrowUpRight size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ) : null}

                  <div className="landing-ledger-rail">
                    {hasLiveInventory ? (
                      railStore.length > 0 ? (
                        railStore.map((p) => {
                          const isExternal = Boolean(p.externalCard) || p.id < 0;
                          const isUnpriced = p.preco <= 0;
                          const isUnavailable = isExternal || isUnpriced || p.estoque <= 0;

                          return (
                            <div key={p.id} className="landing-rail-row">
                              <div className="landing-rail-thumb">
                                <img
                                  src={p.imagemUrl || nobleLogo}
                                  alt={p.nome}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = nobleLogo;
                                  }}
                                />
                              </div>
                              <div className="landing-rail-info">
                                <span className="landing-rail-sub">{p.subtitulo || p.jogoNome}</span>
                                <h3 className="landing-rail-title">{p.nome}</h3>
                                <span className="landing-rail-price">
                                  {!isUnpriced ? `R$ ${formatBRL(p.preco)}` : 'Sob consulta'}
                                </span>
                              </div>
                              <div className="landing-rail-actions">
                                <button
                                  type="button"
                                  className="landing-rail-btn"
                                  onClick={() => setSelectedProductForModal(p)}
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  className="landing-rail-btn-add"
                                  disabled={isUnavailable}
                                  onClick={() => addToCart(p)}
                                  aria-label={
                                    isExternal
                                      ? `${p.nome} disponível sob encomenda`
                                      : isUnpriced
                                        ? `${p.nome} com preço sob consulta`
                                        : p.estoque <= 0
                                          ? `${p.nome} esgotado`
                                          : `Adicionar ${p.nome} ao carrinho`
                                  }
                                  title={
                                    isExternal
                                      ? 'Sob encomenda, solicite importação à loja'
                                      : isUnpriced
                                        ? 'Preço sob consulta'
                                        : p.estoque <= 0
                                          ? 'Produto esgotado'
                                          : 'Adicionar ao carrinho'
                                  }
                                >
                                  {isExternal ? (
                                    'Encomenda'
                                  ) : isUnpriced ? (
                                    'Consulta'
                                  ) : p.estoque <= 0 ? (
                                    'Esgotado'
                                  ) : (
                                    <Plus size={15} />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="landing-rail-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                          <div className="landing-rail-info">
                            <span className="landing-rail-sub">Acervo completo</span>
                            <h3 className="landing-rail-title">Busque singles em todos os universos</h3>
                          </div>
                          <div className="landing-rail-actions">
                            <button
                              type="button"
                              className="landing-rail-btn"
                              onClick={() => handleGameSelect('all')}
                            >
                              Explorar catálogo
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      railFallback.map((item) => (
                        <div key={item.id} className="landing-rail-row">
                          <div className="landing-rail-thumb">
                            <img src={item.image} alt={item.name} />
                          </div>
                          <div className="landing-rail-info">
                            <span className="landing-rail-sub">{item.game}</span>
                            <h3 className="landing-rail-title">{item.name}</h3>
                            <span className="landing-rail-price">Seleção de referência</span>
                          </div>
                          <div className="landing-rail-actions">
                            <button
                              type="button"
                              className="landing-rail-btn"
                              onClick={() => handleGameSelect(item.gameId)}
                            >
                              Ver linha
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Band 4: Faixa assimétrica de conta e comunidade */}
        <section className="landing-closing-band" aria-label="Conta e comunidade Noble Deck">
          <div className="landing-band-wide">
            <div className="landing-closing-grid">
              <div className="landing-closing-copy">
                <h2>Sua coleção merece mesa cheia.</h2>
                <p>
                  Entre ou crie sua conta para acompanhar pedidos, reservar lançamentos e organizar suas próximas cartas na comunidade Noble Deck.
                </p>
              </div>

              <div className="landing-closing-deck">
                <div className="landing-closing-badges">
                  <span className="landing-closing-tag">
                    <Layers size={14} color={isLight ? '#8F4A00' : '#FFC400'} />
                    <span>Catálogo integrado</span>
                  </span>
                  <span className="landing-closing-tag">
                    <Crown size={14} color={isLight ? '#8F4A00' : '#FFC400'} />
                    <span>Envio com proteção rígida</span>
                  </span>
                </div>

                <div className="landing-closing-actions">
                  <button
                    type="button"
                    className="landing-btn-print"
                    onClick={() => {
                      setAuthModalMode('register');
                      setIsAuthModalOpen(true);
                    }}
                  >
                    Criar minha conta
                  </button>
                  <button
                    type="button"
                    className="landing-btn-print-secondary"
                    onClick={() => {
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                    }}
                  >
                    Fazer login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
