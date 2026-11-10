import React from 'react';
import { ShieldCheck, Users, Star, MapPin, Clock, Phone, Mail, HelpCircle } from 'lucide-react';
import nobleLogo from '../assets/noble-logo.png';

export const AboutPage: React.FC = () => {
  const faqs = [
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
  ];

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="app-container">
        {/* Hero */}
        <div style={{ maxWidth: '720px', marginBottom: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <img src={nobleLogo} alt="Noble Deck" style={{ width: '38px', height: '38px' }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Sobre o Noble Deck
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontFamily: 'var(--font-headline)',
              lineHeight: 1.15,
              marginBottom: '20px',
            }}
          >
            A casa definitiva para os amantes de Trading Card Games.
          </h1>

          <p
            style={{
              fontSize: '18px',
              color: 'var(--color-on-surface-variant)',
              lineHeight: 1.6,
            }}
          >
            O Noble Deck nasceu para unir colecionadores e jogadores em uma experiência
            sofisticada, tecnológica e acolhedora. Da busca pelo próximo card secreto à construção
            da coleção dos seus sonhos, nosso compromisso é com a qualidade.
          </p>
        </div>

        {/* Pilares */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
            marginBottom: '60px',
          }}
        >
          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
            <ShieldCheck size={32} color="var(--color-primary)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Autenticidade Garantida</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              Rigoroso controle contra falsificações. Todas as caixas seladas e singles passam por inspeção óptica minuciosa.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
            <Users size={32} color="var(--color-accent-pink)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Comunidade Apaixonada</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              Espaço acolhedor para troca de cards, dicas de montagem de coleções e conexão com outros entusiastas de TCG.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
            <Star size={32} color="var(--color-accent-yellow)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>The Rare Holographic</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              Acervo de cartas raras, foils promocionais e edições de colecionador em sleeves e toploaders de alta densidade.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
            <Clock size={32} color="var(--color-secondary)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Gerenciamento Integrado</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              Estoque sincronizado em tempo real, pedidos transparentes e inscrições instantâneas desenvolvidas sob medida.
            </p>
          </div>
        </div>

        {/* Localização */}
        <div
          className="glass-panel"
          style={{
            padding: '36px',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '60px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Visite nossa Arena
            </span>
            <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>Localização & Horários</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MapPin size={18} color="var(--color-primary)" />
                <span>Av. Paulista, 1800 - Conjunto 42, Bela Vista - São Paulo / SP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={18} color="var(--color-secondary)" />
                <span>Terça a Sábado: 11:00 às 22:00 | Domingos: 10:00 às 19:00</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone size={18} color="var(--color-accent-yellow)" />
                <span>(11) 3456-7890 • WhatsApp da Loja</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={18} color="var(--color-accent-pink)" />
                <span>contato@nobledeck.com.br</span>
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-surface-container-low)',
              border: '1px solid var(--card-border)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h4 style={{ fontSize: '18px', marginBottom: '10px' }}>Espaço para Jogadores Livres</h4>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
              Mesas abertas todos os dias para partidas amistosas de Commander, duelos casuais de Pokémon e testes de decks de One Piece. Traga seu playmat e seus amigos!
            </p>
            <span className="badge badge-purple" style={{ alignSelf: 'flex-start' }}>
              Entrada Franca para Mesas Livres
            </span>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>Perguntas Frequentes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="glass-panel"
                style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                  <HelpCircle size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{faq.q}</h4>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, paddingLeft: '28px' }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
