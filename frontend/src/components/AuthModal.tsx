import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X } from 'lucide-react';
import type { UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    loginUser,
  } = useApp();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('cliente');

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setNome('');
    setEmail('');
    setSenha('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginUser(nome || email.split('@')[0], email, selectedRole);
    handleClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 25px 50px var(--shadow-color), 0 0 40px var(--glow-color)',
          padding: '32px',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface-container-low)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--nav-border)',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => setAuthModalMode('login')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: authModalMode === 'login' ? 'var(--color-primary-container)' : 'transparent',
              color: authModalMode === 'login' ? '#ffffff' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-nav)',
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
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: authModalMode === 'register' ? 'var(--color-primary-container)' : 'transparent',
              color: authModalMode === 'register' ? '#ffffff' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-nav)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Criar Conta
          </button>
        </div>

        <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-headline)', marginBottom: '6px' }}>
          {authModalMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta Noble Deck'}
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '20px',
          }}
        >
          {authModalMode === 'login'
            ? 'Acesse para gerenciar seus pedidos e inscrições.'
            : 'Junte-se à maior comunidade de card games e colecionáveis.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {authModalMode === 'register' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-outline)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                Nome Completo
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Pedro Henrique"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-on-surface)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-outline)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              E-mail
            </label>
            <input
              type="email"
              required
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-on-surface)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-outline)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              required
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-on-surface)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginTop: '18px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-outline)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Tipo de Acesso (Perfil para Demonstração)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(['cliente', 'funcionario', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border:
                      selectedRole === role
                        ? '1px solid var(--color-primary)'
                        : '1px solid var(--nav-border)',
                    backgroundColor:
                      selectedRole === role ? 'var(--badge-purple-bg)' : 'var(--color-surface-container-low)',
                    color: selectedRole === role ? 'var(--badge-purple-text)' : 'var(--color-on-surface-variant)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '14px' }}
          >
            {authModalMode === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
};
