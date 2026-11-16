import React from 'react';
import {
  ArrowUpRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  User,
} from 'lucide-react';
import nobleLogo from '../assets/noble-logo.png';
import pokemonLogo from '../assets/games/pokemon.png';
import magicLogo from '../assets/games/magic.png';
import yugiohLogo from '../assets/games/yugioh.png';
import onepieceLogo from '../assets/games/onepiece.png';
import { FooterHoloHorizon } from './FooterHoloHorizon';
import { useApp, type NavigationTab } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import type { GameId } from '../types';

const FOOTER_UNIVERSES: Array<{
  id: GameId;
  name: string;
  subtitle: string;
  logo: string;
}> = [
    {
      id: 'pokemon',
      name: 'Pokémon TCG',
      subtitle: 'Singles ex, Alt Arts e boosters',
      logo: pokemonLogo,
    },
    {
      id: 'magic',
      name: 'Magic: The Gathering',
      subtitle: 'Commander, míticas e staples',
      logo: magicLogo,
    },
    {
      id: 'yugioh',
      name: 'Yu-Gi-Oh!',
      subtitle: 'Extradeck, monstros e duelos',
      logo: yugiohLogo,
    },
    {
      id: 'onepiece',
      name: 'One Piece',
      subtitle: 'Líderes e cartas secretas',
      logo: onepieceLogo,
    },
  ];

export const Footer: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    setSelectedGameFilter,
    setIsCartOpen,
    cartItemsCount,
    currentUser,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    scrollToTop();
  };

  const handleSelectGame = (game: GameId | 'all') => {
    setSelectedGameFilter(game);
    setCurrentTab('products');
    scrollToTop();
  };

  const handleAccountAction = () => {
    if (currentUser.id > 0) {
      handleNavigateTab('dashboard');
      return;
    }
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const firstName = currentUser.nome ? currentUser.nome.trim().split(' ')[0] : '';

  return (
    <footer className="noble-footer-root">
      <FooterHoloHorizon isLight={isLight} />

      <div className="landing-band-wide noble-footer-inner">
        <div className="noble-footer-top-grid">
          {/* Coluna 1: Identidade da marca e loja física */}
          <div className="noble-footer-brand-col">
            <div className="noble-footer-brand-head">
              <img
                src={nobleLogo}
                alt="Noble Deck Logo"
                style={{ width: '38px', height: '38px', objectFit: 'contain' }}
              />
              <span className="noble-footer-brand-name">Noble Deck</span>
            </div>

            <p className="noble-footer-brand-copy">
              Curadoria e gerenciamento de Trading Card Games em São Paulo. Singles avaliadas,
              boosters selados e mesas abertas para jogadores e colecionadores.
            </p>

            <div className="noble-footer-arena-meta">
              <div className="noble-footer-arena-row">
                <MapPin size={15} />
                <span>Av. Paulista, 1800, Conj. 42, Bela Vista - São Paulo / SP</span>
              </div>
              <div className="noble-footer-arena-row">
                <Clock size={15} />
                <span>Terça a Sábado: 11h às 22h | Domingos: 10h às 19h</span>
              </div>
              <div className="noble-footer-arena-row">
                <Phone size={15} />
                <span>(11) 3456-7890</span>
              </div>
              <div className="noble-footer-arena-row">
                <Mail size={15} />
                <a href="mailto:contato@nobledeck.com.br" className="noble-footer-mailto">
                  contato@nobledeck.com.br
                </a>
              </div>
            </div>
          </div>

          {/* Coluna 2: Navegação e utilidades reais (sem links mortos) */}
          <div className="noble-footer-nav-col">
            <h4 className="noble-footer-col-heading">Navegação</h4>
            <ul className="noble-footer-nav-list">
              <li>
                <button
                  type="button"
                  onClick={() => handleNavigateTab('home')}
                  className={`noble-footer-nav-btn${currentTab === 'home' ? ' is-active' : ''}`}
                >
                  <span>Início</span>
                  <ArrowUpRight size={15} />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectGame('all')}
                  className={`noble-footer-nav-btn${currentTab === 'products' ? ' is-active' : ''}`}
                >
                  <span>Catálogo de Produtos</span>
                  <ArrowUpRight size={15} />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavigateTab('about')}
                  className={`noble-footer-nav-btn${currentTab === 'about' ? ' is-active' : ''}`}
                >
                  <span>Sobre a Noble Deck</span>
                  <ArrowUpRight size={15} />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="noble-footer-nav-btn"
                >
                  <span className="noble-footer-nav-btn-left">
                    <ShoppingBag size={15} />
                    <span>Abrir Carrinho</span>
                  </span>
                  {cartItemsCount > 0 ? (
                    <span className="noble-footer-cart-count">{cartItemsCount}</span>
                  ) : (
                    <ArrowUpRight size={15} />
                  )}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleAccountAction}
                  className={`noble-footer-nav-btn${currentTab === 'dashboard' ? ' is-active' : ''}`}
                >
                  <span className="noble-footer-nav-btn-left">
                    <User size={15} />
                    <span>{currentUser.id > 0 ? `Conta de ${firstName}` : 'Entrar ou Cadastrar'}</span>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Universos TCG interativos ocupando a largura direita */}
          <div className="noble-footer-universes-col">
            <h4 className="noble-footer-col-heading">Universos TCG</h4>
            <div className="noble-footer-universes-grid">
              {FOOTER_UNIVERSES.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSelectGame(game.id)}
                  className="noble-footer-game-card"
                >
                  <div className="noble-footer-game-left">
                    <div className="noble-footer-game-logo-box">
                      <img src={game.logo} alt={game.name} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span className="noble-footer-game-title">{game.name}</span>
                      <span className="noble-footer-game-sub">{game.subtitle}</span>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="noble-footer-game-arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="noble-footer-colophon">
          <span>© 2026 Noble Deck. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
};
