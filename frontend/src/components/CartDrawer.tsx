import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    updateCartQuantity,
    cartTotal,
    createOrder,
    setCurrentTab,
  } = useApp();

  const [lastCompletedOrder, setLastCompletedOrder] = useState<number | null>(null);

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    const order = await createOrder();
    if (order) {
      setLastCompletedOrder(order.id_pedido);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={() => {
          setIsCartOpen(false);
          setLastCompletedOrder(null);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--modal-backdrop)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Carrinho */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: 'var(--color-surface-container)',
          borderLeft: '1px solid var(--card-border)',
          boxShadow: '-10px 0 40px var(--shadow-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag color="var(--color-primary)" size={22} />
            <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-headline)' }}>
              Seu Carrinho
            </h3>
            <span className="badge badge-purple">{cart.length} itens</span>
          </div>
          <button
            onClick={() => {
              setIsCartOpen(false);
              setLastCompletedOrder(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-on-surface-variant)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {lastCompletedOrder ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(140, 86, 212, 0.2)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                color: 'var(--color-primary)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>
              Pedido #{lastCompletedOrder} Confirmado!
            </h3>
            <p
              style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: '14px',
                marginBottom: '24px',
                lineHeight: '1.6',
              }}
            >
              Obrigado por comprar na Noble Deck! O estoque dos produtos foi atualizado e
              você pode acompanhar este pedido no seu Painel.
            </p>
            <button
              onClick={() => {
                setIsCartOpen(false);
                setLastCompletedOrder(null);
                setCurrentTab('dashboard');
              }}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              Ver no Painel de Pedidos
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-surface-container-low)',
                border: '1px solid var(--nav-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: 'var(--color-outline)',
              }}
            >
              <ShoppingBag size={32} />
            </div>
            <h4 style={{ fontSize: '18px', marginBottom: '8px' }}>Seu carrinho está vazio</h4>
            <p
              style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: '14px',
                marginBottom: '24px',
              }}
            >
              Explore boosters, caixas seladas e cartas raras para adicionar à sua coleção.
            </p>
            <button
              onClick={() => {
                setIsCartOpen(false);
                setCurrentTab('products');
              }}
              className="btn-primary"
            >
              Explorar Produtos
            </button>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {cart.map((item) => (
              <div
                key={item.produto.id}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '14px',
                  backgroundColor: 'var(--color-surface-container-high)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--card-border)',
                }}
              >
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--color-surface-dim)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                >
                  <img
                    src={item.produto.imagemUrl}
                    alt={item.produto.nome}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    {item.produto.jogoNome}
                  </span>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.produto.nome}
                  </h4>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      marginBottom: '8px',
                    }}
                  >
                    R$ {item.produto.preco.toFixed(2)}
                  </span>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'var(--color-surface-container-low)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                        border: '1px solid var(--nav-border)',
                      }}
                    >
                      <button
                        onClick={() =>
                          updateCartQuantity(item.produto.id, item.quantidade - 1)
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-on-surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Minus size={13} />
                      </button>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          fontWeight: 700,
                          minWidth: '16px',
                          textAlign: 'center',
                        }}
                      >
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() =>
                          updateCartQuantity(item.produto.id, item.quantidade + 1)
                        }
                        disabled={item.quantidade >= item.produto.estoque}
                        style={{
                          background: 'none',
                          border: 'none',
                          color:
                            item.quantidade >= item.produto.estoque
                              ? 'var(--color-outline)'
                              : 'var(--color-on-surface)',
                          cursor:
                            item.quantidade >= item.produto.estoque
                              ? 'not-allowed'
                              : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.produto.id)}
                      title="Remover produto"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-outline)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                      onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-outline)')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && !lastCompletedOrder && (
          <div
            style={{
              padding: '24px',
              borderTop: '1px solid var(--card-border)',
              backgroundColor: 'var(--color-surface-container-low)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '14px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <span>Subtotal</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-headline)' }}>
                R$ {cartTotal.toFixed(2)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '16px',
                fontSize: '14px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <span>Frete</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-accent-yellow)',
                  fontWeight: 600,
                }}
              >
                Grátis para loja
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
                fontSize: '18px',
                fontWeight: 700,
                borderTop: '1px dashed var(--card-border)',
                paddingTop: '12px',
              }}
            >
              <span>Total</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-primary)',
                  fontSize: '22px',
                }}
              >
                R$ {cartTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Finalizar Pedido</span>
              <ArrowRight size={18} />
            </button>
            <p
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--color-on-surface-variant)',
                marginTop: '10px',
              }}
            >
              Pagamento seguro na retirada ou envio rápido rastreado.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};
