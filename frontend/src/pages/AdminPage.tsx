import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Users,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Trophy,
  Package,
  ShoppingBag,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Mail,
  Eye,
  EyeOff,
  Sliders,
  DollarSign,
  Key,
  X,
} from 'lucide-react';
import type { UserProfile, UserRole, Order } from '../types';
import { api } from '../services/api';

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    setCurrentTab,
    loginUser,
    logoutUser,
    switchRole,
    products,
    updateProductStock,
    tournaments,
    orders,
    updateOrderStatus,
    showToast,
  } = useApp();

  // Autenticação Admin
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Painel Admin
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'inventory' | 'tournaments' | 'orders'>('users');
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modal Equipe
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('funcionario');
  const [newUserCargo, setNewUserCargo] = useState('Atendente de Loja');

  // Modal senha admin
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Registro de Partidas
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [matchPlayer1, setMatchPlayer1] = useState('');
  const [matchPlayer2, setMatchPlayer2] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const [matchHistory, setMatchHistory] = useState<Array<{ id: number; torneioId: number; p1: string; p2: string; res: string; data: string }>>([]);

  const isAuthenticated = Boolean(currentUser.email) && currentUser.id !== 0;
  const isAdmin = isAuthenticated && currentUser.role === 'admin';

  // Carregar usuários
  const carregarUsuarios = async () => {
    setIsLoadingUsers(true);
    try {
      const dados = await api.obterUsuarios();
      if (Array.isArray(dados)) {
        setUserList(dados);
      } else {
        setUserList([]);
      }
    } catch {
      setUserList([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      carregarUsuarios();
    }
  }, [isAdmin]);

  // Login de Administrador
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      showToast('Por favor, informe o e-mail de administrador.');
      return;
    }
    if (!loginPassword.trim()) {
      showToast('Por favor, digite a senha.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const sucesso = await loginUser(
        loginEmail.includes('admin') ? 'Administrador Geral' : loginEmail.split('@')[0],
        loginEmail,
        'admin',
        loginPassword
      );

      if (sucesso) {
        // Garantir que a role ativa seja admin
        switchRole('admin');
        showToast('Autenticação autorizada! Bem-vindo ao Painel Administrativo.');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao autenticar administrador.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Alterar Cargo / Nível do Usuário
  const handlePromoteUser = async (user: UserProfile, newRole: UserRole) => {
    try {
      const novoCargo = newRole === 'admin' ? 'Administrador Geral' : newRole === 'funcionario' ? 'Atendente de Loja' : 'Cliente';
      await api.atualizarPerfilUsuario(user.id, newRole, novoCargo);
      showToast(`Permissão de "${user.nome}" alterada para ${newRole.toUpperCase()}!`);
    } catch {
      showToast(`Permissão de "${user.nome}" atualizada localmente para ${newRole.toUpperCase()}!`);
    }
    setUserList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole, cargo: newRole === 'admin' ? 'Administrador' : newRole === 'funcionario' ? 'Atendente' : 'Cliente' } : u))
    );
  };

  // Cadastrar Novo Membro
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    try {
      const criado = await api.cadastrarUsuario(newUserName.trim(), newUserEmail.trim(), newUserPassword.trim(), newUserRole);
      setUserList((prev) => [...prev, { ...criado, cargo: newUserCargo }]);
      showToast(`Novo ${newUserRole.toUpperCase()} cadastrado com sucesso!`);
      setIsNewUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (err: any) {
      showToast(err.message || 'Erro ao cadastrar usuário.');
    }
  };

  // Alterar Senha do Administrador
  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword.trim()) {
      showToast('Por favor, informe a nova senha.');
      return;
    }
    if (newAdminPassword.length < 4) {
      showToast('A senha deve possuir pelo menos 4 caracteres.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      showToast('A confirmação de senha não confere.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.alterarSenhaUsuario(currentUser.id, newAdminPassword.trim());
      showToast('Senha do Administrador atualizada com sucesso no banco!');
      setIsPasswordModalOpen(false);
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar senha.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Registrar Resultado de Partida de Torneio
  const handleRegisterMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId) {
      showToast('Selecione um torneio para registrar a partida.');
      return;
    }
    if (!matchPlayer1.trim() || !matchPlayer2.trim() || !matchResult.trim()) {
      showToast('Preencha os jogadores e o resultado do confronto.');
      return;
    }

    try {
      await api.registrarPartida(selectedTournamentId, matchPlayer1.trim(), matchPlayer2.trim(), matchResult.trim());
      showToast('Resultado de partida registrado oficialmente!');
    } catch {
      showToast('Resultado de partida salvo localmente!');
    }

    const novaPartida = {
      id: Date.now(),
      torneioId: selectedTournamentId,
      p1: matchPlayer1.trim(),
      p2: matchPlayer2.trim(),
      res: matchResult.trim(),
      data: new Date().toLocaleString('pt-BR'),
    };

    setMatchHistory((prev) => [novaPartida, ...prev]);
    setMatchPlayer1('');
    setMatchPlayer2('');
    setMatchResult('');
  };

  // Métricas
  const faturamentoTotal = orders
    .filter((o) => o.status !== 'Cancelado')
    .reduce((acc, o) => acc + o.valor_total, 0);
  const produtosCriticos = products.filter((p) => p.estoque <= 4);

  // 1. CASO NÃO AUTENTICADO: Tela de Login Administrativo
  if (!isAuthenticated) {
    return (
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }} className="admin-animate-fade">
        <div className="app-container" style={{ maxWidth: '480px' }}>
          <div className="admin-login-card">
            {/* Brilho de fundo radial suave */}
            <div className="access-denied-glow-bg" />

            {/* Cabeçalho elegante com badge e ícone halo */}
            <div className="admin-login-header-glow">
              <div className="admin-icon-halo">
                <Lock size={28} color="var(--color-primary)" />
              </div>
              <span className="access-denied-pill" style={{ marginBottom: '10px' }}>
                <span className="access-denied-status-dot" style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }} />
                Controle de Acesso
              </span>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--color-headline)',
                  fontFamily: 'var(--font-headline)',
                  letterSpacing: '-0.02em',
                  margin: '0 0 6px',
                }}
              >
                Portal Administrativo
              </h1>
              <p
                style={{
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '13px',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Autentique-se com credenciais autorizadas para gerenciar a loja
              </p>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              <div className="admin-field-group">
                <label className="admin-field-label">
                  E-mail institucional
                </label>
                <div className="admin-input-wrapper">
                  <input
                    type="email"
                    required
                    className="admin-modern-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@nobledeck.com"
                  />
                  <Mail size={16} className="admin-input-icon" />
                </div>
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">
                  Senha
                </label>
                <div className="admin-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="admin-modern-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Digite sua senha de acesso"
                  />
                  <Lock size={16} className="admin-input-icon" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="admin-toggle-eye-btn"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="admin-submit-btn"
              >
                <ShieldCheck size={17} />
                {isAuthenticating ? 'Validando Autorização...' : 'Entrar no Painel Admin'}
              </button>
            </form>

            <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-outline)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.2s ease',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-outline)')}
              >
                <ArrowLeft size={14} /> Voltar à Loja
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. CASO AUTENTICADO MAS NÃO É ADMIN (ex: Cliente ou Funcionário) -> 403 Forbidden
  if (!isAdmin) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }} className="admin-animate-fade">
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div className="access-denied-card">
            {/* Brilho de fundo radial suave */}
            <div className="access-denied-glow-bg" />

            {/* Ícone de escudo em badge elegante */}
            <div className="access-denied-icon-box">
              <ShieldAlert size={36} color="var(--color-primary)" />
            </div>

            {/* Pill tag estilizada */}
            <div>
              <span className="access-denied-pill">
                <span className="access-denied-status-dot" />
                Acesso Restrito • HTTP 403
              </span>
            </div>

            {/* Título de destaque com tipografia do sistema */}
            <h1
              style={{
                fontSize: '25px',
                fontWeight: 800,
                color: 'var(--color-headline)',
                fontFamily: 'var(--font-headline)',
                letterSpacing: '-0.02em',
                marginBottom: '10px',
              }}
            >
              Privilégios Insuficientes
            </h1>

            {/* Texto informativo com destaque sutil */}
            <p
              style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: '13.5px',
                lineHeight: 1.6,
                marginBottom: '26px',
                maxWidth: '410px',
                margin: '0 auto 26px',
              }}
            >
              Você está autenticado como <strong>{currentUser.nome}</strong> ({currentUser.email}), porém o seu perfil atual é{' '}
              <span
                style={{
                  display: 'inline-block',
                  color: 'var(--color-primary)',
                  backgroundColor: 'rgba(216, 185, 255, 0.12)',
                  border: '1px solid rgba(216, 185, 255, 0.25)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {currentUser.role}
              </span>
              . A aba <strong>/admin</strong> é restrita exclusivamente a administradores gerais.
            </p>

            {/* Ações primárias e secundárias */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={() => {
                  switchRole('admin');
                  showToast('Modo Administrador ativado com sucesso!');
                }}
                className="btn-secondary"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                <ShieldCheck size={16} /> Alternar para Administrador
              </button>

              <button
                type="button"
                onClick={() => {
                  logoutUser();
                  showToast('Sessão finalizada. Entre com sua credencial de administrador.');
                }}
                className="btn-outline"
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={15} /> Entrar com Outra Conta
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-outline)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  padding: '8px',
                  transition: 'color 0.2s ease',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-outline)')}
              >
                <ArrowLeft size={14} /> Voltar à Página Inicial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. CASO AUTENTICADO E É ADMIN -> Painel de Controle Geral do Administrador
  return (
    <div style={{ paddingTop: '32px', paddingBottom: '80px' }} className="admin-animate-fade">
      <div className="app-container">
        {/* Cabeçalho do Painel Admin */}
        <div
          className="glass-panel admin-header-box"
          style={{
            padding: '24px 28px',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '28px',
            border: '1px solid rgba(216, 185, 255, 0.2)',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4), 0 0 20px var(--glow-color)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(216, 185, 255, 0.12)',
                  border: '1px solid rgba(216, 185, 255, 0.3)',
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <ShieldCheck size={14} /> Administrador do Sistema (/admin)
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-headline)', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
              Painel de Gestão Geral
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', marginTop: '6px', margin: 0 }}>
              Conectado como: <strong>{currentUser.nome}</strong> ({currentUser.email}) • Acesso Total
            </p>
          </div>

          <div className="admin-actions-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="btn-outline"
              style={{
                padding: '9px 16px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: 'rgba(216, 185, 255, 0.35)',
                color: 'var(--color-primary)',
              }}
            >
              <Key size={14} /> Alterar Senha
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className="btn-outline"
              style={{ padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sliders size={14} /> Ver Painel Pessoal
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('home')}
              className="btn-outline"
              style={{ padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} /> Ir para a Loja
            </button>

            <button
              type="button"
              onClick={() => {
                logoutUser();
                setCurrentTab('home');
              }}
              style={{
                padding: '9px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>

        {/* Métricas Principais (KPIs) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div className="glass-panel admin-kpi-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Faturamento
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(74, 222, 128, 0.1)' }}>
                <DollarSign size={16} color="#4ade80" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
              R$ {faturamentoTotal.toFixed(2)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>Total de pedidos faturados</span>
          </div>

          <div className="glass-panel admin-kpi-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Pedidos
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(216, 185, 255, 0.1)' }}>
                <ShoppingBag size={16} color="var(--color-primary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              {orders.length}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>Cadastrados no sistema</span>
          </div>

          <div className="glass-panel admin-kpi-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Produtos
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(232, 179, 255, 0.1)' }}>
                <Package size={16} color="var(--color-secondary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              {products.length}
            </div>
            <span style={{ fontSize: '11px', color: produtosCriticos.length > 0 ? '#f87171' : 'var(--color-on-surface-variant)' }}>
              {produtosCriticos.length > 0 ? `${produtosCriticos.length} com estoque baixo!` : 'Estoque regular'}
            </span>
          </div>

          <div className="glass-panel admin-kpi-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Torneios
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 244, 191, 0.1)' }}>
                <Trophy size={16} color="var(--color-accent-yellow)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              {tournaments.length}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>Arenas e eventos ativos</span>
          </div>

          <div className="glass-panel admin-kpi-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Usuários
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(216, 185, 255, 0.1)' }}>
                <Users size={16} color="var(--color-primary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              {userList.length}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>Membros registrados</span>
          </div>
        </div>

        {/* Barra de Abas do Administrador */}
        <div
          className="admin-tabs-scroller"
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '28px',
            borderBottom: '1px solid var(--nav-border)',
            paddingBottom: '12px',
          }}
        >
          <button
            onClick={() => setActiveAdminTab('users')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeAdminTab === 'users' ? '1px solid rgba(216, 185, 255, 0.35)' : '1px solid transparent',
              backgroundColor: activeAdminTab === 'users' ? 'rgba(216, 185, 255, 0.14)' : 'transparent',
              color: activeAdminTab === 'users' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeAdminTab === 'users' ? '0 0 15px var(--glow-color)' : 'none',
            }}
          >
            <Users size={15} /> Gestão de Usuários & Equipe
          </button>

          <button
            onClick={() => setActiveAdminTab('inventory')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeAdminTab === 'inventory' ? '1px solid rgba(216, 185, 255, 0.35)' : '1px solid transparent',
              backgroundColor: activeAdminTab === 'inventory' ? 'rgba(216, 185, 255, 0.14)' : 'transparent',
              color: activeAdminTab === 'inventory' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeAdminTab === 'inventory' ? '0 0 15px var(--glow-color)' : 'none',
            }}
          >
            <Package size={15} /> Produtos & Estoque Crítico
          </button>

          <button
            onClick={() => setActiveAdminTab('tournaments')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeAdminTab === 'tournaments' ? '1px solid rgba(216, 185, 255, 0.35)' : '1px solid transparent',
              backgroundColor: activeAdminTab === 'tournaments' ? 'rgba(216, 185, 255, 0.14)' : 'transparent',
              color: activeAdminTab === 'tournaments' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeAdminTab === 'tournaments' ? '0 0 15px var(--glow-color)' : 'none',
            }}
          >
            <Trophy size={15} /> Torneios & Partidas
          </button>

          <button
            onClick={() => setActiveAdminTab('orders')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeAdminTab === 'orders' ? '1px solid rgba(216, 185, 255, 0.35)' : '1px solid transparent',
              backgroundColor: activeAdminTab === 'orders' ? 'rgba(216, 185, 255, 0.14)' : 'transparent',
              color: activeAdminTab === 'orders' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeAdminTab === 'orders' ? '0 0 15px var(--glow-color)' : 'none',
            }}
          >
            <ShoppingBag size={15} /> Todos os Pedidos ({orders.length})
          </button>
        </div>

        {/* CONTEÚDO DA ABA: USUÁRIOS E EQUIPE */}
        {activeAdminTab === 'users' && (
          <div className="glass-panel admin-animate-fade" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 700 }}>
                  Usuários e Equipe de Funcionários
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                  Controle as permissões de acesso, atribua cargos administrativos e gerencie membros.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={carregarUsuarios}
                  className="btn-outline"
                  style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={isLoadingUsers ? 'spin' : ''} /> Atualizar
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--grad-primary)',
                    boxShadow: '0 4px 15px var(--glow-color)',
                  }}
                >
                  <Plus size={14} /> Cadastrar Membro
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--color-outline)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 10px' }}>ID</th>
                    <th style={{ padding: '12px 10px' }}>Nome</th>
                    <th style={{ padding: '12px 10px' }}>E-mail</th>
                    <th style={{ padding: '12px 10px' }}>Perfil Atual</th>
                    <th style={{ padding: '12px 10px' }}>Cargo</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Ações Administrativas</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((user) => (
                    <tr key={user.id} className="admin-table-row" style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>#{user.id}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{user.nome}</td>
                      <td style={{ padding: '12px 10px', color: 'var(--color-on-surface-variant)' }}>{user.email}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            backgroundColor:
                              user.role === 'admin'
                                ? 'rgba(216, 185, 255, 0.18)'
                                : user.role === 'funcionario'
                                  ? 'rgba(250, 204, 21, 0.15)'
                                  : 'rgba(140, 86, 212, 0.12)',
                            color:
                              user.role === 'admin'
                                ? 'var(--color-primary)'
                                : user.role === 'funcionario'
                                  ? '#facc15'
                                  : 'var(--color-on-surface-variant)',
                            border: `1px solid ${user.role === 'admin'
                              ? 'rgba(216, 185, 255, 0.4)'
                              : user.role === 'funcionario'
                                ? 'rgba(250, 204, 21, 0.3)'
                                : 'rgba(140, 86, 212, 0.25)'
                              }`,
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--color-on-surface-variant)' }}>
                        {user.cargo || (user.role === 'admin' ? 'Administrador Geral' : user.role === 'funcionario' ? 'Atendente' : 'Cliente')}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {user.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handlePromoteUser(user, 'admin')}
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid rgba(216, 185, 255, 0.4)',
                                backgroundColor: 'rgba(216, 185, 255, 0.12)',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                              }}
                              title="Tornar Administrador"
                            >
                              + Admin
                            </button>
                          )}
                          {user.role !== 'funcionario' && (
                            <button
                              type="button"
                              onClick={() => handlePromoteUser(user, 'funcionario')}
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid rgba(250, 204, 21, 0.4)',
                                backgroundColor: 'rgba(250, 204, 21, 0.1)',
                                color: '#facc15',
                                cursor: 'pointer',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                              }}
                              title="Tornar Funcionário"
                            >
                              + Func
                            </button>
                          )}
                          {user.role !== 'cliente' && (
                            <button
                              type="button"
                              onClick={() => handlePromoteUser(user, 'cliente')}
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid var(--card-border)',
                                backgroundColor: 'transparent',
                                color: 'var(--color-outline)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Rebaixar para Cliente"
                            >
                              Cliente
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: PRODUTOS E ESTOQUE */}
        {activeAdminTab === 'inventory' && (
          <div>
            {produtosCriticos.length > 0 && (
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={20} color="#f87171" />
                <div>
                  <strong style={{ color: '#f87171', fontSize: '14px' }}>Alerta de Estoque Crítico!</strong>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                    Existem {produtosCriticos.length} produto(s) com estoque menor ou igual a 4 unidades requerendo reposição urgente.
                  </p>
                </div>
              </div>
            )}

            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', marginBottom: '16px' }}>
                Inventário Geral do Catálogo
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--color-outline)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px' }}>ID</th>
                      <th style={{ padding: '10px' }}>Produto</th>
                      <th style={{ padding: '10px' }}>Jogo</th>
                      <th style={{ padding: '10px' }}>Preço</th>
                      <th style={{ padding: '10px' }}>Estoque Atual</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Ajuste Rápido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const isLow = p.estoque <= 4;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>#{p.id}</td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{p.nome}</td>
                          <td style={{ padding: '10px' }}>
                            <span className="badge badge-muted">{p.jogoNome}</span>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                            R$ {p.preco.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color: isLow ? '#f87171' : 'var(--color-headline)',
                              }}
                            >
                              {p.estoque} un.
                            </span>
                            {isLow && (
                              <span style={{ marginLeft: '8px', fontSize: '10px', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>
                                (Baixo)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => updateProductStock(p.id, -1)}
                                disabled={p.estoque <= 0}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--card-border)',
                                  background: 'transparent',
                                  color: 'var(--color-on-surface)',
                                  cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Minus size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateProductStock(p.id, 1)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--card-border)',
                                  background: 'transparent',
                                  color: 'var(--color-on-surface)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: TORNEIOS E REGISTRO DE PARTIDAS */}
        {activeAdminTab === 'tournaments' && (
          <div className="admin-animate-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Formulário de Registro de Confronto / Partida */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Trophy size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 700 }}>
                  Registrar Resultado de Partida
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>
                Lance o confronto e o resultado oficial das partidas de eliminatórias ou suíço.
              </p>

              <form onSubmit={handleRegisterMatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Selecione o Torneio
                  </label>
                  <select
                    className="system-input"
                    value={selectedTournamentId || ''}
                    onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
                    style={{ fontSize: '13px' }}
                  >
                    <option value="">Selecione um torneio...</option>
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo} ({t.jogoNome})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Jogador 1 (Duelista A)
                    </label>
                    <input
                      type="text"
                      className="system-input"
                      placeholder="Ex: Pedro Henrique"
                      value={matchPlayer1}
                      onChange={(e) => setMatchPlayer1(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Jogador 2 (Duelista B)
                    </label>
                    <input
                      type="text"
                      className="system-input"
                      placeholder="Ex: Lucas Tadashi"
                      value={matchPlayer2}
                      onChange={(e) => setMatchPlayer2(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Resultado / Placar Oficial
                  </label>
                  <input
                    type="text"
                    className="system-input"
                    placeholder="Ex: Jogador 1 venceu 2x1"
                    value={matchResult}
                    onChange={(e) => setMatchResult(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'var(--grad-primary)',
                    boxShadow: '0 4px 15px var(--glow-color)',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle size={16} /> Salvar Resultado no Sistema
                </button>
              </form>
            </div>

            {/* Histórico das Partidas Registradas */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', marginBottom: '8px' }}>
                Classificação & Confrontos Recentes
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '16px' }}>
                Resultados computados e validados pela coordenação do torneio.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matchHistory.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-surface-container-low)',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>
                        {m.p1} <span style={{ color: 'var(--color-outline)' }}>vs</span> {m.p2}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                        {m.data}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={13} color="#4ade80" />
                      <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>{m.res}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: PEDIDOS GERAIS */}
        {activeAdminTab === 'orders' && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', marginBottom: '16px' }}>
              Gestão Centralizada de Pedidos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orders.map((o) => (
                <div
                  key={o.id_pedido}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-surface-container-low)',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: 'var(--color-headline)', marginRight: '10px' }}>
                      Pedido #{o.id_pedido}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                      {o.data} • Cliente: {o.cliente_nome} ({o.cliente_email})
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--color-outline)', marginTop: '4px' }}>
                      Itens: {o.itens.map((i) => `${i.quantidade}x ${i.produto.nome}`).join(', ')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                      R$ {o.valor_total.toFixed(2)}
                    </span>
                    <select
                      value={o.status}
                      onChange={(e) => updateOrderStatus(o.id_pedido, e.target.value as Order['status'])}
                      className="system-input"
                      style={{ padding: '6px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Processando">Processando</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal para Cadastrar Novo Membro */}
        {isNewUserModalOpen && (
          <div className="system-modal-overlay" onClick={() => setIsNewUserModalOpen(false)}>
            <div className="glass-panel system-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Gestão de Equipe</span>
                  <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                    Cadastrar Novo Membro
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-on-surface-variant)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  title="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '20px', lineHeight: 1.5 }}>
                Defina os dados cadastrais e o nível de acesso do colaborador no sistema.
              </p>

              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    className="system-input"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ex: Beatriz Lima"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    E-mail institucional
                  </label>
                  <input
                    type="email"
                    required
                    className="system-input"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="beatriz@nobledeck.com"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Senha Inicial
                  </label>
                  <input
                    type="password"
                    required
                    className="system-input"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="system-form-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Nível de Acesso
                    </label>
                    <select
                      className="system-input"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    >
                      <option value="funcionario">Funcionário</option>
                      <option value="admin">Administrador</option>
                      <option value="cliente">Cliente</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      className="system-input"
                      value={newUserCargo}
                      onChange={(e) => setNewUserCargo(e.target.value)}
                      placeholder="Ex: Atendente de Loja"
                    />
                  </div>
                </div>

                <div className="system-modal-actions">
                  <button
                    type="button"
                    onClick={() => setIsNewUserModalOpen(false)}
                    className="btn-outline"
                    style={{ padding: '10px 20px' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      padding: '10px 24px',
                      background: 'var(--grad-primary)',
                      boxShadow: '0 4px 15px var(--glow-color)',
                      fontWeight: 700,
                    }}
                  >
                    Salvar Colaborador
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Alterar Senha do Administrador */}
        {isPasswordModalOpen && (
          <div className="system-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
            <div className="glass-panel system-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Segurança</span>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-headline)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={18} color="var(--color-primary)" /> Alterar Senha de Admin
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-on-surface-variant)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  title="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                Altere a credencial de segurança da conta <strong>{currentUser.email}</strong> diretamente no banco de dados.
              </p>

              <form onSubmit={handleAlterarSenha} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    className="system-input"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    className="system-input"
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                </div>

                <div className="system-modal-actions">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="btn-outline"
                    style={{ padding: '10px 20px' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="btn-primary"
                    style={{
                      padding: '10px 24px',
                      background: 'var(--grad-primary)',
                      boxShadow: '0 4px 15px var(--glow-color)',
                      fontWeight: 700,
                    }}
                  >
                    {isUpdatingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
