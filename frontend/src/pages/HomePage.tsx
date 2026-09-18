import React from 'react';
import { useApp } from '../context/AppContext';
import { HeroZoomSlider, type ZoomCardItem } from '../components/HeroZoomSlider';
import {
  ArrowRight,
  Trophy,
  Swords,
  Calendar,
  Star,
} from 'lucide-react';
import type { GameId } from '../types';

import charizardImg from '../assets/cards/charizard-vmax.png';
import blackLotusImg from '../assets/cards/black-lotus.jpg';
import blueEyesImg from '../assets/cards/blue-eyes.jpg';
import luffyImg from '../assets/cards/luffy-op05-119.png';
import moonbreonImg from '../assets/cards/moonbreon.png';
import theOneRingImg from '../assets/cards/the-one-ring.jpg';
import darkMagicianImg from '../assets/cards/dark-magician.jpg';
import shanksImg from '../assets/cards/shanks-op01-120.png';

import pokemonLogo from '../assets/games/pokemon.png';
import magicLogo from '../assets/games/magic.png';
import yugiohLogo from '../assets/games/yugioh.png';
import onepieceLogo from '../assets/games/onepiece.png';

const HERO_SLIDER_CARDS: ZoomCardItem[] = [
  {
    id: 1,
    number: '01',
    name: 'Charizard VMAX Shiny',
    rarity: 'Shiny Vault • SV107/SV122',
    rarityColor: '#F59E0B',
    game: 'Pokémon TCG',
    image: charizardImg,
    description:
      'O cobiçado Charizard VMAX Gigantamax Shiny em chamas negras da coleção Destinos Brilhantes (Shining Fates).',
    badge: 'Shiny Vault',
    productId: 1,
  },
  {
    id: 2,
    number: '02',
    name: 'Black Lotus',
    rarity: 'Power Nine • Limited Edition Alpha',
    rarityColor: '#DC95FF',
    game: 'Magic: The Gathering',
    image: blackLotusImg,
    description:
      'O artefato mais lendário e valioso de toda a história dos TCGs, peça central do sagrado Power Nine.',
    badge: 'Alpha 1993',
    productId: 5,
  },
  {
    id: 3,
    number: '03',
    name: 'Dragão Branco de Olhos Azuis',
    rarity: 'Ultra Rare • LOB-001',
    rarityColor: '#60A5FA',
    game: 'Yu-Gi-Oh!',
    image: blueEyesImg,
    description:
      'O lendário dragão de 3000 ATK de Seto Kaiba, o monstro mais emblemático da história de Yu-Gi-Oh!.',
    badge: 'Lendário LOB',
    productId: 3,
  },
  {
    id: 4,
    number: '04',
    name: 'Monkey D. Luffy (Gear 5)',
    rarity: 'Manga Secret Rare • OP-05',
    rarityColor: '#EF4444',
    game: 'One Piece TCG',
    image: luffyImg,
    description:
      'Luffy no auge do Gear 5 com arte original de mangá desenhada por Eiichiro Oda. O Santo Graal de One Piece.',
    badge: 'Manga Secret',
    productId: 4,
  },
  {
    id: 5,
    number: '05',
    name: 'Umbreon VMAX (Moonbreon)',
    rarity: 'Alternate Art Secret • 215/203',
    rarityColor: '#A78BFA',
    game: 'Pokémon TCG',
    image: moonbreonImg,
    description:
      'A icônica "Moonbreon" sob a lua cheia da coleção Céus Evolutivos (Evolving Skies), um dos maiores troféus modernos.',
    badge: 'Grail Alt Art',
    productId: 1,
  },
  {
    id: 6,
    number: '06',
    name: 'The One Ring (O Um Anel)',
    rarity: 'Mythic Rare • The Lord of the Rings',
    rarityColor: '#FBBF24',
    game: 'Magic: The Gathering',
    image: theOneRingImg,
    description:
      'O Um Anel forjado nas chamas de Mordor. A lendária carta de Senhor dos Anéis que chocou o mercado mundial.',
    badge: 'Anel de Poder',
    productId: 2,
  },
  {
    id: 7,
    number: '07',
    name: 'Mago Negro (Dark Magician)',
    rarity: 'Ultra Rare • Yugi Mágico',
    rarityColor: '#818CF8',
    game: 'Yu-Gi-Oh!',
    image: darkMagicianImg,
    description:
      'O fiel guardião e carta assinatura de Yugi Muto, o supremo conjurador de feitiços de Yu-Gi-Oh!.',
    badge: 'Assinatura Yugi',
    productId: 3,
  },
  {
    id: 8,
    number: '08',
    name: 'Shanks (Manga Rare)',
    rarity: 'Manga Secret • Romance Dawn OP-01',
    rarityColor: '#F43F5E',
    game: 'One Piece TCG',
    image: shanksImg,
    description:
      'O Yonkou Shanks entregando o chapéu de palha com fundo de mangá em acabamento holográfico premium.',
    badge: 'Yonkou Shanks',
    productId: 4,
  },
];

export const HomePage: React.FC = () => {
  const {
    setCurrentTab,
    setSelectedGameFilter,
    products,
    tournaments,
    setSelectedProductForModal,
    setSelectedTournamentForModal,
    addToCart,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useApp();

  const handleGameSelect = (game: GameId) => {
    setSelectedGameFilter(game);
    setCurrentTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const featuredProducts = products.filter((p) => p.isDestaque).slice(0, 4);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: '120px',
          right: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(140, 86, 212, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '450px',
          left: '2%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220, 149, 255, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Hero */}
      <section
        className="app-container"
        style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '60px',
          paddingBottom: '80px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '60px',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div style={{ maxWidth: '580px' }}>

            <h1
              className="glow-text"
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                lineHeight: 1.15,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                marginBottom: '24px',
              }}
            >
              Seu próximo <span className="text-gradient">card raro</span> está esperando por você.
            </h1>

            <p
              style={{
                fontSize: '18px',
                lineHeight: 1.6,
                color: 'var(--color-on-surface-variant)',
                marginBottom: '36px',
              }}
            >
              Explore cartas, boosters, decks e acessórios dos principais universos de Trading
              Card Games. Monte sua coleção, descubra novos produtos e participe dos torneios da
              Noble Deck.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <button
                onClick={() => {
                  setSelectedGameFilter('all');
                  setCurrentTab('products');
                }}
                className="btn-primary"
                style={{ padding: '16px 32px' }}
              >
                <span>Explorar produtos</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => {
                  setCurrentTab('tournaments');
                }}
                className="btn-secondary"
                style={{ padding: '16px 32px' }}
              >
                <span>Ver torneios</span>
                <Trophy size={18} />
              </button>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '520px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroZoomSlider cards={HERO_SLIDER_CARDS} />
          </div>
        </div>
      </section>

      {/* Jogos */}
      <section
        style={{
          padding: '80px 0',
          borderTop: '1px solid var(--nav-border)',
          position: 'relative',
        }}
      >
        <div className="app-container">
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-headline)' }}>
              Encontre o seu jogo
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
            }}
          >
            <div
              onClick={() => handleGameSelect('pokemon')}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-container-low)',
                  border: '1px solid var(--nav-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  padding: '8px',
                }}
              >
                <img
                  src={pokemonLogo}
                  alt="Pokémon TCG"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3
                style={{
                  fontSize: '20px',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-headline)',
                }}
              >
                Pokémon TCG
              </h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.5 }}>
                Monte seu baralho com seus Pokémon favoritos e batalhe para ser o melhor treinador.
              </p>
            </div>

            <div
              onClick={() => handleGameSelect('magic')}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-container-low)',
                  border: '1px solid var(--nav-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  padding: '8px',
                }}
              >
                <img
                  src={magicLogo}
                  alt="Magic: The Gathering"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3
                style={{
                  fontSize: '20px',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-headline)',
                }}
              >
                Magic: The Gathering
              </h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.5 }}>
                O pioneiro dos card games. Estratégia profunda, planos místicos e universos vastos.
              </p>
            </div>

            <div
              onClick={() => handleGameSelect('yugioh')}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-container-low)',
                  border: '1px solid var(--nav-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  padding: '6px',
                }}
              >
                <img
                  src={yugiohLogo}
                  alt="Yu-Gi-Oh!"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3
                style={{
                  fontSize: '20px',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-headline)',
                }}
              >
                Yu-Gi-Oh!
              </h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.5 }}>
                É hora do duelo! Combos rápidos, invocações e monstros poderosos te aguardam.
              </p>
            </div>

            <div
              onClick={() => handleGameSelect('onepiece')}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-container-low)',
                  border: '1px solid var(--nav-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  padding: '6px',
                }}
              >
                <img
                  src={onepieceLogo}
                  alt="One Piece"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <h3
                style={{
                  fontSize: '20px',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-headline)',
                }}
              >
                One Piece
              </h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.5 }}>
                Reúna sua tripulação, conquiste os mares e dispute a Grand Line neste TCG dinâmico.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section style={{ padding: '80px 0' }}>
        <div className="app-container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-headline)' }}>
              Produtos em destaque
            </h2>
            <button
              onClick={() => {
                setSelectedGameFilter('all');
                setCurrentTab('products');
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <span>Ver todos os produtos</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '28px',
            }}
          >
            {featuredProducts.map((p) => (
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
                    height: '210px',
                    width: '100%',
                    padding: '20px',
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
                        top: '16px',
                        right: '16px',
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

                  {p.raridade === 'Raro' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        backgroundColor: 'var(--color-accent-yellow)',
                        color: '#151219',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        zIndex: 5,
                      }}
                    >
                      Raro
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
                    <p
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        marginBottom: '16px',
                      }}
                    >
                      R$ {p.preco.toFixed(2)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedProductForModal(p)}
                      className="btn-outline"
                      style={{ width: '100%', padding: '10px 0' }}
                    >
                      Ver produto
                    </button>
                    <button
                      onClick={() => addToCart(p)}
                      className="btn-primary"
                      style={{ padding: '10px 14px' }}
                      title="Adicionar ao carrinho"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Torneios */}
      <section
        style={{
          padding: '80px 0',
          borderTop: '1px solid var(--nav-border)',
          position: 'relative',
        }}
      >
        <div className="app-container">
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-headline)' }}>
              Próximos torneios
            </h2>
            <p
              style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: '16px',
                marginTop: '8px',
                maxWidth: '650px',
              }}
            >
              Junte-se à comunidade, teste suas habilidades e concorra a premiações exclusivas em
              nossos campeonatos oficiais.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tournaments.slice(0, 3).map((t) => {
              const isFull = t.vagasOcupadas >= t.vagasTotais;
              return (
                <div
                  key={t.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface-container-low)',
                        border: '1px solid var(--nav-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {t.jogo === 'magic' ? (
                        <Trophy size={28} color="var(--color-accent-pink)" />
                      ) : t.jogo === 'pokemon' ? (
                        <Swords size={28} color="var(--color-primary)" />
                      ) : (
                        <Star size={28} color="var(--color-accent-yellow)" />
                      )}
                    </div>

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '6px',
                        }}
                      >
                        <span className="badge badge-muted">{t.jogoNome}</span>
                        {t.isPremium && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--color-accent-yellow)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ★ Premium
                          </span>
                        )}
                      </div>

                      <h3
                        style={{
                          fontSize: '19px',
                          fontFamily: 'var(--font-headline)',
                          marginBottom: '4px',
                        }}
                      >
                        {t.titulo}
                      </h3>

                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-on-surface-variant)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Calendar size={14} />
                        <span>
                          {t.data} • {t.horario}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '24px',
                      marginLeft: 'auto',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--color-on-surface-variant)',
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: '2px',
                        }}
                      >
                        Vagas
                      </span>
                      {isFull ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '20px',
                              fontWeight: 700,
                              color: 'var(--color-error)',
                            }}
                          >
                            Lotação
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                            Máx
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '22px',
                              fontWeight: 700,
                              color: 'var(--color-headline)',
                            }}
                          >
                            {t.vagasOcupadas}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                            / {t.vagasTotais}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedTournamentForModal(t)}
                      className={isFull ? 'btn-outline' : 'btn-outline'}
                      disabled={isFull}
                      style={{
                        padding: '10px 22px',
                        minWidth: '130px',
                      }}
                    >
                      {isFull ? 'Esgotado' : 'Ver detalhes'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Banner */}
      <section style={{ padding: '60px 0 20px' }}>
        <div className="app-container">
          <div className="cta-banner">
            <div className="cta-banner-dots" />

            <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px', margin: '0 auto' }}>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '48px',
                  color: 'var(--color-primary)',
                  marginBottom: '20px',
                  display: 'inline-block',
                }}
              >
                view_carousel
              </span>

              <h2
                className="glow-text"
                style={{
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  lineHeight: 1.2,
                  marginBottom: '20px',
                }}
              >
                Monte sua coleção. <br />
                Entre na batalha.
              </h2>

              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--color-on-surface-variant)',
                  lineHeight: 1.6,
                  marginBottom: '36px',
                }}
              >
                Cadastre-se na Noble Deck e tenha acesso aos produtos, pedidos e torneios da nossa
                comunidade de card games.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '16px',
                }}
              >
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="btn-primary"
                  style={{ padding: '16px 36px' }}
                >
                  Criar minha conta
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="cta-banner-btn-secondary"
                >
                  Fazer login
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
