import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ShoppingBag } from 'lucide-react';
import type { GameId, ProductCategory } from '../types';

export const ProductsPage: React.FC = () => {
  const {
    products,
    selectedGameFilter,
    setSelectedGameFilter,
    setSelectedProductForModal,
    addToCart,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

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

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesGame =
          selectedGameFilter === 'all' ? true : p.jogo === selectedGameFilter;
        const matchesCategory =
          selectedCategory === 'all' ? true : p.categoria === selectedCategory;
        const matchesSearch =
          p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.subtitulo.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGame && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.preco - b.preco;
        if (sortBy === 'price-desc') return b.preco - a.preco;
        if (sortBy === 'name') return a.nome.localeCompare(b.nome);
        return (b.isDestaque ? 1 : 0) - (a.isDestaque ? 1 : 0);
      });
  }, [products, selectedGameFilter, selectedCategory, searchQuery, sortBy]);

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="app-container">
        {/* Cabeçalho */}
        <div style={{ marginBottom: '36px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-primary)',
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
            Encontre produtos selados, boosters, decks estruturados e cartas colecionáveis
            certificadas com estoque em tempo real.
          </p>
        </div>

        {/* Filtros */}
        <div
          className="glass-panel"
          style={{
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                Ordenar por:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  backgroundColor: 'var(--color-surface-container-high)',
                  color: 'var(--color-on-surface)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '8px 16px',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                <option value="featured">Destaques</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {games.map((g) => (
              <button
                key={g.id}
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
                      ? 'rgba(140, 86, 212, 0.22)'
                      : 'var(--color-surface-container-low)',
                  color:
                    selectedGameFilter === g.id
                      ? 'var(--color-primary)'
                      : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
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
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor:
                  selectedCategory === 'all'
                    ? 'rgba(220, 149, 255, 0.2)'
                    : 'transparent',
                color:
                  selectedCategory === 'all' ? 'var(--color-secondary)' : 'var(--color-outline)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Todas as Categorias
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor:
                    selectedCategory === cat
                      ? 'rgba(220, 149, 255, 0.2)'
                      : 'transparent',
                  color:
                    selectedCategory === cat ? 'var(--color-secondary)' : 'var(--color-outline)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
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
            marginBottom: '24px',
            fontSize: '13px',
            color: 'var(--color-outline)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>
            Mostrando {filteredProducts.length} de {products.length} itens
          </span>
          {(selectedGameFilter !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedGameFilter('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Resetar todos os filtros
            </button>
          )}
        </div>

        {/* Produtos */}
        {filteredProducts.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface-container)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p style={{ fontSize: '18px', color: 'var(--color-on-surface-variant)', marginBottom: '16px' }}>
              Nenhum produto encontrado com os filtros selecionados.
            </p>
            <button
              onClick={() => {
                setSelectedGameFilter('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="btn-primary"
            >
              Ver todos os produtos
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '28px',
            }}
          >
            {filteredProducts.map((p) => (
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
                    src={p.imagemUrl}
                    alt={p.nome}
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
                        color: '#ffffff',
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
                        color: 'var(--color-secondary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        zIndex: 5,
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
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '19px',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                        }}
                      >
                        R$ {p.preco.toFixed(2)}
                      </p>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: p.estoque > 0 ? 'var(--color-outline)' : 'var(--color-error)',
                        }}
                      >
                        {p.estoque > 0 ? `${p.estoque} em estoque` : 'Esgotado'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedProductForModal(p)}
                      className="btn-outline"
                      style={{ flex: 1, padding: '10px 0' }}
                    >
                      Ver detalhes
                    </button>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={p.estoque <= 0}
                      className="btn-primary"
                      style={{
                        padding: '10px 14px',
                        opacity: p.estoque <= 0 ? 0.3 : 1,
                        cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                      }}
                      title={p.estoque > 0 ? 'Adicionar ao carrinho' : 'Sem estoque'}
                    >
                      <ShoppingBag size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
