import React from 'react';
import { NOBLE_LOGO } from '../data/mockData';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentTab } = useApp();

  return (
    <footer
      style={{
        backgroundColor: 'var(--color-surface-container-lowest)',
        borderTop: '1px solid var(--nav-border)',
        padding: '60px 0 32px',
        marginTop: '80px',
      }}
    >
      {/* Rodapé */}
      <div className="app-container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <img
                src={NOBLE_LOGO}
                alt="Noble Deck Logo"
                style={{ width: '32px', height: '32px', opacity: 0.9 }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}
              >
                Noble Deck
              </span>
            </div>
            <p
              style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: '14px',
                lineHeight: '1.6',
                maxWidth: '320px',
              }}
            >
              Sistema de Gerenciamento de Card Games. Encontre seus cards raros, construa
              decks e participe de torneios oficiais com a comunidade.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-headline)',
                marginBottom: '16px',
              }}
            >
              Navegação
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <button
                  onClick={() => {
                    setCurrentTab('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-on-surface-variant)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
                >
                  Início
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentTab('products');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-on-surface-variant)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
                >
                  Catálogo de Produtos
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentTab('tournaments');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-on-surface-variant)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
                >
                  Calendário de Torneios
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentTab('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-on-surface-variant)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
                >
                  Sobre a Noble Deck
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-headline)',
                marginBottom: '16px',
              }}
            >
              Links Rápidos
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', cursor: 'pointer' }}>
                  Termos de Uso
                </span>
              </li>
              <li>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', cursor: 'pointer' }}>
                  Política de Privacidade
                </span>
              </li>
              <li>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', cursor: 'pointer' }}>
                  Contato & Suporte
                </span>
              </li>
              <li>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', cursor: 'pointer' }}>
                  FAQ & Perguntas Frequentes
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-headline)',
                marginBottom: '16px',
              }}
            >
              Card Games
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="badge badge-purple">Pokémon TCG</span>
              <span className="badge badge-pink">Magic: The Gathering</span>
              <span className="badge badge-yellow">Yu-Gi-Oh!</span>
              <span className="badge badge-muted">One Piece Card Game</span>
            </div>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--color-on-surface-variant)',
                marginTop: '16px',
              }}
            >
              Arena oficial de torneios sancionados e loja especializada.
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--nav-border)',
            paddingTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            © 2026 Noble Deck - Todos os direitos reservados.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'rgba(205, 195, 212, 0.6)',
            }}
          >
            Desenvolvido com React + TypeScript & FastAPI
          </p>
        </div>
      </div>
    </footer>
  );
};
