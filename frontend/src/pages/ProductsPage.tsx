import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Search, ShoppingBag, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import type { ActiveGameApi, ExternalCard, GameId, ProductCategory } from '../types';
import { SystemSelect } from '../components/SystemSelect';
import { searchLiveCards } from '../services/tcgApi';
import { externalCardToProduct, formatBRL } from '../services/api';
import nobleLogo from '../assets/noble-logo.png';

export const ProductsPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const activeAccentText = isLight ? '#7A4B00' : 'var(--color-primary)';
  const activeSecondaryText = isLight ? '#8F4700' : 'var(--color-secondary)';
  const {
    products,
    selectedGameFilter,
    setSelectedGameFilter,
    setSelectedProductForModal,
    setExternalRequestProduct,
    addToCart,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [catalogSource, setCatalogSource] = useState<'all' | 'store' | 'api'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

  const [apiCards, setApiCards] = useState<ExternalCard[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiPage, setApiPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setApiPage(1);
    }, 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setApiPage(1);
  }, [selectedGameFilter, catalogSource]);

  const shouldFetchApi =
    catalogSource !== 'store' &&
    selectedGameFilter !== 'outros' &&
    (selectedCategory === 'all' || selectedCategory === 'Carta Avulsa');

  useEffect(() => {
    if (!shouldFetchApi) {
      setApiCards([]);
      setIsLoadingApi(false);
      return;
    }

    let active = true;
    setIsLoadingApi(true);

    const targetGame: ActiveGameApi | 'all' =
      selectedGameFilter === 'all' ? 'all' : (selectedGameFilter as ActiveGameApi);

    searchLiveCards(targetGame, debouncedQuery, apiPage)
      .then(({ cards }) => {
        if (active) {
          setApiCards(cards);
        }
      })
      .catch(() => {
        if (active) {
          setApiCards([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingApi(false);
        }
      });

    return () => {
      active = false;
    };
  }, [shouldFetchApi, selectedGameFilter, debouncedQuery, apiPage]);

  const categories: ProductCategory[] = [
    'Booster Box',
    'Deck Commander',
    'Booster Pack',
    'Starter Deck',
    'Carta Avulsa',
    'Acessórios',
  ];

  const games: { id: GameId | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos os Jogos' },
    { id: 'pokemon', label: 'Pokémon TCG' },
    { id: 'magic', label: 'Magic: The Gathering' },
    { id: 'yugioh', label: 'Yu-Gi-Oh!' },
    { id: 'onepiece', label: 'One Piece' },
    { id: 'outros', label: 'Acessórios' },
  ];

  const activeStoreProducts = useMemo(
    () => products.filter((p) => p.ativo !== false),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const storeMatches =
      catalogSource === 'api'
        ? []
        : activeStoreProducts.filter((p) => {
          const matchesGame =
            selectedGameFilter === 'all' ? true : p.jogo === selectedGameFilter;
          const matchesCategory =
            selectedCategory === 'all' ? true : p.categoria === selectedCategory;
          const q = searchQuery.toLowerCase();
          const matchesSearch =
            !q ||
            p.nome.toLowerCase().includes(q) ||
            p.descricao.toLowerCase().includes(q) ||
            p.subtitulo.toLowerCase().includes(q);
          return matchesGame && matchesCategory && matchesSearch;
        });

    const storeKeys = new Set(
      activeStoreProducts.map((p) => `${p.jogo}:${p.nome.toLowerCase().trim()}`)
    );

    const mappedApiProducts = shouldFetchApi
      ? apiCards
        .filter((c) => !storeKeys.has(`${c.jogo}:${c.nome.toLowerCase().trim()}`))
        .map((c) => externalCardToProduct(c))
      : [];

    const combined = [...storeMatches, ...mappedApiProducts];

    return combined.sort((a, b) => {
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
      const aStore = a.id > 0 ? 1 : 0;
      const bStore = b.id > 0 ? 1 : 0;
      if (bStore !== aStore) return bStore - aStore;
      return (b.isDestaque ? 1 : 0) - (a.isDestaque ? 1 : 0);
    });
  }, [
    activeStoreProducts,
    apiCards,
    catalogSource,
    shouldFetchApi,
    selectedGameFilter,
    selectedCategory,
    searchQuery,
    sortBy,
  ]);

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="app-container">
        {/* Cabeçalho */}
        <div style={{ marginBottom: '36px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: activeAccentText,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            Catálogo Oficial
          </span>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontFamily: 'var(--font-headline)',
              marginBottom: '12px',
            }}
          >
            Explore o Universo dos Card Games
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '16px', maxWidth: '600px' }}>
            Encontre produtos do estoque da loja e pesquise cartas reais em tempo real nas bases
            oficiais de Pokémon TCG, Magic: The Gathering, Yu-Gi-Oh! e One Piece.
          </p>
        </div>

        {/* Filtros */}
        <div
          className="glass-panel"
          style={{
            position: 'relative',
            zIndex: 15,
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--color-surface-container-low)',
                borderRadius: 'var(--radius-full)',
                padding: '10px 18px',
                border: '1px solid var(--input-border)',
                flex: 1,
                minWidth: '260px',
                maxWidth: '480px',
              }}
            >
              <Search size={18} color="var(--color-outline)" />
              <input
                type="text"
                placeholder="Buscar por nome, carta, edição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-on-surface)',
                  fontSize: '14px',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-outline)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Limpar
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'all', label: 'Catálogo Completo' },
                    { id: 'store', label: `Estoque (${activeStoreProducts.length})` },
                    { id: 'api', label: 'Cards Oficiais (Sob Encomenda)' },
                  ] as const
                ).map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setCatalogSource(src.id)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 'var(--radius-full)',
                      border:
                        catalogSource === src.id
                          ? '1px solid var(--color-primary)'
                          : '1px solid var(--nav-border)',
                      backgroundColor:
                        catalogSource === src.id
                          ? 'rgba(255, 196, 0, 0.2)'
                          : 'var(--color-surface-container-low)',
                      color:
                        catalogSource === src.id
                          ? activeAccentText
                          : 'var(--color-on-surface-variant)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: catalogSource === src.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {src.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  Ordenar por:
                </span>
                <div style={{ minWidth: '180px' }}>
                  <SystemSelect<'featured' | 'price-asc' | 'price-desc' | 'name'>
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    options={[
                      { value: 'featured', label: 'Destaques' },
                      { value: 'price-asc', label: 'Menor Preço' },
                      { value: 'price-desc', label: 'Maior Preço' },
                      { value: 'name', label: 'Nome (A-Z)' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {games.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGameFilter(g.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  border:
                    selectedGameFilter === g.id
                      ? '1px solid var(--color-primary)'
                      : '1px solid var(--nav-border)',
                  backgroundColor:
                    selectedGameFilter === g.id
                      ? 'rgba(255, 196, 0, 0.2)'
                      : 'var(--color-surface-container-low)',
                  color:
                    selectedGameFilter === g.id
                      ? activeAccentText
                      : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: selectedGameFilter === g.id ? 700 : 500,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              borderTop: '1px solid var(--nav-border)',
              paddingTop: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor:
                  selectedCategory === 'all'
                    ? 'rgba(255, 157, 0, 0.18)'
                    : 'transparent',
                color:
                  selectedCategory === 'all' ? activeSecondaryText : 'var(--color-outline)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: selectedCategory === 'all' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              Todas as Categorias
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor:
                    selectedCategory === cat
                      ? 'rgba(255, 157, 0, 0.18)'
                      : 'transparent',
                  color:
                    selectedCategory === cat ? activeSecondaryText : 'var(--color-outline)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px',
            fontSize: '13px',
            color: 'var(--color-outline)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {isLoadingApi ? (
              <>
                <Globe size={14} color={activeAccentText} />
                <span>Consultando acervo oficial de cartas...</span>
              </>
            ) : (
              <span>Mostrando {filteredProducts.length} itens encontrados</span>
            )}
          </span>
          {(selectedGameFilter !== 'all' || selectedCategory !== 'all' || searchQuery || catalogSource !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedGameFilter('all');
                setSelectedCategory('all');
                setCatalogSource('all');
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: activeSecondaryText,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Resetar todos os filtros
            </button>
          )}
        </div>

        {/* Produtos */}
        {filteredProducts.length === 0 && !isLoadingApi ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface-container)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p style={{ fontSize: '18px', color: 'var(--color-on-surface-variant)', marginBottom: '16px' }}>
              Nenhum produto ou carta encontrado com os filtros selecionados.
            </p>
            <button
              onClick={() => {
                setSelectedGameFilter('all');
                setSelectedCategory('all');
                setCatalogSource('all');
                setSearchQuery('');
              }}
              className="btn-primary"
            >
              Ver todos os produtos
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '28px',
              }}
            >
              {filteredProducts.map((p) => {
                const isExternalUnstocked = Boolean(p.externalCard) || p.id < 0;
                const isUnpriced = p.preco <= 0;
                const isUnavailable = isExternalUnstocked || isUnpriced || p.estoque <= 0;

                return (
                  <div
                    key={p.id}
                    className="tcg-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        height: '220px',
                        width: '100%',
                        padding: '16px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--color-surface-container)',
                      }}
                    >
                      <img
                        src={p.imagemUrl || nobleLogo}
                        alt={p.nome}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = nobleLogo;
                        }}
                        style={{
                          maxHeight: '100%',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          zIndex: 2,
                          filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.4))',
                          transition: 'transform 0.3s ease',
                        }}
                      />

                      {p.isNovo && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            backgroundColor: 'var(--color-primary-container)',
                            color: 'var(--color-on-primary-container)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            zIndex: 5,
                          }}
                        >
                          Novo
                        </span>
                      )}

                      {p.raridade && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            backgroundColor: 'var(--color-surface-container)',
                            border: '1px solid var(--card-border)',
                            color: activeSecondaryText,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            zIndex: 5,
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.raridade}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        padding: '20px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--card-border)',
                        backgroundColor: 'var(--card-bg)',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: 'var(--color-on-surface-variant)',
                            display: 'block',
                            marginBottom: '4px',
                          }}
                        >
                          {p.subtitulo}
                        </span>
                        <h3
                          style={{
                            fontSize: '17px',
                            marginBottom: '8px',
                            fontFamily: 'var(--font-headline)',
                            fontWeight: 600,
                            lineHeight: 1.3,
                          }}
                        >
                          {p.nome}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: '16px',
                            gap: '8px',
                          }}
                        >
                          <p
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '19px',
                              fontWeight: 700,
                              color: isUnpriced ? 'var(--color-on-surface-variant)' : activeAccentText,
                            }}
                          >
                            {!isUnpriced ? `R$ ${formatBRL(p.preco)}` : 'Sob consulta'}
                          </p>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              color:
                                isExternalUnstocked || p.estoque > 0
                                  ? 'var(--color-outline)'
                                  : isLight
                                    ? '#b91c1c'
                                    : 'var(--color-error)',
                            }}
                          >
                            {isExternalUnstocked
                              ? 'Sob encomenda'
                              : p.estoque > 0
                                ? `${p.estoque} em estoque`
                                : 'Esgotado'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedProductForModal(p)}
                          className="btn-outline"
                          style={{ flex: 1, padding: '10px 8px' }}
                        >
                          Ver detalhes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isExternalUnstocked) {
                              setExternalRequestProduct(p);
                              return;
                            }
                            addToCart(p);
                          }}
                          disabled={!isExternalUnstocked && isUnavailable}
                          aria-label={
                            isExternalUnstocked
                              ? `Solicitar encomenda para ${p.nome}`
                              : isUnpriced
                                ? `${p.nome} com preço sob consulta`
                                : p.estoque <= 0
                                  ? `${p.nome} esgotado`
                                  : `Adicionar ${p.nome} ao carrinho`
                          }
                          className="btn-primary"
                          style={{
                            padding: isExternalUnstocked ? '10px 12px' : '10px 14px',
                            fontSize: isExternalUnstocked ? '11px' : undefined,
                            whiteSpace: 'nowrap',
                            opacity: !isExternalUnstocked && isUnavailable ? 0.45 : 1,
                            cursor: !isExternalUnstocked && isUnavailable ? 'not-allowed' : 'pointer',
                          }}
                          title={
                            isExternalUnstocked
                              ? 'Solicitar encomenda / importação à equipe'
                              : isUnpriced
                                ? 'Produto sob consulta'
                                : p.estoque > 0
                                  ? 'Adicionar ao carrinho'
                                  : 'Sem estoque'
                          }
                        >
                          {isExternalUnstocked ? (
                            <span>Solicitar Encomenda</span>
                          ) : (
                            <ShoppingBag size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {shouldFetchApi && apiCards.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '40px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setApiPage((prev) => Math.max(1, prev - 1));
                    window.scrollTo({ top: 200, behavior: 'smooth' });
                  }}
                  disabled={apiPage <= 1 || isLoadingApi}
                  className="btn-outline"
                  style={{
                    padding: '10px 18px',
                    opacity: apiPage <= 1 || isLoadingApi ? 0.4 : 1,
                    cursor: apiPage <= 1 || isLoadingApi ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Página Anterior</span>
                </button>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--color-on-surface-variant)',
                  }}
                >
                  Página {apiPage}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setApiPage((prev) => prev + 1);
                    window.scrollTo({ top: 200, behavior: 'smooth' });
                  }}
                  disabled={isLoadingApi || apiCards.length < 6}
                  className="btn-outline"
                  style={{
                    padding: '10px 18px',
                    opacity: isLoadingApi || apiCards.length < 6 ? 0.4 : 1,
                    cursor: isLoadingApi || apiCards.length < 6 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Próxima Página</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
