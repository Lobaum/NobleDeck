import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NOBLE_LOGO } from '../data/mockData';
import { ShoppingBag, Menu, X, Shield, User, LogOut } from 'lucide-react';
import type { UserRole } from '../types';
import { CurtainThemeToggle } from './CurtainThemeToggle';

export const Navbar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    cartItemsCount,
    setIsCartOpen,
    currentUser,
    switchRole,
    setIsAuthModalOpen,
    setAuthModalMode,
    logoutUser,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const handleNavClick = (tab: any) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'cliente', label: 'Cliente', desc: 'Comprar, ver pedidos e torneios' },
    { role: 'funcionario', label: 'Funcionário', desc: 'Estoque, produtos e torneios' },
    { role: 'admin', label: 'Administrador', desc: 'Gestão completa do sistema' },
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        zIndex: 50,
        backgroundColor: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--nav-border)',
        boxShadow: '0 10px 30px var(--glow-color)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <div
        className="app-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <div
          onClick={() => handleNavClick('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <img
            src={NOBLE_LOGO}
            alt="Noble Deck Logo"
            style={{ width: '42px', height: '42px', objectFit: 'contain' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-nav)',
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Noble Deck
          </span>
        </div>

        {/* Links */}
        <nav
          style={{
            display: 'none',
            gap: '32px',
            alignItems: 'center',
          }}
          className="desktop-nav"
        >
          <button
            onClick={() => handleNavClick('home')}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-nav)',
              fontSize: '15px',
              fontWeight: currentTab === 'home' ? 600 : 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              color: currentTab === 'home' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              borderBottom: currentTab === 'home' ? '2px solid var(--color-primary)' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            Início
          </button>
          <button
            onClick={() => handleNavClick('products')}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-nav)',
              fontSize: '15px',
              fontWeight: currentTab === 'products' ? 600 : 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              color: currentTab === 'products' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              borderBottom: currentTab === 'products' ? '2px solid var(--color-primary)' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            Produtos
          </button>
          <button
            onClick={() => handleNavClick('tournaments')}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-nav)',
              fontSize: '15px',
              fontWeight: currentTab === 'tournaments' ? 600 : 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              color: currentTab === 'tournaments' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              borderBottom: currentTab === 'tournaments' ? '2px solid var(--color-primary)' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            Torneios
          </button>
          <button
            onClick={() => handleNavClick('about')}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-nav)',
              fontSize: '15px',
              fontWeight: currentTab === 'about' ? 600 : 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              color: currentTab === 'about' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              borderBottom: currentTab === 'about' ? '2px solid var(--color-primary)' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            Sobre nós
          </button>
          <button
            onClick={() => handleNavClick('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-nav)',
              fontSize: '15px',
              fontWeight: currentTab === 'dashboard' ? 600 : 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              color: currentTab === 'dashboard' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              borderBottom: currentTab === 'dashboard' ? '2px solid var(--color-primary)' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={14} color="var(--color-secondary)" />
            Painel {currentUser.role !== 'cliente' && `(${currentUser.role})`}
          </button>
        </nav>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              title="Alternar perfil de teste (Cliente, Funcionário, Admin)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(216, 185, 255, 0.1)',
                border: '1px solid rgba(216, 185, 255, 0.25)',
                color: 'var(--color-primary)',
                padding: '7px 14px',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-nav)',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentUser.role === 'admin'
                      ? '#FFBEFB'
                      : currentUser.role === 'funcionario'
                      ? '#FFF4BF'
                      : '#8C56D4',
                }}
              />
              <span>{currentUser.role}</span>
            </button>

            {isRoleMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '240px',
                  backgroundColor: 'var(--color-surface-container-high)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--nav-border)',
                  boxShadow: '0 12px 30px var(--shadow-color)',
                  padding: '8px',
                  zIndex: 60,
                }}
              >
                <div
                  style={{
                    padding: '6px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-on-surface-variant)',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--nav-border)',
                    marginBottom: '6px',
                  }}
                >
                  Alternar Papel (Permissões)
                </div>
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      setIsRoleMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: currentUser.role === r.role ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: currentUser.role === r.role ? 'var(--color-primary)' : 'var(--color-on-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '13px', textTransform: 'capitalize' }}>
                      {r.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <CurtainThemeToggle buttonSize={42} />

          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              position: 'relative',
              background: 'var(--input-bg)',
              border: '1px solid var(--nav-border)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-primary)',
              transition: 'all 0.2s ease',
            }}
            title="Abrir carrinho"
          >
            <ShoppingBag size={18} />
            {cartItemsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--color-primary-container)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(140, 86, 212, 0.8)',
                }}
              >
                {cartItemsCount}
              </span>
            )}
          </button>

          {currentUser.email ? (
            <div style={{ display: 'none', alignItems: 'center', gap: '8px' }} className="desktop-nav">
              <button
                onClick={() => handleNavClick('dashboard')}
                className="btn-outline"
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-nav)',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                <User size={14} />
                <span>{currentUser.nome.split(' ')[0]}</span>
              </button>
              <button
                onClick={logoutUser}
                title="Sair da conta"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-on-surface-variant)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'none', gap: '10px' }} className="desktop-nav">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="btn-outline"
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-nav)',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-nav)',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Criar conta
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-on-surface)',
              cursor: 'pointer',
              display: 'none',
              padding: '6px',
            }}
            className="mobile-hamburger"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-surface-container)',
            borderBottom: '1px solid var(--nav-border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 30px var(--shadow-color)',
          }}
        >
          <button
            onClick={() => handleNavClick('home')}
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: currentTab === 'home' ? 'var(--color-primary)' : 'var(--color-on-surface)',
              fontFamily: 'var(--font-nav)',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Início
          </button>
          <button
            onClick={() => handleNavClick('products')}
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: currentTab === 'products' ? 'var(--color-primary)' : 'var(--color-on-surface)',
              fontFamily: 'var(--font-nav)',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Produtos
          </button>
          <button
            onClick={() => handleNavClick('tournaments')}
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: currentTab === 'tournaments' ? 'var(--color-primary)' : 'var(--color-on-surface)',
              fontFamily: 'var(--font-nav)',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Torneios
          </button>
          <button
            onClick={() => handleNavClick('about')}
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: currentTab === 'about' ? 'var(--color-primary)' : 'var(--color-on-surface)',
              fontFamily: 'var(--font-nav)',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Sobre nós
          </button>
          <button
            onClick={() => handleNavClick('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: currentTab === 'dashboard' ? 'var(--color-primary)' : 'var(--color-on-surface)',
              fontFamily: 'var(--font-nav)',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Painel de Gerenciamento ({currentUser.role})
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 4px 4px 4px',
              borderTop: '1px solid var(--nav-border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-nav)',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-on-surface)',
              }}
            >
              Aparência do Sistema
            </span>
            <CurtainThemeToggle variant="labeled" buttonSize={38} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="btn-outline"
              style={{ flex: 1 }}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setAuthModalMode('register');
                setIsAuthModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              Criar conta
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 860px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-hamburger {
            display: none !important;
          }
        }
        @media (max-width: 859px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
};
