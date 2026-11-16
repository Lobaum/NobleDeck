import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { api, formatBRL } from '../services/api';
import type { Order } from '../types';

interface AccountProfilePanelProps {
  personalOrders?: Order[];
  showPersonalOrders?: boolean;
  onBrowseCatalog?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpfMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCepMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function getOrderBadgeTone(status: Order['status'], isLight: boolean) {
  if (status === 'Finalizado') {
    return isLight
      ? { text: '#166534', bg: 'rgba(22, 163, 74, 0.10)', border: 'rgba(22, 163, 74, 0.34)' }
      : { text: '#4ade80', bg: 'rgba(34, 197, 94, 0.14)', border: 'rgba(74, 222, 128, 0.32)' };
  }
  if (status === 'Cancelado') {
    return isLight
      ? { text: '#b91c1c', bg: 'rgba(220, 38, 38, 0.09)', border: 'rgba(220, 38, 38, 0.32)' }
      : { text: '#f87171', bg: 'rgba(239, 68, 68, 0.14)', border: 'rgba(248, 113, 113, 0.32)' };
  }
  if (status === 'Enviado') {
    return isLight
      ? { text: '#0369a1', bg: 'rgba(2, 132, 199, 0.10)', border: 'rgba(2, 132, 199, 0.32)' }
      : { text: '#38bdf8', bg: 'rgba(14, 165, 233, 0.14)', border: 'rgba(56, 189, 248, 0.32)' };
  }
  if (status === 'Processando') {
    return isLight
      ? { text: '#92400e', bg: 'rgba(217, 119, 6, 0.11)', border: 'rgba(217, 119, 6, 0.36)' }
      : { text: '#fbbf24', bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(251, 191, 36, 0.32)' };
  }
  return isLight
    ? { text: '#9a3412', bg: 'rgba(234, 88, 12, 0.10)', border: 'rgba(234, 88, 12, 0.32)' }
    : { text: '#fb923c', bg: 'rgba(249, 115, 22, 0.14)', border: 'rgba(251, 146, 60, 0.32)' };
}

export const AccountProfilePanel: React.FC<AccountProfilePanelProps> = ({
  personalOrders = [],
  showPersonalOrders = false,
  onBrowseCatalog,
}) => {
  const { currentUser, updateOwnProfile, showToast } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Dados Pessoais
  const [nome, setNome] = useState(currentUser.nome || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [telefone, setTelefone] = useState(formatPhoneMask(currentUser.telefone || ''));
  const [cpf, setCpf] = useState(formatCpfMask(currentUser.cpf || ''));
  const [cep, setCep] = useState(formatCepMask(currentUser.cep || ''));
  const [endereco, setEndereco] = useState(currentUser.endereco || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);

  // Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    setNome(currentUser.nome || '');
    setEmail(currentUser.email || '');
    setTelefone(formatPhoneMask(currentUser.telefone || ''));
    setCpf(formatCpfMask(currentUser.cpf || ''));
    setCep(formatCepMask(currentUser.cep || ''));
    setEndereco(currentUser.endereco || '');
  }, [
    currentUser.id,
    currentUser.nome,
    currentUser.email,
    currentUser.telefone,
    currentUser.cpf,
    currentUser.cep,
    currentUser.endereco,
  ]);

  const isProfileDirty = useMemo(() => {
    return (
      nome.trim() !== (currentUser.nome || '').trim() ||
      email.trim().toLowerCase() !== (currentUser.email || '').trim().toLowerCase() ||
      telefone.trim() !== formatPhoneMask(currentUser.telefone || '').trim() ||
      cpf.trim() !== formatCpfMask(currentUser.cpf || '').trim() ||
      cep.trim() !== formatCepMask(currentUser.cep || '').trim() ||
      endereco.trim() !== (currentUser.endereco || '').trim()
    );
  }, [nome, email, telefone, cpf, cep, endereco, currentUser]);

  const handleResetProfile = () => {
    setNome(currentUser.nome || '');
    setEmail(currentUser.email || '');
    setTelefone(formatPhoneMask(currentUser.telefone || ''));
    setCpf(formatCpfMask(currentUser.cpf || ''));
    setCep(formatCepMask(currentUser.cep || ''));
    setEndereco(currentUser.endereco || '');
  };

  const handleLookupCep = async () => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      showToast('Informe um CEP com 8 dígitos para buscar o endereço.');
      return;
    }
    setIsLookingUpCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error('Falha na consulta de CEP.');
      const data = await res.json();
      if (data?.erro) {
        showToast('CEP não encontrado nos Correios.');
        return;
      }
      const composed = [
        data.logradouro,
        data.bairro ? `- ${data.bairro}` : '',
        data.localidade && data.uf ? `, ${data.localidade}/${data.uf}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+,/g, ',')
        .trim();
      if (composed) {
        setEndereco(composed);
        showToast('Endereço preenchido a partir do CEP.');
      }
    } catch {
      showToast('Não foi possível consultar o CEP automaticamente agora.');
    } finally {
      setIsLookingUpCep(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;

    const cleanName = nome.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cpfDigits = cpf.replace(/\D/g, '');
    const cepDigits = cep.replace(/\D/g, '');

    if (!cleanName) {
      showToast('Informe seu nome completo.');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      showToast('Informe um endereço de e-mail válido.');
      return;
    }
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      showToast('CPF inválido. Preencha 11 dígitos ou deixe em branco.');
      return;
    }
    if (cepDigits.length > 0 && cepDigits.length !== 8) {
      showToast('CEP inválido. Preencha 8 dígitos ou deixe em branco.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateOwnProfile({
        nome: cleanName,
        email: cleanEmail,
        telefone: telefone.trim(),
        cpf: cpf.trim(),
        cep: cep.trim(),
        endereco: endereco.trim(),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingPassword) return;

    if (!currentPassword.trim()) {
      showToast('Informe sua senha atual para confirmar a alteração.');
      return;
    }
    if (newPassword.trim().length < 8) {
      showToast('A nova senha deve possuir pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('A confirmação da nova senha não confere.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.alterarSenhaUsuario(currentUser.id, newPassword.trim(), currentPassword);
      showToast('Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Não foi possível atualizar a senha.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const accentText = isLight ? '#7A4B00' : '#FFC400';

  return (
    <div className={`account-panel-layout ${showPersonalOrders ? 'has-orders-column' : ''}`}>
      {/* Coluna Principal: Dados Pessoais + Segurança */}
      <div className="account-forms-stack">
        {/* Card 1: Dados Pessoais & E-mail */}
        <section className="staff-panel-box">
          <div className="staff-section-header">
            <div>
              <h2>Dados Pessoais & Contato</h2>
              <p>Atualize seu nome, e-mail de acesso e informações de entrega da sua conta.</p>
            </div>
            {currentUser.cargo && (
              <span className="staff-cargo-tag">
                {currentUser.cargo}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="account-form-grid">
            <div className="account-field account-field-span2">
              <label className="account-label" htmlFor="account-nome">
                <User size={13} /> Nome Completo
              </label>
              <input
                id="account-nome"
                type="text"
                className="system-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="account-field">
              <label className="account-label" htmlFor="account-email">
                <Mail size={13} /> E-mail de Acesso
              </label>
              <input
                id="account-email"
                type="email"
                className="system-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </div>

            <div className="account-field">
              <label className="account-label" htmlFor="account-telefone">
                <Phone size={13} /> Telefone / WhatsApp
              </label>
              <input
                id="account-telefone"
                type="tel"
                className="system-input"
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneMask(e.target.value))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="account-field">
              <label className="account-label" htmlFor="account-cpf">
                <CreditCard size={13} /> CPF
              </label>
              <input
                id="account-cpf"
                type="text"
                inputMode="numeric"
                className="system-input"
                value={cpf}
                onChange={(e) => setCpf(formatCpfMask(e.target.value))}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="account-field">
              <label className="account-label" htmlFor="account-cep">
                <MapPin size={13} /> CEP
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="account-cep"
                  type="text"
                  inputMode="numeric"
                  className="system-input"
                  value={cep}
                  onChange={(e) => setCep(formatCepMask(e.target.value))}
                  placeholder="00000-000"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleLookupCep}
                  disabled={isLookingUpCep}
                  className="btn-outline"
                  style={{ padding: '0 12px', borderRadius: '8px', whiteSpace: 'nowrap', fontSize: '12px' }}
                  title="Buscar endereço pelo CEP"
                >
                  <Search size={13} />
                  <span>{isLookingUpCep ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </div>
            </div>

            <div className="account-field account-field-span2">
              <label className="account-label" htmlFor="account-endereco">
                <MapPin size={13} /> Endereço Principal
              </label>
              <input
                id="account-endereco"
                type="text"
                className="system-input"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, complemento, bairro e cidade/UF"
              />
            </div>

            <div className="account-form-footer account-field-span2">
              {isProfileDirty ? (
                <button
                  type="button"
                  onClick={handleResetProfile}
                  className="btn-outline"
                  style={{ padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px' }}
                >
                  <RotateCcw size={14} /> Descartar
                </button>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                  Dados sincronizados com sua conta.
                </span>
              )}

              <button
                type="submit"
                disabled={isSavingProfile || !isProfileDirty}
                className="btn-primary"
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  opacity: isSavingProfile || !isProfileDirty ? 0.55 : 1,
                }}
              >
                <Save size={14} />
                <span>{isSavingProfile ? 'Salvando...' : 'Salvar Dados'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Card 2: Segurança & Senha */}
        <section className="staff-panel-box">
          <div className="staff-section-header">
            <div>
              <h2>Segurança & Senha</h2>
              <p>Altere sua senha de acesso sempre que desejar manter sua conta protegida.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              className="btn-outline"
              style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}
            >
              {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showPasswords ? 'Ocultar' : 'Mostrar'}</span>
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="account-form-grid">
            <div className="account-field account-field-span2">
              <label className="account-label" htmlFor="account-current-password">
                <Lock size={13} /> Senha Atual
              </label>
              <input
                id="account-current-password"
                type={showPasswords ? 'text' : 'password'}
                className="system-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                required
              />
            </div>

            <div className="account-field">
              <label className="account-label" htmlFor="account-new-password">
                <Key size={13} /> Nova Senha (mín. 8 caracteres)
              </label>
              <input
                id="account-new-password"
                type={showPasswords ? 'text' : 'password'}
                className="system-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>

            <div className="account-field">
              <label className="account-label" htmlFor="account-confirm-password">
                <Check size={13} /> Confirmar Nova Senha
              </label>
              <input
                id="account-confirm-password"
                type={showPasswords ? 'text' : 'password'}
                className="system-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
              />
            </div>

            <div className="account-form-footer account-field-span2">
              <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                Use ao menos 8 caracteres combinando letras e números.
              </span>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="btn-primary"
                style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px' }}
              >
                <Key size={14} />
                <span>{isUpdatingPassword ? 'Atualizando...' : 'Atualizar Senha'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Coluna Lateral (Opcional para Equipe e Admin): Minhas Compras Pessoais */}
      {showPersonalOrders && (
        <aside className="staff-panel-box">
          <div className="staff-section-header">
            <div>
              <h2>Minhas Compras Pessoais ({personalOrders.length})</h2>
              <p>Pedidos realizados por você na loja usando esta conta.</p>
            </div>
          </div>

          {personalOrders.length === 0 ? (
            <div className="staff-empty-state" style={{ padding: '32px 16px' }}>
              <ShoppingBag size={30} style={{ opacity: 0.5 }} />
              <h3>Nenhuma compra pessoal registrada</h3>
              <p>Seus pedidos pessoais realizados no catálogo da loja aparecerão aqui.</p>
              {onBrowseCatalog && (
                <button
                  type="button"
                  onClick={onBrowseCatalog}
                  className="btn-outline"
                  style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px', marginTop: '4px' }}
                >
                  Explorar Catálogo
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {personalOrders.map((po) => {
                const st = getOrderBadgeTone(po.status, isLight);
                return (
                  <div key={po.id_pedido} className="account-personal-order-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong className="font-mono" style={{ fontSize: '13.5px', color: 'var(--color-headline)' }}>
                          Pedido #{po.numero || po.id_pedido}
                        </strong>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: st.bg,
                            border: `1px solid ${st.border}`,
                            color: st.text,
                          }}
                        >
                          {po.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                        {po.data} • {po.itens.length} item(ns)
                        {po.codigo_rastreio ? ` • Rastreio: ${po.codigo_rastreio}` : ''}
                      </span>
                    </div>
                    <span className="font-mono" style={{ fontWeight: 800, fontSize: '14px', color: accentText }}>
                      R$ {formatBRL(po.valor_total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
