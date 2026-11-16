import React, { useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  Clock,
  Layers,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Users,
} from 'lucide-react';
import AboutArenaWebGL from '../components/AboutArenaWebGL';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import type { GameId } from '../types';
import pokemonLogo from '../assets/games/pokemon.png';
import magicLogo from '../assets/games/magic.png';
import yugiohLogo from '../assets/games/yugioh.png';
import onepieceLogo from '../assets/games/onepiece.png';

const FAQS = [
  {
    q: 'Os produtos vendidos na Noble Deck são originais e selados?',
    a: 'Sim, 100% dos produtos comercializados são oficiais, lacrados de fábrica pelas distribuidoras autorizadas (Copag, Wizards of the Coast, Konami e Bandai).',
  },
  {
    q: 'Como funciona o envio e a segurança das cartas?',
    a: 'Todas as cartas são enviadas com sleeves de proteção, toploaders rígidos e embalagens reforçadas para garantir que cheguem em perfeito estado até você.',
  },
  {
    q: 'A loja compra ou avalia cartas avulsas?',
    a: 'Sim! Possuímos um balcão de avaliação presencial para singles em estados Near Mint e Slightly Played para crédito em loja ou pagamento direto.',
  },
  {
    q: 'Quais as formas de entrega disponíveis?',
    a: 'Oferecemos retirada imediata e gratuita na nossa loja física ou envio rastreado para todo o Brasil via Correios (SEDEX/PAC) e transportadoras parceiras.',
  },
] as const;

const UNIVERSES: ReadonlyArray<{ id: GameId; label: string; logo: string }> = [
  { id: 'pokemon', label: 'Pokémon TCG', logo: pokemonLogo },
  { id: 'magic', label: 'Magic', logo: magicLogo },
  { id: 'yugioh', label: 'Yu-Gi-Oh!', logo: yugiohLogo },
  { id: 'onepiece', label: 'One Piece', logo: onepieceLogo },
];

const PILLAR_LEDGER = [
  {
    icon: PackageCheck,
    tag: 'ENVIO BLINDADO',
    title: 'Proteção em sleeve e toploader rígido',
    desc: 'Cada carta avulsa sai da nossa mesa acondicionada em sleeve, toploader estruturado e embalagem anti-impacto para chegar exatamente como foi catalogada.',
  },
  {
    icon: Users,
    tag: 'MESAS ABERTAS',
    title: 'Comunidade presencial na Bela Vista',
    desc: 'Espaço diário para partidas casuais de Pokémon TCG, mesas amistosas de Commander e testes de decks competitivos de One Piece e Yu-Gi-Oh!.',
  },
  {
    icon: Layers,
    tag: 'BALCÃO & ACERVO',
    title: 'Estoque próprio sincronizado e avaliação justa',
    desc: 'Compre do inventário real da loja ou traga suas singles Near Mint e Slightly Played ao balcão presencial para troca em crédito ou negociação direta.',
  },
] as const;

export const AboutPage: React.FC = () => {
  const { theme } = useTheme();
  const { setCurrentTab, setSelectedGameFilter } = useApp();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const isLight = theme === 'light';

  const handleOpenUniverse = (universeId: GameId | 'all') => {
    setSelectedGameFilter(universeId);
    setCurrentTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="about-page-shell">
      {/* Banda 1: Manifesto Editorial + Palco Espacial WebGL (12 cols assimétricas) */}
      <section className="about-hero-band">
        <div className="landing-band-wide">
          <div className="about-hero-grid">
            <div className="about-hero-copy">
              <p className="about-eyebrow">SOBRE A NOBLE DECK</p>
              <h1 className="about-hero-title">
                A mesa definitiva para colecionar e jogar TCG em São Paulo.
              </h1>
              <p className="about-hero-lead">
                Nascemos para unir colecionadores exigentes e jogadores de fim de semana em um
                espaço onde cada carta passa por inspeção real, o estoque reflete a prateleira e
                as mesas seguem abertas todos os dias.
              </p>

              <div className="about-facts-strip" aria-label="Destaques da loja física e curadoria">
                <div className="about-fact-cell">
                  <span className="about-fact-kicker">ENDEREÇO</span>
                  <strong>Av. Paulista, 1800</strong>
                </div>
                <div className="about-fact-cell">
                  <span className="about-fact-kicker">UNIVERSOS OFICIAIS</span>
                  <strong>Pokémon, Magic, Yu-Gi-Oh! e One Piece</strong>
                </div>
              </div>

              <div className="about-hero-actions">
                <button
                  type="button"
                  onClick={() => handleOpenUniverse('all')}
                  className="landing-btn-print"
                >
                  Explorar vitrine <ArrowUpRight size={17} />
                </button>
                <a href="#arena-paulista" className="landing-btn-print-secondary">
                  Visitar a Arena
                </a>
              </div>
            </div>

            <div className="about-hero-stage-col">
              <div className="about-stage-pedestal">
                <div className="about-stage-head">
                </div>
                <AboutArenaWebGL isLight={isLight} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="about-pillars-band">
        <div className="landing-band-wide">
          <div className="about-pillars-grid">
            <article className="about-anchor-card">
              <div className="about-anchor-top">
                <div className="about-anchor-icon">
                  <BadgeCheck size={24} />
                </div>
                <span className="about-anchor-code">CURADORIA VERIFICADA</span>
              </div>

              <h3>Autenticidade garantida nas quatro principais linhas do hobby</h3>
              <p>
                Trabalhamos exclusivamente com caixas lacradas de distribuidoras oficiais (Copag,
                Wizards of the Coast, Konami e Bandai) e cartas avulsas avaliadas manualmente em
                estado Near Mint ou Slightly Played.
              </p>

              <div className="about-universe-block">
                <span className="about-universe-caption">Filtrar estoque oficial por jogo:</span>
                <div className="about-universe-grid">
                  {UNIVERSES.map((uni) => (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => handleOpenUniverse(uni.id)}
                      className="about-universe-chip"
                    >
                      <img src={uni.logo} alt={uni.label} />
                      <span>{uni.label}</span>
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            </article>

            <div className="about-ledger-list">
              {PILLAR_LEDGER.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <article key={item.tag} className="about-ledger-row">
                    <div className="about-ledger-index">0{idx + 1}</div>
                    <div className="about-ledger-icon-wrap">
                      <Icon size={20} />
                    </div>
                    <div className="about-ledger-body">
                      <span className="about-ledger-tag">{item.tag}</span>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Banda 3: Arena na Avenida Paulista (7 cols Dados Presenciais / 5 cols Painel de Horários) */}
      <section id="arena-paulista" className="about-arena-band">
        <div className="landing-band-wide">
          <div className="about-arena-grid">
            <div className="about-arena-info">
              <h2>Visite nossa Arena na Avenida Paulista</h2>
              <p className="about-arena-intro">
                Entrada franca para mesas livres todos os dias de funcionamento. Traga seu playmat,
                teste decks de One Piece, prepare o seu Commander ou venha avaliar suas cartas
                avulsas no balcão presencial.
              </p>

              <div className="about-contact-grid">
                <div className="about-contact-row">
                  <div className="about-contact-icon">
                    <MapPin size={19} />
                  </div>
                  <div>
                    <span className="about-contact-label">ENDEREÇO</span>
                    <p className="about-contact-val">
                      Av. Paulista, 1800 - Conjunto 42, Bela Vista - São Paulo / SP
                    </p>
                  </div>
                </div>

                <div className="about-contact-row">
                  <div className="about-contact-icon">
                    <Phone size={19} />
                  </div>
                  <div>
                    <span className="about-contact-label">ATENDIMENTO</span>
                    <p className="about-contact-val">(11) 3456-7890</p>
                  </div>
                </div>

                <div className="about-contact-row">
                  <div className="about-contact-icon">
                    <Mail size={19} />
                  </div>
                  <div>
                    <span className="about-contact-label">E-MAIL DIRETO</span>
                    <a
                      href="mailto:contato@nobledeck.com.br"
                      className="about-contact-link"
                    >
                      contato@nobledeck.com.br
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <aside className="about-hours-panel" aria-label="Horários e políticas da arena">
              <div className="about-hours-head">
                <Clock size={20} />
                <h3>Horário de funcionamento</h3>
              </div>

              <dl className="about-hours-table">
                <div className="about-hours-row">
                  <dt>Terça a Sábado</dt>
                  <dd>11:00 às 22:00</dd>
                </div>
                <div className="about-hours-row">
                  <dt>Domingos</dt>
                  <dd>10:00 às 19:00</dd>
                </div>
                <div className="about-hours-row">
                  <dt>Segundas</dt>
                  <dd>Manutenção de estoque e curadoria</dd>
                </div>
              </dl>

              <div className="about-hours-callout">
                <strong>Retirada gratuita em balcão</strong>
                <p>
                  Pedidos finalizados no site ficam separados no mesmo dia para retirada sem frete
                  direto na Paulista.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenUniverse('all')}
                  className="about-hours-cta"
                >
                  Ver produtos em estoque <ArrowUpRight size={15} />
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Banda 4: Dúvidas Frequentes em Acordeão Interativo (4 cols Título / 8 cols Perguntas) */}
      <section className="about-faq-band">
        <div className="landing-band-wide">
          <div className="about-faq-layout">
            <div className="about-faq-sidebar">
              <h2>Perguntas frequentes</h2>
              <p>
                Detalhes sobre originalidade de fábrica, envio protegido em toploader, avaliação de
                singles e retirada presencial.
              </p>
              <a
                href="mailto:contato@nobledeck.com.br?subject=Duvida%20sobre%20a%20Noble%20Deck"
                className="landing-btn-print-secondary about-faq-contact-btn"
              >
                <Mail size={16} />
                Falar com a equipe
              </a>
            </div>

            <div className="about-faq-list" role="region" aria-label="Respostas frequentes">
              {FAQS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className={`about-faq-item ${isOpen ? 'is-open' : ''}`}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`about-faq-panel-${index}`}
                      id={`about-faq-trigger-${index}`}
                      onClick={() => handleToggleFaq(index)}
                      className="about-faq-trigger"
                    >
                      <span className="about-faq-num">0{index + 1}</span>
                      <span className="about-faq-question">{faq.q}</span>
                      <ChevronDown size={19} className="about-faq-chevron" />
                    </button>
                    {isOpen && (
                      <div
                        id={`about-faq-panel-${index}`}
                        role="region"
                        aria-labelledby={`about-faq-trigger-${index}`}
                        className="about-faq-answer"
                      >
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
