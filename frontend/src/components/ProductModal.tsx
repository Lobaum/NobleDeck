import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { formatBRL } from '../services/api';
import { X, ShoppingBag, PackagePlus } from 'lucide-react';
import nobleLogo from '../assets/noble-logo.png';

export const ProductModal: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const {
    selectedProductForModal,
    setSelectedProductForModal,
    addToCart,
    currentUser,
    importExternalCard,
    setExternalRequestProduct,
  } = useApp();

  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!selectedProductForModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedProductForModal]);

  if (!selectedProductForModal) return null;

  const product = selectedProductForModal;
  const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
  const isExternalUnstocked = Boolean(product.externalCard) || product.id < 0;
  const isUnpriced = product.preco <= 0;
  const isUnavailable = isExternalUnstocked || isUnpriced || product.estoque <= 0;

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
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
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
          type="button"
          aria-label="Fechar detalhes do produto"
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
              backgroundColor: 'rgba(255, 196, 0, 0.22)',
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
              src={product.imagemUrl || nobleLogo}
              alt={product.nome}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = nobleLogo;
              }}
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
                color: isLight ? '#7A4B00' : 'var(--color-primary)',
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
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: isUnpriced ? '24px' : '32px',
                  fontWeight: 800,
                  color: isUnpriced
                    ? 'var(--color-on-surface-variant)'
                    : isLight
                      ? '#7A4B00'
                      : 'var(--color-primary)',
                }}
              >
                {!isUnpriced ? `R$ ${formatBRL(product.preco)}` : 'Sob consulta'}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: isExternalUnstocked
                    ? isLight
                      ? '#7A4B00'
                      : 'var(--color-primary)'
                    : product.estoque > 5
                      ? isLight
                        ? '#166534'
                        : 'var(--color-accent-yellow)'
                      : product.estoque > 0
                        ? isLight
                          ? '#92400e'
                          : 'var(--color-tertiary)'
                        : isLight
                          ? '#b91c1c'
                          : 'var(--color-error)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {isExternalUnstocked
                  ? '● Sob Encomenda (Acervo Oficial)'
                  : product.estoque > 0
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
                <span style={{ color: 'var(--color-outline)', display: 'block' }}>
                  Garantia
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: isLight ? '#7A4B00' : 'var(--color-primary)',
                  }}
                >
                  100% Autêntico
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {product.externalCard && isStaffOrAdmin && (
              <button
                type="button"
                disabled={isImporting}
                onClick={async () => {
                  if (isImporting) return;
                  setIsImporting(true);
                  try {
                    const imported = await importExternalCard(product.externalCard!);
                    if (imported) {
                      setSelectedProductForModal(imported);
                    }
                  } finally {
                    setIsImporting(false);
                  }
                }}
                className="btn-outline"
                style={{
                  padding: '14px 18px',
                  fontSize: '13px',
                  opacity: isImporting ? 0.6 : 1,
                }}
              >
                <PackagePlus size={16} />
                <span>{isImporting ? 'Importando...' : 'Importar p/ Estoque'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isExternalUnstocked) {
                  setSelectedProductForModal(null);
                  setExternalRequestProduct(product);
                  return;
                }
                if (isUnpriced || product.estoque <= 0) return;
                addToCart(product);
                setSelectedProductForModal(null);
              }}
              disabled={!isExternalUnstocked && isUnavailable}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '14px',
                opacity: !isExternalUnstocked && isUnavailable ? 0.45 : 1,
                cursor: !isExternalUnstocked && isUnavailable ? 'not-allowed' : 'pointer',
              }}
            >
              {isExternalUnstocked ? <PackagePlus size={18} /> : <ShoppingBag size={18} />}
              <span>
                {isExternalUnstocked
                  ? 'Solicitar Encomenda'
                  : isUnpriced
                    ? 'Sob Consulta'
                    : product.estoque > 0
                      ? 'Adicionar ao Carrinho'
                      : 'Esgotado'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
