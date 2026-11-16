import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Eye,
  Layers,
  Package,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import type { GameId, Product, ProductCategory } from '../types';
import { SystemSelect } from '../components/SystemSelect';
import { formatBRL } from '../services/api';
import nobleLogo from '../assets/noble-logo.png';
import pokemonLogo from '../assets/games/pokemon.png';
import magicLogo from '../assets/games/magic.png';
import yugiohLogo from '../assets/games/yugioh.png';
import onepieceLogo from '../assets/games/onepiece.png';

const GAMES_META: Array<{ id: GameId | 'all'; label: string; logo: string }> = [
  { id: 'all', label: 'Todos os Jogos', logo: nobleLogo },
  { id: 'pokemon', label: 'Pokémon TCG', logo: pokemonLogo },
  { id: 'magic', label: 'Magic: The Gathering', logo: magicLogo },
  { id: 'yugioh', label: 'Yu-Gi-Oh!', logo: yugiohLogo },
  { id: 'onepiece', label: 'One Piece', logo: onepieceLogo },
  { id: 'outros', label: 'Acessórios', logo: nobleLogo },
];

const CATEGORIES: ProductCategory[] = [
  'Booster Box',
  'Deck Commander',
  'Booster Pack',
  'Starter Deck',
  'Carta Avulsa',
  'Acessórios',
];

export const ProductsPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const activeAccentText = isLight ? '#8F4A00' : '#FFC400';

  const {
    products,
    selectedGameFilter,
    setSelectedGameFilter,
    setSelectedProductForModal,
    addToCart,
    setCurrentTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [spotlightId, setSpotlightId] = useState<number | null>(null);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  const slabRef = useRef<HTMLDivElement>(null);
  const rafTiltRef = useRef<number>(0);

  const activeStoreProducts = useMemo(
    () => products.filter((p) => p.ativo !== false),
    [products]
  );

  const gameCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeStoreProducts.length };
    for (const p of activeStoreProducts) {
      counts[p.jogo] = (counts[p.jogo] || 0) + 1;
    }
    return counts;
  }, [activeStoreProducts]);

  const categoryCounts = useMemo(() => {
    const base = activeStoreProducts.filter((p) =>
      selectedGameFilter === 'all' ? true : p.jogo === selectedGameFilter
    );
    const counts: Record<string, number> = { all: base.length };
    for (const p of base) {
      counts[p.categoria] = (counts[p.categoria] || 0) + 1;
    }
    return counts;
  }, [activeStoreProducts, selectedGameFilter]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matches = activeStoreProducts.filter((p) => {
      if (selectedGameFilter !== 'all' && p.jogo !== selectedGameFilter) return false;
      if (selectedCategory !== 'all' && p.categoria !== selectedCategory) return false;
      if (onlyInStock && (p.estoque <= 0 || p.preco <= 0)) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.subtitulo.toLowerCase().includes(q) ||
        p.jogoNome.toLowerCase().includes(q) ||
        (p.raridade || '').toLowerCase().includes(q)
      );
    });

    return [...matches].sort((a, b) => {
      if (sortBy === 'price-asc') {
        if (a.preco <= 0 && b.preco > 0) return 1;
        if (b.preco <= 0 && a.preco > 0) return -1;
        return a.preco - b.preco;
      }
      if (sortBy === 'price-desc') {
        if (a.preco <= 0 && b.preco > 0) return 1;
        if (b.preco <= 0 && a.preco > 0) return -1;
        return b.preco - a.preco;
      }
      if (sortBy === 'name') return a.nome.localeCompare(b.nome);

      const stockBiasA = a.estoque > 0 && a.preco > 0 ? 1 : 0;
      const stockBiasB = b.estoque > 0 && b.preco > 0 ? 1 : 0;
      if (stockBiasB !== stockBiasA) return stockBiasB - stockBiasA;
      return (b.isDestaque ? 1 : 0) - (a.isDestaque ? 1 : 0);
    });
  }, [
    activeStoreProducts,
    selectedGameFilter,
    selectedCategory,
    onlyInStock,
    searchQuery,
    sortBy,
  ]);

  const spotlightProduct: Product | null = useMemo(() => {
    if (filteredProducts.length === 0) return null;
    if (spotlightId !== null) {
      const found = filteredProducts.find((p) => p.id === spotlightId);
      if (found) return found;
    }
    return filteredProducts[0];
  }, [filteredProducts, spotlightId]);

  useEffect(() => {
    return () => {
      if (rafTiltRef.current) cancelAnimationFrame(rafTiltRef.current);
    };
  }, []);

  const handleSlabPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const el = slabRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const clampedX = Math.min(Math.max(px, 0), 1);
    const clampedY = Math.min(Math.max(py, 0), 1);

    if (rafTiltRef.current) cancelAnimationFrame(rafTiltRef.current);
    rafTiltRef.current = requestAnimationFrame(() => {
      const rotY = (clampedX - 0.5) * 16;
      const rotX = (0.5 - clampedY) * 14;
      el.style.setProperty('--vitrine-rx', `${rotX.toFixed(2)}deg`);
      el.style.setProperty('--vitrine-ry', `${rotY.toFixed(2)}deg`);
      el.style.setProperty('--vitrine-gx', `${(clampedX * 100).toFixed(1)}%`);
      el.style.setProperty('--vitrine-gy', `${(clampedY * 100).toFixed(1)}%`);
    });
  };

  const handleSlabPointerLeave = () => {
    const el = slabRef.current;
    if (!el) return;
    el.style.setProperty('--vitrine-rx', '0deg');
    el.style.setProperty('--vitrine-ry', '0deg');
    el.style.setProperty('--vitrine-gx', '50%');
    el.style.setProperty('--vitrine-gy', '35%');
  };

  const handleQuickAdd = (p: Product) => {
    if (p.preco <= 0 || p.estoque <= 0) return;
    addToCart(p);
    setJustAddedId(p.id);
    setTimeout(() => {
      setJustAddedId((curr) => (curr === p.id ? null : curr));
    }, 1200);
  };

  const resetAllFilters = () => {
    setSelectedGameFilter('all');
    setSelectedCategory('all');
    setOnlyInStock(false);
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedGameFilter !== 'all' ||
    selectedCategory !== 'all' ||
    onlyInStock ||
    searchQuery.trim() !== '';

  return (
    <div className="vitrine-page-root">
      {/* Faixa superior expandida preenchendo as margens */}
      <div className="vitrine-command-band">
        <div className="landing-band-wide">
          <div className="vitrine-header-grid">
            <div className="vitrine-title-block">
              <h1>Vitrine da Loja</h1>
              <p>
                Edições seladas, decks completos e singles conferidas do acervo físico Noble Deck,
                prontas para envio imediato ou retirada na loja.
              </p>
            </div>

            <div className="vitrine-search-toolbar">
              <div className="vitrine-search-input-wrap">
                <Search size={17} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, edição, raridade..."
                  aria-label="Buscar produtos na vitrine"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpar busca"
                    className="vitrine-clear-btn"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-pressed={onlyInStock}
                onClick={() => setOnlyInStock((v) => !v)}
                className={`vitrine-stock-toggle ${onlyInStock ? 'is-active' : ''}`}
              >
                <SlidersHorizontal size={14} />
                <span>Disponíveis agora</span>
              </button>

              <div className="vitrine-sort-wrap">
                <SystemSelect<'featured' | 'price-asc' | 'price-desc' | 'name'>
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
                  options={[
                    { value: 'featured', label: 'Ordenar: Destaques' },
                    { value: 'price-asc', label: 'Menor Preço' },
                    { value: 'price-desc', label: 'Maior Preço' },
                    { value: 'name', label: 'Ordem Alfabética' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Barra de universos com logos reais e contadores do estoque */}
          <div className="vitrine-universe-strip" role="tablist" aria-label="Filtrar por Card Game">
            {GAMES_META.map((game) => {
              const count = gameCounts[game.id] || 0;
              const isSelected = selectedGameFilter === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedGameFilter(game.id)}
                  className={`vitrine-universe-pill ${isSelected ? 'is-selected' : ''}`}
                >
                  <img src={game.logo} alt="" aria-hidden="true" />
                  <span>{game.label}</span>
                  <span className="vitrine-pill-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Palco principal de 12 colunas preenchendo largura total */}
      <div className="landing-band-wide vitrine-stage-wrap">
        {activeStoreProducts.length === 0 ? (
          <div className="vitrine-empty-stage">
            <div className="vitrine-empty-icon">
              <Package size={34} />
            </div>
            <h2>Vitrine em reposição de estoque</h2>
            <p>
              No momento não há itens cadastrados ou ativos na loja. Assim que novos produtos ou
              singles forem adicionados pela equipe no catálogo interno, eles aparecerão aqui.
            </p>
            <button
              type="button"
              onClick={() => setCurrentTab('home')}
              className="landing-btn-print"
            >
              <span>Voltar ao Início</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
        ) : (
          <div className="vitrine-stage-grid">
            {/* Coluna Esquerda (4 cols): Palco 3D interativo do item em foco */}
            <aside className="vitrine-spotlight-col" aria-label="Inspeção em destaque 3D">
              {spotlightProduct ? (
                <div className="vitrine-spotlight-card">
                  <div className="vitrine-spotlight-topmeta">
                    <span className="vitrine-spotlight-eyetag">{spotlightProduct.jogoNome}</span>
                    {spotlightProduct.raridade && (
                      <span className="vitrine-rarity-chip">{spotlightProduct.raridade}</span>
                    )}
                  </div>

                  <div
                    ref={slabRef}
                    className="vitrine-spotlight-slab"
                    onPointerMove={handleSlabPointerMove}
                    onPointerLeave={handleSlabPointerLeave}
                    onClick={() => setSelectedProductForModal(spotlightProduct)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ampliar detalhes de ${spotlightProduct.nome}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProductForModal(spotlightProduct);
                      }
                    }}
                  >
                    <div className="vitrine-slab-foil" aria-hidden="true" />
                    <img
                      src={spotlightProduct.imagemUrl || nobleLogo}
                      alt={spotlightProduct.nome}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = nobleLogo;
                      }}
                    />
                  </div>

                  <div className="vitrine-spotlight-info">
                    <span className="vitrine-spotlight-sub">
                      {spotlightProduct.subtitulo || spotlightProduct.categoria}
                    </span>
                    <h2>{spotlightProduct.nome}</h2>

                    <div className="vitrine-spotlight-price-row">
                      <span className="vitrine-spotlight-price" style={{ color: activeAccentText }}>
                        {spotlightProduct.preco > 0
                          ? `R$ ${formatBRL(spotlightProduct.preco)}`
                          : 'Sob consulta'}
                      </span>
                      <span
                        className={`vitrine-stock-badge ${
                          spotlightProduct.estoque > 3
                            ? 'is-ok'
                            : spotlightProduct.estoque > 0
                              ? 'is-low'
                              : 'is-out'
                        }`}
                      >
                        {spotlightProduct.estoque > 0
                          ? `${spotlightProduct.estoque} em estoque`
                          : 'Esgotado'}
                      </span>
                    </div>

                    <div className="vitrine-spec-grid">
                      <div>
                        <span>Categoria</span>
                        <strong>{spotlightProduct.categoria}</strong>
                      </div>
                      <div>
                        <span>Idioma</span>
                        <strong>{spotlightProduct.idioma || 'Português'}</strong>
                      </div>
                    </div>

                    <div className="vitrine-spotlight-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedProductForModal(spotlightProduct)}
                        className="landing-btn-print-secondary"
                        style={{ flex: 1, padding: '12px 14px' }}
                      >
                        <Eye size={15} />
                        <span>Ficha</span>
                      </button>
                      <button
                        type="button"
                        disabled={spotlightProduct.preco <= 0 || spotlightProduct.estoque <= 0}
                        onClick={() => handleQuickAdd(spotlightProduct)}
                        className="landing-btn-print"
                        style={{
                          flex: 1.4,
                          padding: '12px 16px',
                          opacity:
                            spotlightProduct.preco <= 0 || spotlightProduct.estoque <= 0 ? 0.45 : 1,
                          cursor:
                            spotlightProduct.preco <= 0 || spotlightProduct.estoque <= 0
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                      >
                        {justAddedId === spotlightProduct.id ? (
                          <>
                            <Check size={15} />
                            <span>No Carrinho</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={15} />
                            <span>
                              {spotlightProduct.estoque > 0 ? 'Adicionar' : 'Esgotado'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="vitrine-spotlight-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <Layers size={28} style={{ color: activeAccentText, margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                    Ajuste os filtros ao lado para inspecionar um produto em destaque.
                  </p>
                </div>
              )}
            </aside>

            {/* Coluna Direita (8 cols): Filtros por categoria + Grade ampla da loja */}
            <section className="vitrine-catalog-col" aria-label="Produtos disponíveis na vitrine">
              <div className="vitrine-category-bar">
                <div className="vitrine-category-pills">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`vitrine-cat-btn ${selectedCategory === 'all' ? 'is-selected' : ''}`}
                  >
                    Todas ({categoryCounts.all || 0})
                  </button>
                  {CATEGORIES.map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`vitrine-cat-btn ${active ? 'is-selected' : ''}`}
                        style={{ opacity: count === 0 && !active ? 0.55 : 1 }}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="vitrine-results-meta">
                  <span>
                    {filteredProducts.length}{' '}
                    {filteredProducts.length === 1 ? 'item na vitrine' : 'itens na vitrine'}
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="vitrine-reset-link"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="vitrine-empty-stage" style={{ padding: '48px 24px' }}>
                  <Package size={32} />
                  <h2>Nenhum produto corresponde aos filtros</h2>
                  <p>
                    Tente limpar a busca ou selecionar outra categoria para visualizar os itens
                    disponíveis no estoque da loja.
                  </p>
                  <button type="button" onClick={resetAllFilters} className="landing-btn-print">
                    Mostrar Todos os Itens
                  </button>
                </div>
              ) : (
                <div className="vitrine-cards-grid">
                  {filteredProducts.map((p) => {
                    const isUnpriced = p.preco <= 0;
                    const isOutOfStock = p.estoque <= 0;
                    const isUnavailable = isUnpriced || isOutOfStock;
                    const isInSpotlight = spotlightProduct?.id === p.id;
                    const isJustAdded = justAddedId === p.id;

                    return (
                      <article
                        key={p.id}
                        className={`vitrine-item-card ${isInSpotlight ? 'is-spotlighted' : ''}`}
                        onMouseEnter={() => setSpotlightId(p.id)}
                        onFocus={() => setSpotlightId(p.id)}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProductForModal(p)}
                          className="vitrine-item-media"
                          aria-label={`Abrir detalhes de ${p.nome}`}
                        >
                          <img
                            src={p.imagemUrl || nobleLogo}
                            alt={p.nome}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = nobleLogo;
                            }}
                          />

                          {p.raridade && (
                            <span className="vitrine-card-rarity">{p.raridade}</span>
                          )}
                          {p.isNovo && <span className="vitrine-card-new">Novo</span>}
                        </button>

                        <div className="vitrine-item-body">
                          <div>
                            <span className="vitrine-item-sub">
                              {p.subtitulo || `${p.categoria} / ${p.jogoNome}`}
                            </span>
                            <h3 className="vitrine-item-title">{p.nome}</h3>
                          </div>

                          <div className="vitrine-item-price-row">
                            <strong
                              className="vitrine-item-price"
                              style={{
                                color: isUnpriced
                                  ? 'var(--color-on-surface-variant)'
                                  : activeAccentText,
                              }}
                            >
                              {!isUnpriced ? `R$ ${formatBRL(p.preco)}` : 'Sob consulta'}
                            </strong>
                            <span
                              className={`vitrine-item-stock ${
                                p.estoque > 3 ? 'is-ok' : p.estoque > 0 ? 'is-low' : 'is-out'
                              }`}
                            >
                              {isOutOfStock ? 'Esgotado' : `${p.estoque} em estoque`}
                            </span>
                          </div>

                          <div className="vitrine-item-actions">
                            <button
                              type="button"
                              onClick={() => setSelectedProductForModal(p)}
                              className="vitrine-btn-detail"
                            >
                              Ver detalhes
                            </button>
                            <button
                              type="button"
                              disabled={isUnavailable}
                              onClick={() => handleQuickAdd(p)}
                              aria-label={
                                isUnpriced
                                  ? `${p.nome} sob consulta`
                                  : isOutOfStock
                                    ? `${p.nome} esgotado`
                                    : `Adicionar ${p.nome} ao carrinho`
                              }
                              className="vitrine-btn-cart"
                            >
                              {isJustAdded ? (
                                <Check size={16} />
                              ) : isOutOfStock ? (
                                <span>Indisp.</span>
                              ) : (
                                <ShoppingBag size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
