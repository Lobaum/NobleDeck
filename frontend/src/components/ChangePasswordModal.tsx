import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { SystemModal } from './SystemModal';
import type { UserProfile } from '../types';

interface ChangePasswordModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  onClose,
  showToast,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-on-surface-variant)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.05em',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;

    if (!currentPassword.trim()) {
      showToast('Informe sua senha atual para confirmar a alteração.');
      return;
    }
    if (newPassword.trim().length < 8) {
      showToast('A nova senha deve possuir pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('A confirmação de senha não confere.');
      return;
    }

    setIsUpdating(true);
    try {
      await api.alterarSenhaUsuario(currentUser.id, newPassword.trim(), currentPassword);
      showToast('Senha da conta atualizada com sucesso!');
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar senha.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SystemModal onClose={onClose} maxWidth="460px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <span
            className="badge badge-primary"
            style={{ marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Lock size={11} /> Segurança da Conta
          </span>
          <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Alterar Senha de Acesso
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal de senha"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div
        style={{
          padding: '10px 14px',
          borderRadius: '10px',
          backgroundColor: isLight ? 'rgba(217, 119, 6, 0.10)' : 'rgba(245, 158, 11, 0.12)',
          border: isLight ? '1px solid rgba(217, 119, 6, 0.34)' : '1px solid rgba(251, 191, 36, 0.34)',
          color: isLight ? '#92400e' : '#fbbf24',
          fontSize: '12.5px',
          lineHeight: 1.45,
          marginBottom: '16px',
        }}
      >
        Alteração aplicada exclusivamente à conta conectada:{' '}
        <strong>
          {currentUser.nome} ({currentUser.email})
        </strong>
        .
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label htmlFor="pwd-modal-current" style={labelStyle}>
            Senha Atual *
          </label>
          <input
            id="pwd-modal-current"
            type={showPasswords ? 'text' : 'password'}
            required
            className="system-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div>
          <label htmlFor="pwd-modal-new" style={labelStyle}>
            Nova Senha *
          </label>
          <input
            id="pwd-modal-new"
            type={showPasswords ? 'text' : 'password'}
            required
            minLength={8}
            className="system-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="pwd-modal-confirm" style={labelStyle}>
            Confirmar Nova Senha *
          </label>
          <input
            id="pwd-modal-confirm"
            type={showPasswords ? 'text' : 'password'}
            required
            minLength={8}
            className="system-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            autoComplete="new-password"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowPasswords((prev) => !prev)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            padding: '2px 0',
            color: 'var(--color-on-surface-variant)',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{showPasswords ? 'Ocultar senhas digitadas' : 'Mostrar senhas digitadas'}</span>
        </button>

        <div className="system-modal-actions">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancelar
          </button>
          <button type="submit" disabled={isUpdating} className="btn-primary">
            {isUpdating ? 'Atualizando...' : 'Salvar Nova Senha'}
          </button>
        </div>
      </form>
    </SystemModal>
  );
};
