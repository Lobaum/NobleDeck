import React from 'react';
import { useApp } from '../context/AppContext';
import { X, ShoppingBag } from 'lucide-react';

export const ProductModal: React.FC = () => {
  const { selectedProductForModal, setSelectedProductForModal, addToCart } = useApp();

  if (!selectedProductForModal) return null;

  const product = selectedProductForModal;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={() => setSelectedProductForModal(null)}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '780px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 25px 50px var(--shadow-color), 0 0 40px var(--glow-color)',
          overflow: 'hidden',
          zIndex: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        <button
          onClick={() => setSelectedProductForModal(null)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--card-border)',
            color: 'var(--color-on-surface)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            padding: '36px',
            backgroundColor: 'var(--color-surface-container-low)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              backgroundColor: 'rgba(140, 86, 212, 0.25)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="tcg-card shimmer-effect"
            style={{
              width: '100%',
              maxWidth: '260px',
              aspectRatio: '2.5 / 3.5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              backgroundColor: 'var(--color-surface-dim)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
            }}
          >
            <img
              src={product.imagemUrl}
              alt={product.nome}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5))',
              }}
            />
          </div>
          {product.raridade && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <span className="badge badge-pink">{product.raridade}</span>
              {product.isNovo && <span className="badge badge-purple">Lançamento</span>}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {product.subtitulo}
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '26px',
                marginTop: '6px',
                marginBottom: '16px',
                lineHeight: 1.2,
              }}
            >
              {product.nome}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '32px',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                }}
              >
                R$ {product.preco.toFixed(2)}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color:
                    product.estoque > 5
                      ? 'var(--color-accent-yellow)'
                      : product.estoque > 0
                      ? 'var(--color-tertiary)'
                      : 'var(--color-error)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {product.estoque > 0
                  ? `● ${product.estoque} em estoque`
                  : '● Estoque esgotado'}
              </span>
            </div>

            <p
              style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: '14px',
                lineHeight: 1.6,
                marginBottom: '24px',
              }}
            >
              {product.descricao}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '28px',
                padding: '16px',
                backgroundColor: 'var(--color-surface-container-low)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-outline)', display: 'block' }}>Jogo</span>
                <span style={{ fontWeight: 600 }}>{product.jogoNome}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-outline)', display: 'block' }}>Categoria</span>
                <span style={{ fontWeight: 600 }}>{product.categoria}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-outline)', display: 'block' }}>Idioma</span>
                <span style={{ fontWeight: 600 }}>{product.idioma || 'Original'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-outline)', display: 'block' }}>Garantia</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>100% Autêntico</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                addToCart(product);
                setSelectedProductForModal(null);
              }}
              disabled={product.estoque <= 0}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '14px',
                opacity: product.estoque <= 0 ? 0.4 : 1,
                cursor: product.estoque <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ShoppingBag size={18} />
              <span>
                {product.estoque > 0 ? 'Adicionar ao Carrinho' : 'Esgotado'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
