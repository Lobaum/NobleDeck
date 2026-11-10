import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Users,
  AlertTriangle,
  Plus,
  Minus,
  Package,
  ShoppingBag,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Mail,
  Eye,
  EyeOff,
  DollarSign,
  Key,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Trash2,
  Search,
  Layers,
  Boxes,
  AlertCircle,
  RotateCcw,
  Settings,
} from 'lucide-react';
import type { UserProfile, UserRole, Order, Product, GameId } from '../types';
import { api } from '../services/api';

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    setCurrentTab,
    loginUser,
    logoutUser,
    switchRole,
    products,
    reactivateProduct,
    removeProductPermanently,
    stockMovements,
    refreshStockMovements,
    registerStockEntry,
    registerStockExit,
    updateProductMinStock,
    orders,
    updateOrderStatus,
    showToast,
    showToastConfirm,
  } = useApp();

  // Autenticação Admin
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Painel Admin Abas Principais
  const [activeAdminTab, setActiveAdminTab] = useState<'inventory' | 'users' | 'orders'>('inventory');
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Sub-abas e Filtros de Estoque
  const [inventorySubTab, setInventorySubTab] = useState<'all' | 'critical' | 'movements' | 'inactive'>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryGameFilter, setInventoryGameFilter] = useState<GameId | 'all'>('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');

  // Modais de Gestão de Estoque
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isMinStockModalOpen, setIsMinStockModalOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null);
  const [stockAmountInput, setStockAmountInput] = useState('5');
  const [stockReasonInput, setStockReasonInput] = useState('');
  const [minStockValueInput, setMinStockValueInput] = useState('3');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Modal Equipe
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('funcionario');
  const [newUserCargo, setNewUserCargo] = useState('Atendente de Loja');

  // Modal Senha Admin
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);


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
      refreshStockMovements();
    }
  }, [isAdmin]);

  // Cálculos de Métricas
  const faturamentoTotal = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'Cancelado')
      .reduce((acc, o) => acc + (o.valor_total || 0), 0);
  }, [orders]);

  const activeProducts = useMemo(() => products.filter((p) => p.ativo !== false), [products]);
  const inactiveProducts = useMemo(() => products.filter((p) => p.ativo === false), [products]);

  const valorTotalEstoque = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + (p.preco || 0) * (p.estoque || 0), 0);
  }, [activeProducts]);

  const totalUnidadesEstoque = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + (p.estoque || 0), 0);
  }, [activeProducts]);

  const produtosCriticos = useMemo(() => {
    return activeProducts.filter((p) => p.estoque <= (p.estoqueMinimo ?? 3));
  }, [activeProducts]);

  // Filtragem de Produtos
  const filteredProducts = useMemo(() => {
    let list = inventorySubTab === 'critical' ? produtosCriticos : activeProducts;
    if (inventoryGameFilter !== 'all') {
      list = list.filter((p) => p.jogo === inventoryGameFilter);
    }
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.id.toString().includes(q) ||
          (p.categoria && p.categoria.toLowerCase().includes(q))
      );
    }
    return list;
  }, [inventorySubTab, produtosCriticos, activeProducts, inventoryGameFilter, inventorySearch]);

  // Filtragem de Inativos
  const filteredInactive = useMemo(() => {
    let list = inactiveProducts;
    if (inventoryGameFilter !== 'all') {
      list = list.filter((p) => p.jogo === inventoryGameFilter);
    }
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.id.toString().includes(q) ||
          (p.categoria && p.categoria.toLowerCase().includes(q))
      );
    }
    return list;
  }, [inactiveProducts, inventoryGameFilter, inventorySearch]);

  // Filtragem de Movimentações
  const filteredMovements = useMemo(() => {
    let list = stockMovements;
    if (movementTypeFilter !== 'all') {
      list = list.filter((m) => m.tipo === movementTypeFilter);
    }
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.produto_nome.toLowerCase().includes(q) ||
          m.produto_id.toString().includes(q) ||
          m.motivo.toLowerCase().includes(q) ||
          m.responsavel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stockMovements, movementTypeFilter, inventorySearch]);

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

  // Excluir Usuário
  const handleDeleteUser = (user: UserProfile) => {
    if (user.id === currentUser.id) {
      showToast('Você não pode excluir sua própria conta de administrador conectada.');
      return;
    }
    showToastConfirm({
      message: `Tem certeza que deseja excluir o cadastro de "${user.nome}" (${user.email})? Esta operação é irreversível.`,
      confirmText: 'Excluir Usuário',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await api.excluirUsuario(user.id);
          setUserList((prev) => prev.filter((u) => u.id !== user.id));
          showToast(`Usuário "${user.nome}" removido do sistema.`);
        } catch (err: any) {
          showToast(err.message || 'Erro ao excluir usuário.');
        }
      },
    });
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

  // Abertura dos Modais de Estoque
  const openEntryModal = (product?: Product) => {
    setSelectedStockProduct(product || (activeProducts.length > 0 ? activeProducts[0] : null));
    setStockAmountInput('5');
    setStockReasonInput('Reposição de Estoque / Compra Distribuidor');
    setIsEntryModalOpen(true);
  };

  const openExitModal = (product?: Product) => {
    setSelectedStockProduct(product || (activeProducts.length > 0 ? activeProducts[0] : null));
    setStockAmountInput('1');
    setStockReasonInput('Baixa Operacional / Avaria');
    setIsExitModalOpen(true);
  };

  const openMinStockModal = (product: Product) => {
    setSelectedStockProduct(product);
    setMinStockValueInput(String(product.estoqueMinimo ?? 3));
    setIsMinStockModalOpen(true);
  };

  // Submissão Entrada de Estoque
  const handleConfirmEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct) return;
    const qtd = parseInt(stockAmountInput, 10);
    if (isNaN(qtd) || qtd <= 0) {
      showToast('Por favor, informe uma quantidade válida maior que zero.');
      return;
    }
    setIsSubmittingStock(true);
    try {
      await registerStockEntry(
        selectedStockProduct.id,
        qtd,
        stockReasonInput.trim() || 'Entrada manual registrada pelo Administrador'
      );
      setIsEntryModalOpen(false);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Submissão Saída de Estoque
  const handleConfirmExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct) return;
    const qtd = parseInt(stockAmountInput, 10);
    if (isNaN(qtd) || qtd <= 0) {
      showToast('Por favor, informe uma quantidade válida maior que zero.');
      return;
    }
    if (qtd > selectedStockProduct.estoque) {
      showToast(`Estoque insuficiente! Saldo atual é de apenas ${selectedStockProduct.estoque} unidades.`);
      return;
    }
    setIsSubmittingStock(true);
    try {
      await registerStockExit(
        selectedStockProduct.id,
        qtd,
        stockReasonInput.trim() || 'Baixa operacional / Retirada do estoque'
      );
      setIsExitModalOpen(false);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Submissão Estoque Mínimo
  const handleConfirmMinStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct) return;
    const minVal = parseInt(minStockValueInput, 10);
    if (isNaN(minVal) || minVal < 0) {
      showToast('Por favor, informe um valor de estoque mínimo válido.');
      return;
    }
    setIsSubmittingStock(true);
    try {
      await updateProductMinStock(selectedStockProduct.id, minVal);
      setIsMinStockModalOpen(false);
    } finally {
      setIsSubmittingStock(false);
    }
  };


  // 1. CASO NÃO AUTENTICADO: Tela de Login Administrativo
  if (!isAuthenticated) {
    return (
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }} className="admin-animate-fade">
        <div className="app-container" style={{ maxWidth: '480px' }}>
          <div className="admin-login-card">
            <div className="access-denied-glow-bg" />
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

  // 2. CASO AUTENTICADO MAS NÃO É ADMIN -> 403 Forbidden
  if (!isAdmin) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }} className="admin-animate-fade">
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div className="access-denied-card">
            <div className="access-denied-glow-bg" />
            <div className="access-denied-icon-box">
              <ShieldAlert size={36} color="var(--color-primary)" />
            </div>

            <div>
              <span className="access-denied-pill">
                <span className="access-denied-status-dot" />
                Acesso Restrito • HTTP 403
              </span>
            </div>

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

        {/* Métricas Principais (KPIs Gerais) */}
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

          <div
            className="glass-panel admin-kpi-card"
            style={{ padding: '20px', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}
            onClick={() => setActiveAdminTab('inventory')}
            title="Ir para Gestão de Estoque"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Produtos em Catálogo
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(232, 179, 255, 0.1)' }}>
                <Package size={16} color="var(--color-secondary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              {activeProducts.length}
            </div>
            <span style={{ fontSize: '11px', color: produtosCriticos.length > 0 ? '#f87171' : 'var(--color-on-surface-variant)' }}>
              {produtosCriticos.length > 0 ? `${produtosCriticos.length} com estoque crítico!` : 'Estoque 100% regular'}
            </span>
          </div>

          <div
            className="glass-panel admin-kpi-card"
            style={{ padding: '20px', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}
            onClick={() => setActiveAdminTab('users')}
            title="Ir para Usuários"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                Equipe & Membros
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(216, 185, 255, 0.1)' }}>
                <Users size={16} color="var(--color-primary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              {userList.length}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>Colaboradores registrados</span>
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
            <Package size={15} /> Controle de Estoque
          </button>

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
            <Users size={15} /> Gestão de Usuários & Equipe ({userList.length})
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
            <ShoppingBag size={15} /> Pedidos ({orders.length})
          </button>
        </div>

        {/* =========================================================================
            ABA 1: REFORMULAÇÃO 100% COMPLETA DE ESTOQUE
           ========================================================================= */}
        {activeAdminTab === 'inventory' && (
          <div className="admin-animate-fade">
            {/* Header com Ações Rápidas */}
            <div
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                marginBottom: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={22} color="var(--color-primary)" />
                  <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                    Central de Gestão de Estoque
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                  Controle de movimentações de entrada e saída, gatilhos de segurança e histórico auditável de mercadorias.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => openEntryModal()}
                  className="btn-primary"
                  style={{
                    padding: '10px 18px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                    fontWeight: 700,
                  }}
                >
                  <ArrowUpCircle size={16} /> + Registrar Entrada
                </button>

                <button
                  type="button"
                  onClick={() => openExitModal()}
                  className="btn-outline"
                  style={{
                    padding: '10px 18px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    fontWeight: 700,
                  }}
                >
                  <ArrowDownCircle size={16} /> - Baixa Operacional
                </button>

                <button
                  type="button"
                  onClick={() => {
                    refreshStockMovements();
                    showToast('Histórico de estoque atualizado!');
                  }}
                  className="btn-outline"
                  style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Recarregar movimentações"
                >
                  <RefreshCw size={14} /> Atualizar
                </button>
              </div>
            </div>

            {/* 4 Cards de Métricas de Estoque */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(216, 185, 255, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Capital Imobilizado
                  </span>
                  <DollarSign size={16} color="var(--color-primary)" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
                  R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                  Valor total em inventário ativo
                </span>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--card-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Físico em Prateleira
                  </span>
                  <Boxes size={16} color="var(--color-headline)" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
                  {totalUnidadesEstoque} unidades
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                  Distribuídas em {activeProducts.length} itens ativos
                </span>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-lg)',
                  border: produtosCriticos.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--card-border)',
                  backgroundColor: produtosCriticos.length > 0 ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setInventorySubTab('critical')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: produtosCriticos.length > 0 ? '#f87171' : 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Nível de Reposição Crítico
                  </span>
                  <AlertTriangle size={16} color={produtosCriticos.length > 0 ? '#f87171' : '#4ade80'} />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: produtosCriticos.length > 0 ? '#f87171' : '#4ade80', fontFamily: 'var(--font-mono)' }}>
                  {produtosCriticos.length} produto{produtosCriticos.length === 1 ? '' : 's'}
                </div>
                <span style={{ fontSize: '11px', color: produtosCriticos.length > 0 ? '#fca5a5' : 'var(--color-on-surface-variant)' }}>
                  {produtosCriticos.length > 0 ? 'Abaixo do limite de segurança' : 'Nenhum item com estoque crítico'}
                </span>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                }}
                onClick={() => setInventorySubTab('movements')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Histórico
                  </span>
                  <History size={16} color="var(--color-secondary)" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {stockMovements.length} registros
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                  Rastreabilidade com responsável e motivo
                </span>
              </div>
            </div>

            {/* Sub-abas de Visualização e Filtros */}
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-xl)',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px',
                  borderBottom: '1px solid var(--card-border)',
                  paddingBottom: '16px',
                  marginBottom: '16px',
                }}
              >
                {/* Sub-abas Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setInventorySubTab('all')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: inventorySubTab === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
                      backgroundColor: inventorySubTab === 'all' ? 'rgba(216, 185, 255, 0.15)' : 'transparent',
                      color: inventorySubTab === 'all' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Layers size={14} /> Inventário Completo ({activeProducts.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventorySubTab('critical')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: inventorySubTab === 'critical' ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--card-border)',
                      backgroundColor: inventorySubTab === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                      color: inventorySubTab === 'critical' ? '#f87171' : 'var(--color-on-surface-variant)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertTriangle size={14} /> Itens Críticos ({produtosCriticos.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventorySubTab('movements')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: inventorySubTab === 'movements' ? '1px solid var(--color-secondary)' : '1px solid var(--card-border)',
                      backgroundColor: inventorySubTab === 'movements' ? 'rgba(232, 179, 255, 0.15)' : 'transparent',
                      color: inventorySubTab === 'movements' ? 'var(--color-secondary)' : 'var(--color-on-surface-variant)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <History size={14} />Movimentações ({stockMovements.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventorySubTab('inactive')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: inventorySubTab === 'inactive' ? '1px solid rgba(148, 163, 184, 0.5)' : '1px solid var(--card-border)',
                      backgroundColor: inventorySubTab === 'inactive' ? 'rgba(148, 163, 184, 0.15)' : 'transparent',
                      color: inventorySubTab === 'inactive' ? '#e2e8f0' : 'var(--color-outline)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Visualizar e excluir definitivamente produtos inativados"
                  >
                    <Trash2 size={14} /> Inativos & Lixeira ({inactiveProducts.length})
                  </button>
                </div>

                {/* Filtros de Busca e Seleção */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }} />
                    <input
                      type="text"
                      className="system-input"
                      placeholder="Pesquisar por nome, ID ou motivo..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      style={{ paddingLeft: '32px', fontSize: '12px', height: '36px' }}
                    />
                    {inventorySearch && (
                      <button
                        type="button"
                        onClick={() => setInventorySearch('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {inventorySubTab !== 'movements' ? (
                    <select
                      className="system-input"
                      value={inventoryGameFilter}
                      onChange={(e) => setInventoryGameFilter(e.target.value as GameId | 'all')}
                      style={{ fontSize: '12px', height: '36px' }}
                    >
                      <option value="all">Todos os Jogos</option>
                      <option value="pokemon">Pokémon TCG</option>
                      <option value="magic">Magic: The Gathering</option>
                      <option value="yugioh">Yu-Gi-Oh!</option>
                      <option value="onepiece">One Piece Card Game</option>
                      <option value="outros">Acessórios / Outros</option>
                    </select>
                  ) : (
                    <select
                      className="system-input"
                      value={movementTypeFilter}
                      onChange={(e) => setMovementTypeFilter(e.target.value as 'all' | 'entrada' | 'saida')}
                      style={{ fontSize: '12px', height: '36px' }}
                    >
                      <option value="all">Todas as Operações</option>
                      <option value="entrada">Apenas Entradas (+)</option>
                      <option value="saida">Apenas Saídas (-)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* TABELA: PRODUTOS (Ativos ou Críticos) */}
              {(inventorySubTab === 'all' || inventorySubTab === 'critical') && (
                <div style={{ overflowX: 'auto' }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-outline)' }}>
                      <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Nenhum produto encontrado com os filtros selecionados.</p>
                      <span style={{ fontSize: '12px' }}>Tente alterar o termo de busca ou selecionar outra categoria.</span>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--color-outline)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '12px 10px' }}>Produto</th>
                          <th style={{ padding: '12px 10px' }}>Jogo / Categoria</th>
                          <th style={{ padding: '12px 10px' }}>Preço Unitário</th>
                          <th style={{ padding: '12px 10px' }}>Estoque Atual</th>
                          <th style={{ padding: '12px 10px' }}>Estoque Mínimo</th>
                          <th style={{ padding: '12px 10px' }}>Status</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>Ações de Movimentação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p) => {
                          const minStock = p.estoqueMinimo ?? 3;
                          const isOutOfStock = p.estoque <= 0;
                          const isLowStock = !isOutOfStock && p.estoque <= minStock;
                          const progressPercentage = Math.min(100, Math.round((p.estoque / (minStock * 2 || 6)) * 100));

                          return (
                            <tr key={p.id} className="admin-table-row" style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}>
                              {/* Thumbnail + Nome */}
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '8px',
                                      backgroundColor: 'var(--color-surface-container-high)',
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                      border: '1px solid var(--card-border)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {p.imagemUrl ? (
                                      <img
                                        src={p.imagemUrl}
                                        alt={p.nome}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <Package size={18} color="var(--color-outline)" />
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: 'var(--color-headline)', fontSize: '13.5px' }}>
                                      {p.nome}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                                      ID: #{p.id}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Jogo e Categoria */}
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span className="badge badge-muted" style={{ width: 'fit-content', fontSize: '10px' }}>
                                    {p.jogoNome}
                                  </span>
                                  {p.categoria && (
                                    <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                                      {p.categoria}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Preço Unitário */}
                              <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
                                R$ {p.preco.toFixed(2)}
                              </td>

                              {/* Estoque Atual com Barra Visual */}
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '110px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 800,
                                        fontSize: '14px',
                                        color: isOutOfStock ? '#f87171' : isLowStock ? '#fbbf24' : '#4ade80',
                                      }}
                                    >
                                      {p.estoque} un.
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '5px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${progressPercentage}%`,
                                        backgroundColor: isOutOfStock ? '#f87171' : isLowStock ? '#fbbf24' : '#4ade80',
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Estoque Mínimo Configurável */}
                              <td style={{ padding: '12px 10px' }}>
                                <button
                                  type="button"
                                  onClick={() => openMinStockModal(p)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--card-border)',
                                    color: 'var(--color-headline)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Clique para alterar o limite mínimo deste item"
                                >
                                  <span>{minStock} un.</span>
                                  <Settings size={12} color="var(--color-outline)" />
                                </button>
                              </td>

                              {/* Badge de Status */}
                              <td style={{ padding: '12px 10px' }}>
                                {isOutOfStock ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      fontFamily: 'var(--font-mono)',
                                      textTransform: 'uppercase',
                                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                      border: '1px solid rgba(239, 68, 68, 0.35)',
                                      color: '#f87171',
                                    }}
                                  >
                                    ESGOTADO
                                  </span>
                                ) : isLowStock ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      fontFamily: 'var(--font-mono)',
                                      textTransform: 'uppercase',
                                      backgroundColor: 'rgba(251, 191, 36, 0.15)',
                                      border: '1px solid rgba(251, 191, 36, 0.35)',
                                      color: '#fbbf24',
                                    }}
                                  >
                                    CRÍTICO
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      fontFamily: 'var(--font-mono)',
                                      textTransform: 'uppercase',
                                      backgroundColor: 'rgba(74, 222, 128, 0.12)',
                                      border: '1px solid rgba(74, 222, 128, 0.3)',
                                      color: '#4ade80',
                                    }}
                                  >
                                    REGULAR
                                  </span>
                                )}
                              </td>

                              {/* Ações Rápidas por Linha */}
                              <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => openEntryModal(p)}
                                    style={{
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                      color: '#34d399',
                                      fontSize: '11px',
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title="Registrar entrada de mercadoria deste produto"
                                  >
                                    <Plus size={12} /> Entrada
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openExitModal(p)}
                                    disabled={p.estoque <= 0}
                                    style={{
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(239, 68, 68, 0.4)',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      color: '#f87171',
                                      fontSize: '11px',
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 700,
                                      cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                                      opacity: p.estoque <= 0 ? 0.5 : 1,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title="Registrar saída / baixa operacional deste produto"
                                  >
                                    <Minus size={12} /> Baixa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* AUDITORIA DE MOVIMENTAÇÕES */}
              {inventorySubTab === 'movements' && (
                <div style={{ overflowX: 'auto' }}>
                  {filteredMovements.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-outline)' }}>
                      <History size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Nenhuma movimentação de estoque registrada até o momento.</p>
                      <span style={{ fontSize: '12px' }}>Realize uma entrada ou baixa para iniciar o histórico.</span>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--color-outline)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '12px 10px' }}>Data / Hora</th>
                          <th style={{ padding: '12px 10px' }}>Produto</th>
                          <th style={{ padding: '12px 10px' }}>Tipo</th>
                          <th style={{ padding: '12px 10px' }}>Quantidade</th>
                          <th style={{ padding: '12px 10px' }}>Transição de Saldo</th>
                          <th style={{ padding: '12px 10px' }}>Motivo / Justificativa</th>
                          <th style={{ padding: '12px 10px' }}>Responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMovements.map((m) => {
                          const isEntrada = m.tipo === 'entrada';
                          return (
                            <tr key={m.id_movimentacao} className="admin-table-row" style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}>
                              <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-outline)' }}>
                                {m.data_hora}
                              </td>

                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ fontWeight: 700, color: 'var(--color-headline)' }}>
                                  {m.produto_nome}
                                </div>
                                <span style={{ fontSize: '10.5px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                                  ID Ref: #{m.produto_id}
                                </span>
                              </td>

                              <td style={{ padding: '12px 10px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 800,
                                    backgroundColor: isEntrada ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    border: isEntrada ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                                    color: isEntrada ? '#34d399' : '#f87171',
                                  }}
                                >
                                  {isEntrada ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                                  {m.tipo.toUpperCase()}
                                </span>
                              </td>

                              <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: isEntrada ? '#34d399' : '#f87171' }}>
                                {isEntrada ? `+${m.quantidade}` : `-${m.quantidade}`} un.
                              </td>

                              <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                <span style={{ color: 'var(--color-outline)' }}>{m.saldo_anterior} un.</span>
                                <span style={{ margin: '0 6px', color: 'var(--color-primary)' }}>➔</span>
                                <strong style={{ color: 'var(--color-headline)' }}>{m.saldo_posterior} un.</strong>
                              </td>

                              <td style={{ padding: '12px 10px', color: 'var(--color-on-surface-variant)', fontSize: '12.5px' }}>
                                {m.motivo || 'Sem justificativa preenchida'}
                              </td>

                              <td style={{ padding: '12px 10px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--color-headline)',
                                  }}
                                >
                                  {m.responsavel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TABELA: PRODUTOS INATIVOS & LIXEIRA (Permite excluir definitivamente) */}
              {inventorySubTab === 'inactive' && (
                <div style={{ overflowX: 'auto' }}>
                  {filteredInactive.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-outline)' }}>
                      <Trash2 size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Nenhum produto inativo no momento.</p>
                      <span style={{ fontSize: '12px' }}>Produtos desativados no catálogo aparecerão aqui para serem reativados ou excluídos definitivamente.</span>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <AlertCircle size={18} color="#f87171" />
                        <span style={{ fontSize: '12.5px', color: '#fca5a5' }}>
                          Itens inativos não estão visíveis aos clientes na vitrine da loja. Você pode restaurá-los a qualquer momento ou excluí-los permanentemente da base de dados.
                        </span>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--color-outline)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <th style={{ padding: '12px 10px' }}>Produto Inativado</th>
                            <th style={{ padding: '12px 10px' }}>Jogo / Categoria</th>
                            <th style={{ padding: '12px 10px' }}>Preço</th>
                            <th style={{ padding: '12px 10px' }}>Estoque Remanescente</th>
                            <th style={{ padding: '12px 10px', textAlign: 'right' }}>Ações de Descarte / Restauração</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInactive.map((p) => (
                            <tr key={p.id} className="admin-table-row" style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}>
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '8px',
                                      backgroundColor: 'var(--color-surface-container-high)',
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                      border: '1px solid var(--card-border)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {p.imagemUrl ? (
                                      <img
                                        src={p.imagemUrl}
                                        alt={p.nome}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <Package size={18} color="var(--color-outline)" />
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: 'var(--color-headline)' }}>{p.nome}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                                      ID: #{p.id} • <span style={{ color: '#f87171', fontWeight: 700 }}>INATIVO</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td style={{ padding: '12px 10px' }}>
                                <span className="badge badge-muted" style={{ fontSize: '10px' }}>
                                  {p.jogoNome}
                                </span>
                              </td>

                              <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                                R$ {p.preco.toFixed(2)}
                              </td>

                              <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>
                                {p.estoque} un.
                              </td>

                              <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      reactivateProduct(p.id);
                                      showToast(`Produto "${p.nome}" reativado com sucesso!`);
                                    }}
                                    className="btn-outline"
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '11.5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      borderColor: 'rgba(74, 222, 128, 0.4)',
                                      color: '#4ade80',
                                    }}
                                  >
                                    <RotateCcw size={13} /> Reativar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      showToastConfirm({
                                        message: `Deseja realmente excluir permanentemente o produto "${p.nome}" (ID #${p.id})? Esta ação não pode ser desfeita.`,
                                        confirmText: 'Excluir definitivamente',
                                        cancelText: 'Cancelar',
                                        onConfirm: () => {
                                          removeProductPermanently(p.id);
                                        },
                                      });
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid rgba(239, 68, 68, 0.4)',
                                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                      color: '#f87171',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title="Excluir do banco permanentemente"
                                  >
                                    <Trash2 size={13} /> Excluir Definitivamente
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: GESTÃO DE USUÁRIOS E EQUIPE (Com exclusão e promoção)
           ========================================================================= */}
        {activeAdminTab === 'users' && (
          <div className="glass-panel admin-animate-fade" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 700 }}>
                  Usuários e Equipe de Funcionários
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                  Controle as permissões de acesso, atribua cargos administrativos e gerencie membros da loja.
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
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
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

                          {/* Botão de Exclusão de Usuário */}
                          {user.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              style={{
                                padding: '5px 8px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Excluir usuário ${user.nome}`}
                            >
                              <Trash2 size={12} />
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


        {/* =========================================================================
            ABA 3: GESTÃO CENTRALIZADA DE PEDIDOS
           ========================================================================= */}
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

        {/* =========================================================================
            MODAIS OPERACIONAIS DE ESTOQUE
           ========================================================================= */}

        {/* Modal: Registrar Entrada de Estoque */}
        {isEntryModalOpen && (
          <div className="system-modal-overlay" onClick={() => setIsEntryModalOpen(false)}>
            <div className="glass-panel system-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Suprimentos</span>
                  <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowUpCircle size={20} color="#34d399" /> Registrar Entrada de Estoque
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '18px', lineHeight: 1.5 }}>
                Lance novos lotes ou reposições fornecidas pela distribuidora. A quantidade será acrescida imediatamente ao catálogo.
              </p>

              <form onSubmit={handleConfirmEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Produto a Receber *
                  </label>
                  <select
                    className="system-input"
                    value={selectedStockProduct?.id || ''}
                    onChange={(e) => {
                      const found = activeProducts.find((p) => p.id === Number(e.target.value));
                      if (found) setSelectedStockProduct(found);
                    }}
                    required
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} - {p.nome} (Saldo atual: {p.estoque} un.)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Qtd. a Adicionar *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="system-input"
                      value={stockAmountInput}
                      onChange={(e) => setStockAmountInput(e.target.value)}
                      placeholder="Ex: 10"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Saldo Resultante
                    </label>
                    <div
                      style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--input-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: '#34d399',
                      }}
                    >
                      {selectedStockProduct
                        ? `${selectedStockProduct.estoque} + ${parseInt(stockAmountInput, 10) || 0} = ${selectedStockProduct.estoque + (parseInt(stockAmountInput, 10) || 0)} un.`
                        : '-'}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Motivo / Fornecedor / Nota Fiscal
                  </label>
                  <input
                    type="text"
                    className="system-input"
                    value={stockReasonInput}
                    onChange={(e) => setStockReasonInput(e.target.value)}
                    placeholder="Ex: Copag Distribuidora - NF 9821"
                  />
                  {/* Chips rápidos de motivos */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Compra Distribuidor', 'Reposição de Loja', 'Devolução de Cliente', 'Ajuste de Balanço'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setStockReasonInput(chip)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '4px',
                          color: 'var(--color-on-surface-variant)',
                          fontSize: '10.5px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="system-modal-actions">
                  <button type="button" onClick={() => setIsEntryModalOpen(false)} className="btn-outline">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStock}
                    className="btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                      fontWeight: 700,
                    }}
                  >
                    {isSubmittingStock ? 'Registrando...' : 'Confirmar Entrada'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Registrar Saída / Baixa Operacional */}
        {isExitModalOpen && (
          <div className="system-modal-overlay" onClick={() => setIsExitModalOpen(false)}>
            <div className="glass-panel system-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Baixas</span>
                  <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowDownCircle size={20} color="#f87171" /> Registrar Baixa / Saída Operacional
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '18px', lineHeight: 1.5 }}>
                Lance baixas decorrentes de avarias, uso interno em demonstrações, premiações / eventos ou correções auditadas.
              </p>

              <form onSubmit={handleConfirmExit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Produto a Dar Baixa *
                  </label>
                  <select
                    className="system-input"
                    value={selectedStockProduct?.id || ''}
                    onChange={(e) => {
                      const found = activeProducts.find((p) => p.id === Number(e.target.value));
                      if (found) setSelectedStockProduct(found);
                    }}
                    required
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.estoque <= 0}>
                        #{p.id} - {p.nome} (Disponível: {p.estoque} un.) {p.estoque <= 0 ? '- [ESGOTADO]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Qtd. a Retirar *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedStockProduct ? selectedStockProduct.estoque : undefined}
                      required
                      className="system-input"
                      value={stockAmountInput}
                      onChange={(e) => setStockAmountInput(e.target.value)}
                      placeholder="Ex: 1"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Saldo Resultante
                    </label>
                    <div
                      style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--input-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: '#f87171',
                      }}
                    >
                      {selectedStockProduct
                        ? `${selectedStockProduct.estoque} - ${parseInt(stockAmountInput, 10) || 0} = ${Math.max(0, selectedStockProduct.estoque - (parseInt(stockAmountInput, 10) || 0))} un.`
                        : '-'}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Motivo / Justificativa da Baixa *
                  </label>
                  <input
                    type="text"
                    required
                    className="system-input"
                    value={stockReasonInput}
                    onChange={(e) => setStockReasonInput(e.target.value)}
                    placeholder="Ex: Embalagem danificada no transporte"
                  />
                  {/* Chips rápidos de motivos */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Avaria / Dano', 'Premiação / Evento', 'Uso Interno', 'Ajuste de Inventário', 'Venda Balcão'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setStockReasonInput(chip)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '4px',
                          color: 'var(--color-on-surface-variant)',
                          fontSize: '10.5px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="system-modal-actions">
                  <button type="button" onClick={() => setIsExitModalOpen(false)} className="btn-outline">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStock}
                    className="btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)',
                      fontWeight: 700,
                    }}
                  >
                    {isSubmittingStock ? 'Processando...' : 'Confirmar Baixa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Configurar Estoque Mínimo */}
        {isMinStockModalOpen && selectedStockProduct && (
          <div className="system-modal-overlay" onClick={() => setIsMinStockModalOpen(false)}>
            <div className="glass-panel system-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Segurança & Alerta</span>
                  <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                    Limite de Estoque Mínimo
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMinStockModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-surface-container-high)', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Produto Selecionado
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--color-headline)' }}>{selectedStockProduct.nome}</strong>
                <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  Estoque atual: {selectedStockProduct.estoque} unidades
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--color-on-surface-variant)', marginBottom: '16px', lineHeight: 1.5 }}>
                Quando o saldo em prateleira for igual ou menor a este valor, o sistema emitirá alertas automáticos de reposição imediata na central de estoque.
              </p>

              <form onSubmit={handleConfirmMinStock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Quantidade Mínima de Segurança (Unidades)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="system-input"
                    value={minStockValueInput}
                    onChange={(e) => setMinStockValueInput(e.target.value)}
                    placeholder="Ex: 3"
                  />
                </div>

                <div className="system-modal-actions">
                  <button type="button" onClick={() => setIsMinStockModalOpen(false)} className="btn-outline">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStock}
                    className="btn-primary"
                    style={{
                      background: 'var(--grad-primary)',
                      boxShadow: '0 4px 15px var(--glow-color)',
                      fontWeight: 700,
                    }}
                  >
                    {isSubmittingStock ? 'Salvando...' : 'Salvar Limite de Segurança'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cadastrar Novo Membro de Equipe */}
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
                  }}
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

        {/* Modal: Alterar Senha do Administrador */}
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
                  }}
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
