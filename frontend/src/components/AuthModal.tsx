import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
} from 'lucide-react';

import charizardImg from '../assets/cards/charizard-vmax.png';
import blackLotusImg from '../assets/cards/black-lotus.jpg';
import blueEyesImg from '../assets/cards/blue-eyes.jpg';
import luffyImg from '../assets/cards/luffy-op05-119.png';
import logoImg from '../assets/noble-logo.png';

interface Slide {
  id: number;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  image: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    tag: 'Pokémon TCG',
    tagColor: '#FFCB05',
    title: 'Torneios Semanais & Ligas Oficiais',
    description:
      'Dispute batalhas presenciais, ganhe premiações exclusivas e suba no ranking da comunidade.',
    image: charizardImg,
  },
  {
    id: 2,
    tag: 'Magic: The Gathering',
    tagColor: '#DC95FF',
    title: 'Singles Raras & Colecionáveis',
    description:
      'Encontre cartas lendárias e boosters lacrados com procedência garantida e estoque atualizado.',
    image: blackLotusImg,
  },
  {
    id: 3,
    tag: 'Yu-Gi-Oh!',
    tagColor: '#60A5FA',
    title: 'A Maior Arena Competitiva',
    description:
      'Cadastre seus decks, participe de eliminatórias no formato Suíço e enfrente os melhores duelistas.',
    image: blueEyesImg,
  },
  {
    id: 4,
    tag: 'One Piece Card Game',
    tagColor: '#F87171',
    title: 'A Nova Era dos Card Games',
    description:
      'Junte-se a milhares de jogadores e colecionadores na plataforma definitiva da Noble Deck.',
    image: luffyImg,
  },
];

const formatarTelefone = (valor: string): string => {
  let digitos = valor.replace(/\D/g, '');
  if (digitos.startsWith('55') && digitos.length > 11) {
    digitos = digitos.slice(2);
  }
  digitos = digitos.slice(0, 11);

  if (!digitos) return '';
  if (digitos.length <= 2) {
    return `(${digitos}`;
  }
  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
};

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    loginUser,
    showToast,
  } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthModalOpen || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isAuthModalOpen, isPaused]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setNome('');
    setEmail('');
    setSenha('');
    setTelefone('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authModalMode === 'register' && !nome.trim()) {
      showToast('Por favor, preencha o seu nome completo.');
      return;
    }

    if (!email.trim()) {
      showToast('Por favor, preencha o seu e-mail.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('Por favor, insira um e-mail válido.');
      return;
    }

    if (!senha.trim()) {
      showToast('Por favor, preencha a sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const sucesso = await loginUser(
        nome || email.split('@')[0],
        email,
        'cliente',
        senha,
        telefone
      );
      if (sucesso) {
        handleClose();
      }
    } finally {
      setIsLoading(false);
    }
  };


  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out forwards',
      }}
    >
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: isLight ? 'rgba(25, 18, 36, 0.45)' : 'rgba(10, 8, 14, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'background-color 0.3s ease',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '960px',
          height: '660px',
          maxHeight: '92vh',
          backgroundColor: isLight ? '#ffffff' : '#151219',
          borderRadius: '24px',
          border: isLight ? '1px solid rgba(115, 55, 189, 0.18)' : '1px solid rgba(216, 185, 255, 0.15)',
          boxShadow: isLight
            ? '0 25px 60px -15px rgba(50, 20, 80, 0.18), 0 0 40px -10px rgba(140, 86, 212, 0.12)'
            : '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px -10px rgba(140, 86, 212, 0.25)',
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          overflow: 'hidden',
          zIndex: 10,
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
        className="auth-modal-card"
      >
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: '#0c0a0f',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '32px',
            borderRight: isLight ? '1px solid rgba(115, 55, 189, 0.12)' : 'none',
          }}
          className="auth-slider-column"
        >
          {/* Imagens */}
          {SLIDES.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={slide.id}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${slide.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transform: isActive ? 'scale(1.04)' : 'scale(1)',
                    transition: 'transform 6s ease-out',
                    filter: 'brightness(0.72) contrast(1.1)',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, #100d14 0%, rgba(16, 13, 20, 0.75) 45%, rgba(16, 13, 20, 0.2) 100%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 80% 20%, rgba(140, 86, 212, 0.3) 0%, transparent 60%)',
                  }}
                />
              </div>
            );
          })}

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(21, 18, 25, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(216, 185, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
            >
              <img src={logoImg} alt="Noble Deck" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-headline, sans-serif)',
                fontWeight: 700,
                fontSize: '15px',
                color: '#ffffff',
                letterSpacing: '0.04em',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
            >
              NOBLE DECK
            </span>
          </div>

          {/* Botões de Navegação */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '16px',
              right: '16px',
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'space-between',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Slide anterior"
              style={{
                pointerEvents: 'auto',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(21, 18, 25, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-container)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(21, 18, 25, 0.65)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Próximo slide"
              style={{
                pointerEvents: 'auto',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(21, 18, 25, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-container)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(21, 18, 25, 0.65)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Rodapé */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '100px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: SLIDES[currentSlide].tagColor,
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              <Gamepad2 size={13} />
              {SLIDES[currentSlide].tag}
            </div>

            <h2
              style={{
                fontSize: '22px',
                fontFamily: 'var(--font-headline, sans-serif)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.25,
                marginBottom: '8px',
                textShadow: '0 2px 10px rgba(0,0,0,0.7)',
              }}
            >
              {SLIDES[currentSlide].title}
            </h2>

            <p
              style={{
                fontSize: '13px',
                color: '#cdc3d4',
                lineHeight: 1.5,
                marginBottom: '20px',
                maxWidth: '92%',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              {SLIDES[currentSlide].description}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {SLIDES.map((_, idx) => {
                const isSelected = idx === currentSlide;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Ir para slide ${idx + 1}`}
                    style={{
                      height: '6px',
                      width: isSelected ? '28px' : '6px',
                      borderRadius: '100px',
                      backgroundColor: isSelected ? 'var(--color-primary, #d8b9ff)' : 'rgba(255, 255, 255, 0.28)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected ? '0 0 10px var(--color-primary)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            height: '100%',
            overflowY: 'auto',
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: isLight ? '#ffffff' : '#151219',
            transition: 'background-color 0.3s ease',
          }}
          className="auth-form-column"
        >
          {/* Botão de Fechar */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: isLight ? 'rgba(115, 55, 189, 0.08)' : 'rgba(255, 255, 255, 0.05)',
              border: isLight ? '1px solid rgba(115, 55, 189, 0.15)' : '1px solid rgba(255, 255, 255, 0.08)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLight ? '#564c64' : 'var(--color-on-surface-variant)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isLight
                ? 'rgba(115, 55, 189, 0.16)'
                : 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.color = isLight ? '#1a1424' : '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isLight
                ? 'rgba(115, 55, 189, 0.08)'
                : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = isLight ? '#564c64' : 'var(--color-on-surface-variant)';
            }}
          >
            <X size={16} />
          </button>

          <div>
            <div
              style={{
                display: 'flex',
                backgroundColor: isLight ? '#f3ecf8' : '#1e1a22',
                padding: '4px',
                borderRadius: '12px',
                border: isLight ? '1px solid rgba(115, 55, 189, 0.15)' : '1px solid rgba(216, 185, 255, 0.1)',
                marginBottom: '20px',
                maxWidth: '280px',
              }}
            >
              <button
                type="button"
                onClick={() => setAuthModalMode('login')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: authModalMode === 'login' ? 'var(--color-primary-container)' : 'transparent',
                  color: authModalMode === 'login' ? '#ffffff' : isLight ? '#564c64' : 'var(--color-on-surface-variant)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setAuthModalMode('register')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: authModalMode === 'register' ? 'var(--color-primary-container)' : 'transparent',
                  color: authModalMode === 'register' ? '#ffffff' : isLight ? '#564c64' : 'var(--color-on-surface-variant)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Criar Conta
              </button>
            </div>

            {/* Cabeçalho */}
            <h1
              style={{
                fontSize: '24px',
                fontFamily: 'var(--font-headline, sans-serif)',
                fontWeight: 700,
                color: isLight ? '#1a1424' : '#ffffff',
                marginBottom: '4px',
              }}
            >
              {authModalMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: isLight ? '#564c64' : 'var(--color-on-surface-variant)',
                marginBottom: '18px',
              }}
            >
              {authModalMode === 'login'
                ? 'Informe suas credenciais para gerenciar seus pedidos e torneios.'
                : 'Cadastre-se para colecionar, duelar e comprar na Noble Deck.'}
            </p>

            {/* Formulário */}
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Nome (se registro) */}
              {authModalMode === 'register' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: isLight ? '#564c64' : 'var(--color-outline)',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Nome Completo
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: isLight ? '#7c708c' : 'var(--color-outline)',
                      }}
                    />
                    <input
                      type="text"
                      className="system-input"
                      placeholder="Ex: Pedro Henrique"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      style={{
                        paddingLeft: '36px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: isLight ? '#564c64' : 'var(--color-outline)',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  E-mail
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isLight ? '#7c708c' : 'var(--color-outline)',
                    }}
                  />
                  <input
                    type="email"
                    className="system-input"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      paddingLeft: '36px',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: isLight ? '#564c64' : 'var(--color-outline)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Senha
                  </label>
                  {authModalMode === 'login' && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                      }}
                      onClick={() => alert('Entre em contato com o suporte para redefinir sua senha.')}
                    >
                      Esqueceu a senha?
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isLight ? '#7c708c' : 'var(--color-outline)',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="system-input"
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    style={{
                      paddingLeft: '36px',
                      paddingRight: '38px',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: isLight ? '#7c708c' : 'var(--color-outline)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {authModalMode === 'register' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: isLight ? '#564c64' : 'var(--color-outline)',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Telefone (Opcional)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: isLight ? '#7c708c' : 'var(--color-outline)',
                      }}
                    />
                    <input
                      type="tel"
                      className="system-input"
                      placeholder="(18) 99123-4567"
                      maxLength={15}
                      value={telefone}
                      onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                      style={{
                        paddingLeft: '36px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8c56d4 0%, #6b298d 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(140, 86, 212, 0.35)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(140, 86, 212, 0.55)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(140, 86, 212, 0.35)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isLoading ? (
                  'Processando...'
                ) : authModalMode === 'login' ? (
                  'Entrar no Sistema'
                ) : (
                  'Finalizar Cadastro'
                )}
              </button>
            </form>
          </div>
          <div
            style={{
              paddingTop: '16px',
              borderTop: isLight ? '1px solid rgba(115, 55, 189, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
              fontSize: '12px',
              color: isLight ? '#564c64' : 'var(--color-on-surface-variant)',
            }}
          >
            {authModalMode === 'login' ? (
              <span>
                Não possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setAuthModalMode('register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Cadastre-se gratuitamente
                </button>
              </span>
            ) : (
              <span>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setAuthModalMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Faça login
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
