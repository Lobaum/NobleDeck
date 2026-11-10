import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Users,
  AlertTriangle,
  Plus,
  Package,
  ShoppingBag,
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
  Boxes,
  RotateCcw,
  Settings,
  Globe,
  Download,
  Edit,
  Check,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  UserProfile,
  UserRole,
  Order,
  Product,
  GameId,
  ActiveGameApi,
  ProductCategory,
  ExternalCard,
} from '../types';
import { api } from '../services/api';
import { searchLiveCards, getPokemonSets, type PokemonSetOption } from '../services/tcgApi';
import { SystemSelect } from '../components/SystemSelect';
import { SystemModal } from '../components/SystemModal';

const GAME_OPTIONS: { value: GameId; label: string; badge: string; color: string }[] = [
  { value: 'pokemon', label: 'Pokémon TCG', badge: 'Pokémon', color: 'var(--color-accent-purple)' },
  { value: 'magic', label: 'Magic: The Gathering', badge: 'MTG', color: 'var(--color-accent-pink)' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!', badge: 'YGO', color: 'var(--color-accent-yellow)' },
  { value: 'onepiece', label: 'One Piece Card Game', badge: 'OP', color: '#f97316' },
  { value: 'outros', label: 'Acessórios / Geral', badge: 'Geral', color: 'var(--color-primary)' },
];

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'Booster Box', label: 'Booster Box' },
  { value: 'Deck Commander', label: 'Deck Commander' },
  { value: 'Booster Pack', label: 'Booster Pack' },
  { value: 'Starter Deck', label: 'Starter Deck' },
  { value: 'Carta Avulsa', label: 'Carta Avulsa' },
  { value: 'Acessórios', label: 'Acessórios' },
];

const formatBRL = (value: number | null | undefined): string => {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatMoneyInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const number = Number(digits) / 100;
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseMoneyToFloat = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  if (!value) return 0;
  const clean = String(value).replace(/\./g, '').replace(',', '.');
  return Math.round((parseFloat(clean) || 0) * 100) / 100;
};

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    setCurrentTab,
    loginUser,
    logoutUser,
    switchRole,
    products,
    addProduct,
    editProduct,
    deleteProduct,
    reactivateProduct,
    removeProductPermanently,
    importExternalCard,
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

  // Navegação Principal do Admin
  const [activeAdminTab, setActiveAdminTab] = useState<
    'inventory' | 'api-catalog' | 'movements' | 'orders' | 'users'
  >('inventory');

  // Sub-abas e Filtros de Estoque Local
  const [inventorySubTab, setInventorySubTab] = useState<'all' | 'active' | 'critical' | 'out-of-stock' | 'inactive'>('active');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryGameFilter, setInventoryGameFilter] = useState<GameId | 'all'>('all');

  // Sub-aba e Filtros de Movimentações
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');

  // Equipe & Usuários
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Estados do Catálogo TCG Live (API Externa)
  const [apiGameFilter, setApiGameFilter] = useState<ActiveGameApi | 'all'>('all');
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiPokemonSetFilter, setApiPokemonSetFilter] = useState('');
  const [pokemonSets, setPokemonSets] = useState<PokemonSetOption[]>([]);
  const [apiCards, setApiCards] = useState<ExternalCard[]>([]);
  const [isLoadingApiCards, setIsLoadingApiCards] = useState(false);
  const [isLoadingMoreApi, setIsLoadingMoreApi] = useState(false);
  const [apiHasLoadedOnce, setApiHasLoadedOnce] = useState(false);
  const [apiPage, setApiPage] = useState(1);
  const [apiHasMore, setApiHasMore] = useState(false);
  const [apiTotalCount, setApiTotalCount] = useState(0);
  const [apiFilterType, setApiFilterType] = useState<'all' | 'sealed' | 'singles'>('all');
  const [importingCardUid, setImportingCardUid] = useState<string | null>(null);

  // Configurações inline de importação de cards da API
  const [apiCardCustoms, setApiCardCustoms] = useState<
    Record<string, { stock: number; price: number; minStock: number }>
  >({});

  // Modais de Gestão de Estoque
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isMinStockModalOpen, setIsMinStockModalOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null);
  const [stockAmountInput, setStockAmountInput] = useState('5');
  const [stockReasonInput, setStockReasonInput] = useState('');
  const [minStockValueInput, setMinStockValueInput] = useState('3');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Modais de Criação & Edição de Produto
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal de Detalhes / Customização ao Importar da API
  const [configuringApiCard, setConfiguringApiCard] = useState<ExternalCard | null>(null);
  const [cfgStock, setCfgStock] = useState('5');
  const [cfgPrice, setCfgPrice] = useState('0.00');
  const [cfgMinStock, setCfgMinStock] = useState('3');
  const [cfgCategory, setCfgCategory] = useState<ProductCategory>('Carta Avulsa');

  // Modal Novo Membro da Equipe
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

  // Carregar dados de usuários e movimentações
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

  // Carregar Cards da API TCG quando a aba for aberta pela primeira vez ou filtros mudarem
  const carregarCardsDaApi = async (
    game: ActiveGameApi | 'all',
    query = '',
    setId?: string,
    page = 1
  ) => {
    if (page === 1) {
      setIsLoadingApiCards(true);
      setApiPage(1);
    } else {
      setIsLoadingMoreApi(true);
    }
    try {
      const { cards, totalCount, hasMore } = await searchLiveCards(game, query.trim(), page, setId);
      if (page === 1) {
        setApiCards(cards);
      } else {
        setApiCards((prev) => [...prev, ...cards]);
      }
      setApiHasMore(Boolean(hasMore));
      setApiTotalCount(totalCount || (page === 1 ? cards.length : apiTotalCount));
      setApiPage(page);
      setApiHasLoadedOnce(true);
    } catch {
      if (page === 1) setApiCards([]);
    } finally {
      setIsLoadingApiCards(false);
      setIsLoadingMoreApi(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'api-catalog') {
      getPokemonSets().then(setPokemonSets);
      if (!apiHasLoadedOnce) {
        carregarCardsDaApi(apiGameFilter, apiSearchQuery, apiPokemonSetFilter, 1);
      }
    }
  }, [activeAdminTab, apiHasLoadedOnce]);

  const handleSearchApi = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    carregarCardsDaApi(apiGameFilter, apiSearchQuery, apiPokemonSetFilter, 1);
  };

  const handleGameFilterChange = (game: ActiveGameApi | 'all') => {
    setApiGameFilter(game);
    setApiPokemonSetFilter('');
    carregarCardsDaApi(game, apiSearchQuery, '', 1);
  };

  const handleLoadMoreApi = () => {
    if (!apiHasMore || isLoadingApiCards || isLoadingMoreApi) return;
    carregarCardsDaApi(apiGameFilter, apiSearchQuery, apiPokemonSetFilter, apiPage + 1);
  };

  // Cálculos de Métricas de Estoque
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
    return activeProducts.filter((p) => p.estoque > 0 && p.estoque <= (p.estoqueMinimo ?? 3));
  }, [activeProducts]);

  const produtosEsgotados = useMemo(() => {
    return activeProducts.filter((p) => p.estoque <= 0);
  }, [activeProducts]);

  // Filtragem de Produtos no Estoque Local
  const filteredProducts = useMemo(() => {
    let list = products;
    if (inventorySubTab === 'active') {
      list = activeProducts;
    } else if (inventorySubTab === 'critical') {
      list = produtosCriticos;
    } else if (inventorySubTab === 'out-of-stock') {
      list = produtosEsgotados;
    } else if (inventorySubTab === 'inactive') {
      list = inactiveProducts;
    }

    if (inventoryGameFilter !== 'all') {
      list = list.filter((p) => p.jogo === inventoryGameFilter);
    }

    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.id.toString().includes(q) ||
          (p.categoria && p.categoria.toLowerCase().includes(q)) ||
          (p.subtitulo && p.subtitulo.toLowerCase().includes(q))
      );
    }
    return list;
  }, [
    inventorySubTab,
    products,
    activeProducts,
    produtosCriticos,
    produtosEsgotados,
    inactiveProducts,
    inventoryGameFilter,
    inventorySearch,
  ]);

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

  // Verifica se uma carta da API já existe no estoque cadastrado (ativo ou inativo)
  const findExistingProductForApiCard = (card: ExternalCard): Product | undefined => {
    return products.find(
      (p) =>
        p.jogo === card.jogo &&
        p.nome.toLowerCase().trim() === card.nome.toLowerCase().trim()
    );
  };

  // Importação Rápida de Carta da API
  const handleQuickImportApiCard = async (card: ExternalCard) => {
    setImportingCardUid(card.uid);
    const customs = apiCardCustoms[card.uid] || {
      stock: 5,
      price: card.precoMercadoBrl > 0 ? card.precoMercadoBrl : 19.9,
      minStock: 3,
    };

    try {
      const criado = await importExternalCard(card, customs.stock, customs.price);
      if (criado && customs.minStock !== 3) {
        await updateProductMinStock(criado.id, customs.minStock);
      }
    } finally {
      setImportingCardUid(null);
    }
  };

  // Abrir Modal de Configuração Completa de Card da API
  const handleOpenConfigApiCard = (card: ExternalCard) => {
    setConfiguringApiCard(card);
    const customs = apiCardCustoms[card.uid];
    setCfgStock(customs ? String(customs.stock) : '5');
    setCfgPrice(
      customs
        ? formatMoneyInput(customs.price)
        : formatMoneyInput(card.precoMercadoBrl > 0 ? card.precoMercadoBrl : 19.9)
    );
    setCfgMinStock(customs ? String(customs.minStock) : '3');
    setCfgCategory('Carta Avulsa');
  };

  // Salvar do Modal de Configuração de Card da API
  const handleSaveConfiguredApiCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringApiCard) return;

    const initialStock = parseInt(cfgStock, 10) || 5;
    const priceNum = parseMoneyToFloat(cfgPrice);
    const minStockNum = Math.max(0, parseInt(cfgMinStock, 10) || 3);

    setImportingCardUid(configuringApiCard.uid);
    try {
      const criado = await importExternalCard(configuringApiCard, initialStock, priceNum);
      if (criado) {
        await editProduct(criado.id, {
          categoria: cfgCategory,
          estoqueMinimo: minStockNum,
        });
        showToast(`"${criado.nome}" configurado e adicionado ao estoque!`);
      }
      setConfiguringApiCard(null);
    } finally {
      setImportingCardUid(null);
    }
  };

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
        showToast('Autenticação autorizada! Bem-vindo ao Painel de Estoque.');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao autenticar administrador.');
    } finally {
      setIsAuthenticating(false);
    }
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
        stockReasonInput.trim() || 'Entrada de reposição / Fornecedor'
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

  // Ajuste rápido inline (+1 / -1 / +5)
  const handleQuickInlineStock = async (prod: Product, change: number) => {
    if (change < 0 && prod.estoque <= 0) {
      showToast('O produto já está esgotado!');
      return;
    }
    if (change > 0) {
      await registerStockEntry(prod.id, change, 'Ajuste rápido no controle de estoque');
    } else {
      await registerStockExit(prod.id, Math.abs(change), 'Ajuste rápido de saída no estoque');
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

  // Cadastrar Novo Membro
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    try {
      const criado = await api.cadastrarUsuario(
        newUserName.trim(),
        newUserEmail.trim(),
        newUserPassword.trim(),
        newUserRole
      );
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
                <span
                  className="access-denied-status-dot"
                  style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }}
                />
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
                Autentique-se com credenciais autorizadas para gerenciar o estoque e operações
              </p>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              <div className="admin-field-group">
                <label className="admin-field-label">E-MAIL DO ADMINISTRADOR</label>
                <div className="admin-input-wrapper">
                  <Mail size={16} className="admin-input-icon" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@nobledeck.com"
                    className="admin-modern-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">SENHA DE ACESSO</label>
                <div className="admin-input-wrapper">
                  <Key size={16} className="admin-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="admin-modern-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="admin-toggle-eye-btn"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="admin-submit-btn"
                style={{ marginTop: '6px' }}
              >
                {isAuthenticating ? 'Validando Credenciais...' : 'Acessar Central de Estoque'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. CASO AUTENTICADO MAS NÃO É ADMIN
  if (!isAdmin) {
    return (
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }} className="admin-animate-fade">
        <div className="app-container" style={{ maxWidth: '520px' }}>
          <div className="access-denied-card">
            <div className="access-denied-icon-halo">
              <ShieldAlert size={34} color="#f87171" />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', color: 'var(--color-headline)' }}>
              Acesso Administrativo Restrito
            </h2>

            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
              Você está conectado como <strong>{currentUser.email}</strong> com a função{' '}
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{currentUser.role}</span>.
              A área de administração e controle de estoque é exclusiva para gestores.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={() => {
                  switchRole('admin');
                  showToast('Modo Administrador ativado!');
                }}
                className="btn-secondary"
                style={{ padding: '13px 20px', borderRadius: 'var(--radius-full)' }}
              >
                <ShieldCheck size={16} /> Ativar Perfil de Administrador
              </button>

              <button
                type="button"
                onClick={() => {
                  logoutUser();
                  showToast('Sessão encerrada.');
                }}
                className="btn-outline"
                style={{ padding: '12px 20px', borderRadius: 'var(--radius-full)' }}
              >
                <LogOut size={15} /> Entrar com Outra Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. PAINEL DE CONTROLE GERAL DO ADMINISTRADOR (REFORMULADO)
  return (
    <div style={{ paddingTop: '28px', paddingBottom: '90px' }} className="admin-animate-fade">
      <div className="app-container">
        {/* =========================================================================
            HEADER ERP & COMANDOS RÁPIDOS
           ========================================================================= */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            padding: '24px 28px',
            borderRadius: '20px',
            backgroundColor: 'var(--color-surface-container-low)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: 'var(--color-headline)',
                fontFamily: 'var(--font-headline)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Central de Gestão & Operações
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
              Gerencie o inventário, adicione cartas do catálogo oficial de TCG e controle movimentações em tempo real.
            </p>
          </div>

          {/* Botões de Ação Rápida no Topo */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedStockProduct(activeProducts[0] || null);
                setStockAmountInput('5');
                setStockReasonInput('Reposição de Fornecedor');
                setIsEntryModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Registrar nova entrada de estoque"
            >
              <ArrowUpCircle size={15} /> + Nova Entrada
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedStockProduct(activeProducts[0] || null);
                setStockAmountInput('1');
                setStockReasonInput('Baixa Operacional / Avaria');
                setIsExitModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Registrar saída ou baixa do estoque"
            >
              <ArrowDownCircle size={15} /> - Baixa no Estoque
            </button>

            <button
              type="button"
              onClick={() => setIsCreateProductModalOpen(true)}
              className="btn-primary"
              style={{
                padding: '9px 16px',
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
              }}
            >
              <Plus size={15} /> Novo Produto Manual
            </button>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="btn-outline"
              style={{
                padding: '9px 14px',
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Alterar Senha do Administrador"
            >
              <Key size={14} /> Senha
            </button>

            <button
              type="button"
              onClick={() => {
                logoutUser();
                setCurrentTab('home');
              }}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Sair do painel"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            CARDS DE MÉTRICAS / KPIS DE CONTROLE DE ESTOQUE
           ========================================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* 1. Capital Imobilizado */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid rgba(216, 185, 255, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Valor Total em Estoque
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(216, 185, 255, 0.12)' }}>
                <DollarSign size={16} color="var(--color-primary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-on-surface-variant)' }}>
              Ativos avaliados a preço de venda
            </span>
          </div>

          {/* 2. Unidades e Itens */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid var(--card-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Inventário Físico
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(232, 179, 255, 0.12)' }}>
                <Boxes size={16} color="var(--color-secondary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              {totalUnidadesEstoque} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-outline)' }}>unidades</span>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-on-surface-variant)' }}>
              Distribuídas em {products.length} produtos ({activeProducts.length} ativos{inactiveProducts.length > 0 ? `, ${inactiveProducts.length} inativos` : ''})
            </span>
          </div>

          {/* 3. Alertas de Reposição / Críticos */}
          <div
            className="glass-panel"
            onClick={() => {
              setActiveAdminTab('inventory');
              setInventorySubTab(produtosCriticos.length > 0 ? 'critical' : 'all');
            }}
            style={{
              padding: '20px',
              borderRadius: '16px',
              border:
                produtosCriticos.length > 0 || produtosEsgotados.length > 0
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid var(--card-border)',
              backgroundColor:
                produtosCriticos.length > 0 || produtosEsgotados.length > 0
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'transparent',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            title="Clique para filtrar itens que precisam de compra/reposição"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: produtosCriticos.length > 0 ? '#f87171' : 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Alertas de Reposição
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: produtosCriticos.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.12)' }}>
                <AlertTriangle size={16} color={produtosCriticos.length > 0 ? '#f87171' : '#4ade80'} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: produtosCriticos.length > 0 ? '#f87171' : '#4ade80', fontFamily: 'var(--font-mono)' }}>
              {produtosCriticos.length + produtosEsgotados.length}{' '}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                ({produtosEsgotados.length} zerados)
              </span>
            </div>
            <span style={{ fontSize: '11.5px', color: produtosCriticos.length > 0 ? '#fca5a5' : 'var(--color-on-surface-variant)' }}>
              {produtosCriticos.length > 0 ? 'Abaixo do estoque mínimo' : 'Estoque 100% regular'}
            </span>
          </div>

          {/* 4. Catálogo Oficial Global */}
          <div
            className="glass-panel"
            onClick={() => setActiveAdminTab('api-catalog')}
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: activeAdminTab === 'api-catalog' ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
              backgroundColor: activeAdminTab === 'api-catalog' ? 'rgba(216, 185, 255, 0.1)' : 'transparent',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            title="Ir para o Catálogo Oficial de Cards"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Catálogo Oficial Global
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(216, 185, 255, 0.12)' }}>
                <Globe size={16} color="var(--color-primary)" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
              Acervo Completo
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} color="var(--color-primary)" /> Pokémon, MTG, YGO & One Piece
            </span>
          </div>
        </div>

        {/* Banner de Acesso à Versão 2.0 */}
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '14px',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(216, 185, 255, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
            border: '1px solid rgba(216, 185, 255, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(216, 185, 255, 0.2)', color: 'var(--color-primary)' }}>
              <Boxes size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-headline)' }}>
                Controle de Produtos
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                Interface especializada com reajuste em massa (%), exportação CSV, visão dupla (Tabela/Cards HD) e edição inline.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentTab('product-control')}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Abrir Controle 2.0 <Sparkles size={14} />
          </button>
        </div>

        {/* =========================================================================
            BARRA DE ABAS PRINCIPAIS (SEGMENTED CONTROL ERP)
           ========================================================================= */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: '1px solid var(--nav-border)',
            paddingBottom: '12px',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveAdminTab('inventory')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
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
            <Package size={16} /> Estoque & Catálogo ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('api-catalog')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeAdminTab === 'api-catalog' ? '1px solid rgba(216, 185, 255, 0.35)' : '1px solid transparent',
              backgroundColor: activeAdminTab === 'api-catalog' ? 'rgba(216, 185, 255, 0.14)' : 'transparent',
              color: activeAdminTab === 'api-catalog' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeAdminTab === 'api-catalog' ? '0 0 15px var(--glow-color)' : 'none',
            }}
          >
            <Globe size={16} /> Catálogo Oficial de Cards
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('movements')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeAdminTab === 'movements' ? '1px solid rgba(216, 185, 255, 0.35)' : '1px solid transparent',
              backgroundColor: activeAdminTab === 'movements' ? 'rgba(216, 185, 255, 0.14)' : 'transparent',
              color: activeAdminTab === 'movements' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeAdminTab === 'movements' ? '0 0 15px var(--glow-color)' : 'none',
            }}
          >
            <History size={16} /> Movimentações & Auditoria ({stockMovements.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('orders')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
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
            <ShoppingBag size={16} /> Pedidos da Loja ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('users')}
            className="admin-tab-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
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
            <Users size={16} /> Usuários & Equipe ({userList.length})
          </button>
        </div>

        {/* =========================================================================
            ABA 1: ESTOQUE & CATÁLOGO LOCAL (TABELA ERP COMPLETA)
           ========================================================================= */}
        {activeAdminTab === 'inventory' && (
          <div className="admin-animate-fade">
            {/* Barra de Filtros e Busca de Estoque */}
            <div
              className="glass-panel"
              style={{
                position: 'relative',
                zIndex: 30,
                padding: '18px 20px',
                borderRadius: '16px',
                marginBottom: '18px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              {/* Filtros de Status (Pills) */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('all')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: inventorySubTab === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
                    backgroundColor: inventorySubTab === 'all' ? 'rgba(216, 185, 255, 0.15)' : 'transparent',
                    color: inventorySubTab === 'all' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Todos ({products.length})
                </button>

                <button
                  type="button"
                  onClick={() => setInventorySubTab('active')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: inventorySubTab === 'active' ? '1px solid #4ade80' : '1px solid var(--card-border)',
                    backgroundColor: inventorySubTab === 'active' ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                    color: inventorySubTab === 'active' ? '#4ade80' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Ativos ({activeProducts.length})
                </button>

                <button
                  type="button"
                  onClick={() => setInventorySubTab('critical')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: inventorySubTab === 'critical' ? '1px solid #fbbf24' : '1px solid var(--card-border)',
                    backgroundColor: inventorySubTab === 'critical' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                    color: inventorySubTab === 'critical' ? '#fbbf24' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Estoque Baixo ({produtosCriticos.length})
                </button>

                <button
                  type="button"
                  onClick={() => setInventorySubTab('out-of-stock')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: inventorySubTab === 'out-of-stock' ? '1px solid #f87171' : '1px solid var(--card-border)',
                    backgroundColor: inventorySubTab === 'out-of-stock' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    color: inventorySubTab === 'out-of-stock' ? '#f87171' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Esgotados ({produtosEsgotados.length})
                </button>

                <button
                  type="button"
                  onClick={() => setInventorySubTab('inactive')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: inventorySubTab === 'inactive' ? '1px solid #ef4444' : '1px solid var(--card-border)',
                    backgroundColor: inventorySubTab === 'inactive' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    color: inventorySubTab === 'inactive' ? '#f87171' : 'var(--color-outline)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {inactiveProducts.length > 0 && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                      }}
                    />
                  )}
                  Inativos ({inactiveProducts.length})
                </button>
              </div>

              {/* Busca e Jogo */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-outline)',
                    }}
                  />
                  <input
                    type="text"
                    className="system-input"
                    placeholder="Pesquisar por nome ou ID..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '12px', height: '36px' }}
                  />
                  {inventorySearch && (
                    <button
                      type="button"
                      onClick={() => setInventorySearch('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-outline)',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div style={{ minWidth: '190px' }}>
                  <SystemSelect<GameId | 'all'>
                    size="sm"
                    value={inventoryGameFilter}
                    onChange={(val) => setInventoryGameFilter(val)}
                    options={[
                      { value: 'all', label: 'Todos os Jogos' },
                      { value: 'pokemon', label: 'Pokémon TCG', badge: 'Pokémon' },
                      { value: 'magic', label: 'Magic: The Gathering', badge: 'MTG' },
                      { value: 'yugioh', label: 'Yu-Gi-Oh!', badge: 'YGO' },
                      { value: 'onepiece', label: 'One Piece Card Game', badge: 'OP' },
                      { value: 'outros', label: 'Acessórios / Outros', badge: 'Geral' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="glass-panel" style={{ position: 'relative', zIndex: 1, padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <Package size={38} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Nenhum produto encontrado.</p>
                    <span style={{ fontSize: '12.5px' }}>
                      Tente alterar os filtros ou adicionar novos cards diretamente da aba &ldquo;Catálogo Oficial de Cards&rdquo;.
                    </span>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--card-border)',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          color: 'var(--color-outline)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        <th style={{ padding: '14px 16px' }}>Produto</th>
                        <th style={{ padding: '14px 12px' }}>Jogo / Categoria</th>
                        <th style={{ padding: '14px 12px' }}>Preço Unitário</th>
                        <th style={{ padding: '14px 12px' }}>Estoque Atual & Nível</th>
                        <th style={{ padding: '14px 12px' }}>Mínimo</th>
                        <th style={{ padding: '14px 12px' }}>Status</th>
                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const minStock = p.estoqueMinimo ?? 3;
                        const isOutOfStock = p.estoque <= 0;
                        const isLowStock = !isOutOfStock && p.estoque <= minStock;
                        const progressPercentage = Math.min(
                          100,
                          Math.round((p.estoque / (minStock * 2 || 6)) * 100)
                        );
                        const isInactive = p.ativo === false;

                        return (
                          <tr
                            key={p.id}
                            className="admin-table-row"
                            style={{
                              borderBottom: '1px solid var(--card-border)',
                              fontSize: '13px',
                              backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.05)' : undefined,
                              borderLeft: isInactive ? '3px solid #ef4444' : '3px solid transparent',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            {/* Produto */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--color-surface-container-high)',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: isInactive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--card-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    filter: isInactive ? 'grayscale(0.4)' : undefined,
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, color: isInactive ? 'var(--color-outline)' : 'var(--color-headline)', fontSize: '13.5px' }}>
                                      {p.nome}
                                    </span>
                                    {isInactive && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '1px 7px',
                                          borderRadius: '5px',
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          fontFamily: 'var(--font-mono)',
                                          backgroundColor: 'rgba(239, 68, 68, 0.18)',
                                          border: '1px solid rgba(239, 68, 68, 0.45)',
                                          color: '#f87171',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.04em',
                                        }}
                                      >
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                        INATIVO
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                                    #{p.id} {p.subtitulo && `• ${p.subtitulo}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Jogo / Categoria */}
                            <td style={{ padding: '14px 12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span className="badge badge-muted" style={{ width: 'fit-content', fontSize: '10.5px' }}>
                                  {p.jogoNome}
                                </span>
                                {p.categoria && (
                                  <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                                    {p.categoria}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Preço */}
                            <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
                              R$ {formatBRL(p.preco)}
                            </td>

                            {/* Estoque Atual com Stepper Rápido */}
                            <td style={{ padding: '14px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Botões rápidos -1 e +1 */}
                                {!isInactive && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '8px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickInlineStock(p, -1)}
                                      disabled={p.estoque <= 0}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: p.estoque <= 0 ? 'var(--color-outline)' : '#f87171',
                                        padding: '4px 8px',
                                        cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                      }}
                                      title="Diminuir 1 un."
                                    >
                                      -
                                    </button>
                                    <span
                                      style={{
                                        padding: '0 6px',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 800,
                                        fontSize: '13.5px',
                                        color: isOutOfStock ? '#f87171' : isLowStock ? '#fbbf24' : '#4ade80',
                                        minWidth: '32px',
                                        textAlign: 'center',
                                      }}
                                    >
                                      {p.estoque}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickInlineStock(p, 1)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#34d399',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                      }}
                                      title="Adicionar 1 un."
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickInlineStock(p, 5)}
                                      style={{
                                        borderLeft: '1px solid var(--card-border)',
                                        borderTop: 'none',
                                        borderRight: 'none',
                                        borderBottom: 'none',
                                        background: 'transparent',
                                        color: 'var(--color-primary)',
                                        padding: '4px 6px',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                      }}
                                      title="Adicionar 5 un. rapidamente"
                                    >
                                      +5
                                    </button>
                                  </div>
                                )}

                                {isInactive && (
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-outline)' }}>
                                    {p.estoque} un.
                                  </span>
                                )}

                                {/* Barra de progresso */}
                                <div style={{ width: '48px', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${progressPercentage}%`,
                                      backgroundColor: isOutOfStock ? '#f87171' : isLowStock ? '#fbbf24' : '#4ade80',
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Mínimo */}
                            <td style={{ padding: '14px 12px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStockProduct(p);
                                  setMinStockValueInput(String(minStock));
                                  setIsMinStockModalOpen(true);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid var(--card-border)',
                                  color: 'var(--color-headline)',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '11.5px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Alterar limite mínimo de segurança"
                              >
                                {minStock} un. <Settings size={11} color="var(--color-outline)" />
                              </button>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '14px 12px' }}>
                              {isInactive ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.18)',
                                    border: '1px solid rgba(239, 68, 68, 0.45)',
                                    color: '#f87171',
                                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.12)',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                  INATIVO
                                </span>
                              ) : isOutOfStock ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                  ESGOTADO
                                </span>
                              ) : isLowStock ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono)',
                                    backgroundColor: 'rgba(251, 191, 36, 0.15)',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    color: '#fbbf24',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fbbf24' }} />
                                  REPOSIÇÃO
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono)',
                                    backgroundColor: 'rgba(74, 222, 128, 0.12)',
                                    border: '1px solid rgba(74, 222, 128, 0.3)',
                                    color: '#4ade80',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
                                  REGULAR
                                </span>
                              )}
                            </td>

                            {/* Ações */}
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct(p)}
                                  style={{
                                    padding: '5px 9px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--color-headline)',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title="Editar informações do produto"
                                >
                                  <Edit size={12} /> Editar
                                </button>

                                {isInactive ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => reactivateProduct(p.id)}
                                      style={{
                                        padding: '5px 9px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(74, 222, 128, 0.4)',
                                        backgroundColor: 'rgba(74, 222, 128, 0.12)',
                                        color: '#4ade80',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                      title="Reativar produto no catálogo"
                                    >
                                      <RotateCcw size={12} /> Reativar
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        showToastConfirm({
                                          message: `Deseja realmente excluir permanentemente "${p.nome}"? Esta operação é irreversível.`,
                                          confirmText: 'Excluir definitivamente',
                                          cancelText: 'Cancelar',
                                          onConfirm: () => removeProductPermanently(p.id),
                                        });
                                      }}
                                      style={{
                                        padding: '5px 9px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                        color: '#f87171',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                      title="Excluir permanentemente"
                                    >
                                      <Trash2 size={12} /> Excluir
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => deleteProduct(p.id)}
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                      color: '#f87171',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                    title="Desativar este produto"
                                  >
                                    Desativar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: PRODUTOS DA API EXTERNA (TCG LIVE - NOVO DESTAQUE)
           ========================================================================= */}
        {activeAdminTab === 'api-catalog' && (
          <div className="admin-animate-fade">
            {/* Box Explicativo & Barra de Busca Live */}
            <div
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: '16px',
                marginBottom: '20px',
                border: '1px solid rgba(216, 185, 255, 0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Globe size={20} color="var(--color-primary)" />
                    <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                      Catálogo Oficial de Cards & Coleções
                    </h3>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: 0, maxWidth: '750px' }}>
                    Explore o acervo oficial de cards de <strong>Pokémon</strong>,{' '}
                    <strong>Magic: The Gathering</strong>, <strong>Yu-Gi-Oh!</strong> e{' '}
                    <strong>One Piece</strong>. Defina estoque inicial, preço em reais e adicione ao estoque da loja com 1 clique!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => carregarCardsDaApi(apiGameFilter, apiSearchQuery)}
                  className="btn-outline"
                  style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={isLoadingApiCards ? 'spin' : ''} /> Atualizar Catálogo
                </button>
              </div>

              {/* Filtro por Jogo (Chips) */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => handleGameFilterChange('all')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiGameFilter === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
                    backgroundColor: apiGameFilter === 'all' ? 'rgba(216, 185, 255, 0.15)' : 'transparent',
                    color: apiGameFilter === 'all' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Todos os Jogos
                </button>

                <button
                  type="button"
                  onClick={() => handleGameFilterChange('pokemon')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiGameFilter === 'pokemon' ? '1px solid var(--color-accent-purple)' : '1px solid var(--card-border)',
                    backgroundColor: apiGameFilter === 'pokemon' ? 'rgba(216, 185, 255, 0.15)' : 'transparent',
                    color: apiGameFilter === 'pokemon' ? 'var(--color-accent-purple)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Pokémon TCG
                </button>

                <button
                  type="button"
                  onClick={() => handleGameFilterChange('magic')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiGameFilter === 'magic' ? '1px solid var(--color-accent-pink)' : '1px solid var(--card-border)',
                    backgroundColor: apiGameFilter === 'magic' ? 'rgba(232, 179, 255, 0.15)' : 'transparent',
                    color: apiGameFilter === 'magic' ? 'var(--color-accent-pink)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Magic: The Gathering
                </button>

                <button
                  type="button"
                  onClick={() => handleGameFilterChange('yugioh')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiGameFilter === 'yugioh' ? '1px solid var(--color-accent-yellow)' : '1px solid var(--card-border)',
                    backgroundColor: apiGameFilter === 'yugioh' ? 'rgba(250, 204, 21, 0.15)' : 'transparent',
                    color: apiGameFilter === 'yugioh' ? 'var(--color-accent-yellow)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Yu-Gi-Oh!
                </button>

                <button
                  type="button"
                  onClick={() => handleGameFilterChange('onepiece')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiGameFilter === 'onepiece' ? '1px solid #f97316' : '1px solid var(--card-border)',
                    backgroundColor: apiGameFilter === 'onepiece' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                    color: apiGameFilter === 'onepiece' ? '#f97316' : 'var(--color-on-surface-variant)',
                  }}
                >
                  One Piece TCG
                </button>
              </div>

              {/* Form de Busca Live */}
              <form onSubmit={handleSearchApi} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {apiGameFilter === 'pokemon' && (
                  <div style={{ width: '230px' }}>
                    <SystemSelect<string>
                      value={apiPokemonSetFilter}
                      onChange={(val) => {
                        setApiPokemonSetFilter(val);
                        carregarCardsDaApi(apiGameFilter, apiSearchQuery, val);
                      }}
                      options={[
                        { value: '', label: 'Todas as Coleções' },
                        ...pokemonSets.map((s) => ({
                          value: s.id,
                          label: s.name,
                          badge: s.id.toUpperCase(),
                        })),
                      ]}
                      placeholder="Coleção / Set..."
                    />
                  </div>
                )}
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-outline)',
                    }}
                  />
                  <input
                    type="text"
                    className="system-input"
                    placeholder={
                      apiGameFilter === 'pokemon'
                        ? 'Digite a carta ou coleção (ex: Evoluções Prismáticas, Charizard, 151)...'
                        : 'Digite o nome do card (ex: Charizard, Black Lotus, Blue-Eyes, Luffy, Pikachu)...'
                    }
                    value={apiSearchQuery}
                    onChange={(e) => setApiSearchQuery(e.target.value)}
                    style={{ paddingLeft: '38px', height: '42px', fontSize: '13px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingApiCards}
                  className="btn-primary"
                  style={{ height: '42px', padding: '0 20px', fontWeight: 700, fontSize: '13px' }}
                >
                  {isLoadingApiCards ? 'Buscando...' : 'Buscar'}
                </button>
              </form>

              {/* Filtros por Tipo de Item: Todos / Booster Packs / Cards Avulsos */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase' }}>
                  Tipo de Produto:
                </span>
                <button
                  type="button"
                  onClick={() => setApiFilterType('all')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiFilterType === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
                    backgroundColor: apiFilterType === 'all' ? 'rgba(216, 185, 255, 0.18)' : 'transparent',
                    color: apiFilterType === 'all' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  Todos ({apiCards.length})
                </button>

                <button
                  type="button"
                  onClick={() => setApiFilterType('sealed')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiFilterType === 'sealed' ? '1px solid #ec4899' : '1px solid var(--card-border)',
                    backgroundColor: apiFilterType === 'sealed' ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
                    color: apiFilterType === 'sealed' ? '#f472b6' : 'var(--color-on-surface-variant)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  📦 Booster Packs & Boxes ({apiCards.filter(c => c.categoria === 'Booster Pack' || c.categoria === 'Booster Box').length})
                </button>

                <button
                  type="button"
                  onClick={() => setApiFilterType('singles')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: apiFilterType === 'singles' ? '1px solid #38bdf8' : '1px solid var(--card-border)',
                    backgroundColor: apiFilterType === 'singles' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                    color: apiFilterType === 'singles' ? '#38bdf8' : 'var(--color-on-surface-variant)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  🎴 Cards Avulsos ({apiCards.filter(c => !c.categoria || c.categoria === 'Carta Avulsa').length})
                </button>

                {apiTotalCount > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                    Exibindo {apiCards.length} de {apiTotalCount} itens disponíveis
                  </span>
                )}
              </div>
            </div>

            {/* Grid dos Cards do Catálogo Oficial */}
            {isLoadingApiCards ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-outline)' }}>
                <RefreshCw size={36} className="spin" style={{ margin: '0 auto 14px', color: 'var(--color-primary)' }} />
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Consultando catálogo oficial de cards...</p>
                <span style={{ fontSize: '12.5px' }}>Carregando imagens em alta resolução, raridades e valores de referência.</span>
              </div>
            ) : apiCards.length === 0 ? (
              <div
                className="glass-panel"
                style={{
                  padding: '50px 20px',
                  textAlign: 'center',
                  borderRadius: '16px',
                  color: 'var(--color-outline)',
                }}
              >
                <Globe size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Nenhum card encontrado no catálogo.</p>
                <span style={{ fontSize: '13px' }}>
                  Tente buscar por termos populares em inglês como &ldquo;Dragon&rdquo;, &ldquo;Pikachu&rdquo;, &ldquo;Lotus&rdquo; ou &ldquo;Luffy&rdquo;.
                </span>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '18px',
                  }}
                >
                  {apiCards
                    .filter((card) => {
                      if (apiFilterType === 'sealed') return card.categoria === 'Booster Pack' || card.categoria === 'Booster Box';
                      if (apiFilterType === 'singles') return !card.categoria || card.categoria === 'Carta Avulsa';
                      return true;
                    })
                    .map((card) => {
                      const existingProduct = findExistingProductForApiCard(card);
                      const isImporting = importingCardUid === card.uid;
                      const custom = apiCardCustoms[card.uid] || {
                        stock: 5,
                        price: card.precoMercadoBrl > 0 ? card.precoMercadoBrl : 19.9,
                        minStock: 3,
                      };

                      return (
                        <div
                          key={card.uid}
                          className="glass-panel"
                          style={{
                            padding: '16px',
                            borderRadius: '16px',
                            border: existingProduct
                              ? '1px solid rgba(74, 222, 128, 0.35)'
                              : '1px solid var(--card-border)',
                            backgroundColor: existingProduct
                              ? 'rgba(74, 222, 128, 0.04)'
                              : 'var(--color-surface-container-low)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '14px',
                            position: 'relative',
                            transition: 'transform 0.2s ease, border-color 0.2s ease',
                          }}
                        >
                          {/* Topo do Card */}
                          <div style={{ display: 'flex', gap: '14px' }}>
                            {/* Imagem do Card */}
                            <div
                              style={{
                                width: '84px',
                                height: '116px',
                                borderRadius: '10px',
                                backgroundColor: 'var(--color-surface-container)',
                                overflow: 'hidden',
                                flexShrink: 0,
                                border: '1px solid var(--card-border)',
                                position: 'relative',
                              }}
                            >
                              {card.imagemUrl ? (
                                <img
                                  src={card.imagemUrl}
                                  alt={card.nome}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  loading="lazy"
                                />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Package size={24} color="var(--color-outline)" />
                                </div>
                              )}
                            </div>

                            {/* Informações */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span className="badge badge-muted" style={{ fontSize: '10px' }}>
                                  {card.jogoNome}
                                </span>
                                {card.raridade && (
                                  <span
                                    className="badge badge-primary"
                                    style={{
                                      fontSize: '10px',
                                      fontFamily: 'var(--font-mono)',
                                    }}
                                  >
                                    {card.raridade}
                                  </span>
                                )}
                              </div>

                              <h4
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: 'var(--color-headline)',
                                  margin: '2px 0 0',
                                  lineHeight: 1.3,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={card.nome}
                              >
                                {card.nome}
                              </h4>

                              <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                                {card.colecao} {card.codigoCarta ? `• #${card.codigoCarta}` : ''}
                              </span>

                              <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block' }}>
                                  Preço de Mercado:
                                </span>
                                <span
                                  style={{
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--color-primary)',
                                  }}
                                >
                                  R$ {formatBRL(card.precoMercadoBrl > 0 ? card.precoMercadoBrl : 19.9)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status no Catálogo */}
                          {existingProduct ? (
                            existingProduct.ativo === false ? (
                              <div
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <AlertTriangle size={14} color="#f87171" />
                                  <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                    Inativo ({existingProduct.estoque} un.)
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => reactivateProduct(existingProduct.id)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#22c55e',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Reativar este produto no catálogo público"
                                >
                                  Reativar
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(74, 222, 128, 0.1)',
                                  border: '1px solid rgba(74, 222, 128, 0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Check size={14} color="#4ade80" />
                                  <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                    Em Estoque: {existingProduct.estoque} un.
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleQuickInlineStock(existingProduct, 5)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#4ade80',
                                    color: '#000000',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Adicionar +5 unidades rapidamente a este produto existente"
                                >
                                  +5 un.
                                </button>
                              </div>
                            )
                          ) : (
                            <div
                              style={{
                                padding: '10px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--card-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              {/* Parâmetros rápidos de importação */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '3px' }}>
                                    QTD. INICIAL
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    className="system-input"
                                    value={custom.stock}
                                    onChange={(e) =>
                                      setApiCardCustoms((prev) => ({
                                        ...prev,
                                        [card.uid]: {
                                          ...custom,
                                          stock: Math.max(1, parseInt(e.target.value, 10) || 1),
                                        },
                                      }))
                                    }
                                    style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '3px' }}>
                                    PREÇO VENDA (R$)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    className="system-input"
                                    value={formatMoneyInput(custom.price)}
                                    onChange={(e) =>
                                      setApiCardCustoms((prev) => ({
                                        ...prev,
                                        [card.uid]: {
                                          ...custom,
                                          price: parseMoneyToFloat(e.target.value),
                                        },
                                      }))
                                    }
                                    placeholder="0,00"
                                    style={{ height: '32px', fontSize: '12px', padding: '4px 8px', fontFamily: 'var(--font-mono)' }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleQuickImportApiCard(card)}
                                  disabled={isImporting}
                                  className="btn-primary"
                                  style={{
                                    flex: 1,
                                    height: '34px',
                                    fontSize: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    fontWeight: 700,
                                  }}
                                >
                                  <Download size={13} />
                                  {isImporting ? 'Cadastrando...' : 'Importar ao Estoque'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenConfigApiCard(card)}
                                  className="btn-outline"
                                  style={{
                                    padding: '0 10px',
                                    height: '34px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Configurar categoria, estoque mínimo e detalhes antes de importar"
                                >
                                  <SlidersHorizontal size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Botão Carregar Mais Cartas da Coleção (Paginação Contínua) */}
                {apiHasMore && !isLoadingApiCards && (
                  <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <button
                      type="button"
                      onClick={handleLoadMoreApi}
                      disabled={isLoadingMoreApi}
                      className="btn-outline"
                      style={{
                        padding: '12px 28px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {isLoadingMoreApi ? (
                        'Carregando mais cartas...'
                      ) : (
                        <>
                          <Plus size={15} /> Carregar Mais 24 Cartas da Coleção (Página {apiPage + 1})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            ABA 3: HISTÓRICO & AUDITORIA DE MOVIMENTAÇÕES
           ========================================================================= */}
        {activeAdminTab === 'movements' && (
          <div className="admin-animate-fade">
            <div
              className="glass-panel"
              style={{
                position: 'relative',
                zIndex: 30,
                padding: '20px 24px',
                borderRadius: '16px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--color-headline)' }}>
                  Histórico de Movimentações de Estoque
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                  Auditoria de todas as entradas, baixas, compras e ajustes de inventário.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ minWidth: '200px' }}>
                  <SystemSelect<'all' | 'entrada' | 'saida'>
                    size="sm"
                    value={movementTypeFilter}
                    onChange={(val) => setMovementTypeFilter(val)}
                    options={[
                      { value: 'all', label: `Todas as Operações (${stockMovements.length})` },
                      { value: 'entrada', label: 'Apenas Entradas (+)' },
                      { value: 'saida', label: 'Apenas Saídas (-)' },
                    ]}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => refreshStockMovements()}
                  className="btn-outline"
                  style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} /> Atualizar
                </button>
              </div>
            </div>

            <div className="glass-panel" style={{ position: 'relative', zIndex: 1, padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                {filteredMovements.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <History size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Nenhuma movimentação registrada.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--card-border)',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          color: 'var(--color-outline)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        <th style={{ padding: '14px 16px' }}>Data & Hora</th>
                        <th style={{ padding: '14px 12px' }}>Produto</th>
                        <th style={{ padding: '14px 12px' }}>Operação</th>
                        <th style={{ padding: '14px 12px' }}>Qtd.</th>
                        <th style={{ padding: '14px 12px' }}>Saldo Resultante</th>
                        <th style={{ padding: '14px 12px' }}>Motivo / Justificativa</th>
                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((m) => {
                        const isEntrada = m.tipo === 'entrada';
                        return (
                          <tr
                            key={m.id_movimentacao}
                            className="admin-table-row"
                            style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}
                          >
                            <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-outline)' }}>
                              {m.data_hora}
                            </td>

                            <td style={{ padding: '12px 12px', fontWeight: 700, color: 'var(--color-headline)' }}>
                              {m.produto_nome}{' '}
                              <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontWeight: 400 }}>
                                (#{m.produto_id})
                              </span>
                            </td>

                            <td style={{ padding: '12px 12px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-mono)',
                                  backgroundColor: isEntrada ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isEntrada ? '#4ade80' : '#f87171',
                                }}
                              >
                                {isEntrada ? '+ ENTRADA' : '- SAÍDA'}
                              </span>
                            </td>

                            <td
                              style={{
                                padding: '12px 12px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 800,
                                color: isEntrada ? '#4ade80' : '#f87171',
                              }}
                            >
                              {isEntrada ? `+${m.quantidade}` : `-${m.quantidade}`} un.
                            </td>

                            <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                              {m.saldo_anterior} &rarr; <strong>{m.saldo_posterior} un.</strong>
                            </td>

                            <td style={{ padding: '12px 12px', color: 'var(--color-on-surface-variant)' }}>
                              {m.motivo}
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-primary)' }}>
                              {m.responsavel}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: GESTÃO CENTRALIZADA DE PEDIDOS
           ========================================================================= */}
        {activeAdminTab === 'orders' && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Gestão Centralizada de Pedidos ({orders.length})
              </h3>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: '#4ade80', fontWeight: 700 }}>
                Faturamento Total: R$ {formatBRL(faturamentoTotal)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orders.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-outline)' }}>
                  <ShoppingBag size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>Nenhum pedido efetuado ainda.</p>
                </div>
              ) : (
                orders.map((o) => (
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
                      position: 'relative',
                    }}
                  >
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: 'var(--color-headline)', marginRight: '10px' }}>
                        Pedido #{o.id_pedido}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                        {o.data} • Cliente: <strong>{o.cliente_nome}</strong> ({o.cliente_email})
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--color-outline)', marginTop: '4px' }}>
                        Itens: {o.itens.map((i) => `${i.quantidade}x ${i.produto.nome}`).join(', ')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                        R$ {formatBRL(o.valor_total)}
                      </span>
                      <div style={{ width: '150px' }}>
                        <SystemSelect<Order['status']>
                          size="sm"
                          value={o.status}
                          onChange={(val) => updateOrderStatus(o.id_pedido, val)}
                          options={[
                            { value: 'Pendente', label: 'Pendente' },
                            { value: 'Processando', label: 'Processando' },
                            { value: 'Finalizado', label: 'Finalizado' },
                            { value: 'Cancelado', label: 'Cancelado' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 5: USUÁRIOS & EQUIPE
           ========================================================================= */}
        {activeAdminTab === 'users' && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                  Colaboradores & Permissões ({userList.length})
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                  Gerencie funções, credenciais de acesso e administradores do sistema.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(true)}
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: '12.5px', fontWeight: 700 }}
              >
                + Cadastrar Novo Membro
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {isLoadingUsers ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-outline)' }}>
                  Carregando lista de colaboradores...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--color-outline)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 10px' }}>ID</th>
                      <th style={{ padding: '12px 10px' }}>Nome</th>
                      <th style={{ padding: '12px 10px' }}>E-mail</th>
                      <th style={{ padding: '12px 10px' }}>Nível de Acesso</th>
                      <th style={{ padding: '12px 10px' }}>Cargo / Função</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((u) => (
                      <tr key={u.id} className="admin-table-row" style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)' }}>
                          #{u.id}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--color-headline)' }}>
                          {u.nome}
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--color-on-surface-variant)' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span
                            className={`badge ${u.role === 'admin'
                              ? 'badge-purple'
                              : u.role === 'funcionario'
                                ? 'badge-pink'
                                : 'badge-muted'
                              }`}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
                          {u.cargo || (u.role === 'admin' ? 'Administrador Geral' : u.role === 'funcionario' ? 'Atendente' : 'Cliente')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAIS OPERACIONAIS
           ========================================================================= */}

        {/* Modal 1: Entrada de Estoque */}
        {isEntryModalOpen && (
          <SystemModal onClose={() => setIsEntryModalOpen(false)} maxWidth="520px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Movimentação de Entrada</span>
                <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                  Registrar Entrada de Mercadoria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Produto a Receber *
                </label>
                <SystemSelect<number>
                  value={selectedStockProduct?.id || (activeProducts[0]?.id ?? 0)}
                  onChange={(val) => {
                    const found = activeProducts.find((p) => p.id === val);
                    if (found) setSelectedStockProduct(found);
                  }}
                  options={activeProducts.map((p) => ({
                    value: p.id,
                    label: `#${p.id} - ${p.nome}`,
                    badge: `${p.estoque} un.`,
                  }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Quantidade a Adicionar *
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
                  Motivo / Fornecedor / Nota *
                </label>
                <input
                  type="text"
                  required
                  className="system-input"
                  value={stockReasonInput}
                  onChange={(e) => setStockReasonInput(e.target.value)}
                  placeholder="Ex: Compra Distribuidor Copag"
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {['Compra Distribuidor', 'Reposição de Balcão', 'Devolução de Cliente', 'Ajuste de Inventário'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setStockReasonInput(chip)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '4px',
                        color: 'var(--color-on-surface-variant)',
                        fontSize: '11px',
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
                <button type="submit" disabled={isSubmittingStock} className="btn-primary">
                  {isSubmittingStock ? 'Registrando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </SystemModal>
        )}

        {/* Modal 2: Baixa de Estoque */}
        {isExitModalOpen && (
          <SystemModal onClose={() => setIsExitModalOpen(false)} maxWidth="520px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                  Movimentação de Saída
                </span>
                <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                  Dar Baixa no Estoque
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmExit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Produto a Dar Baixa *
                </label>
                <SystemSelect<number>
                  value={selectedStockProduct?.id || (activeProducts[0]?.id ?? 0)}
                  onChange={(val) => {
                    const found = activeProducts.find((p) => p.id === val);
                    if (found) setSelectedStockProduct(found);
                  }}
                  options={activeProducts.map((p) => ({
                    value: p.id,
                    label: `#${p.id} - ${p.nome}`,
                    badge: p.estoque <= 0 ? 'Esgotado' : `${p.estoque} un.`,
                    disabled: p.estoque <= 0,
                  }))}
                />
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
                      ? `${selectedStockProduct.estoque} - ${parseInt(stockAmountInput, 10) || 0} = ${Math.max(
                        0,
                        selectedStockProduct.estoque - (parseInt(stockAmountInput, 10) || 0)
                      )} un.`
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
                  placeholder="Ex: Embalagem danificada / Avaria"
                />
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
                        fontSize: '11px',
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
                  disabled={isSubmittingStock || !selectedStockProduct || selectedStockProduct.estoque <= 0}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
                >
                  {isSubmittingStock ? 'Confirmando...' : 'Confirmar Baixa'}
                </button>
              </div>
            </form>
          </SystemModal>
        )}

        {/* Modal 3: Estoque Mínimo */}
        {isMinStockModalOpen && (
          <SystemModal onClose={() => setIsMinStockModalOpen(false)} maxWidth="440px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Parâmetro de Segurança</span>
                <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                  Definir Estoque Mínimo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMinStockModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '16px' }}>
              Produto: <strong>{selectedStockProduct?.nome}</strong>
            </p>

            <form onSubmit={handleConfirmMinStock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Limite para Alerta de Reposição (unidades)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="system-input"
                  value={minStockValueInput}
                  onChange={(e) => setMinStockValueInput(e.target.value)}
                />
              </div>

              <div className="system-modal-actions">
                <button type="button" onClick={() => setIsMinStockModalOpen(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmittingStock} className="btn-primary">
                  Salvar Limite
                </button>
              </div>
            </form>
          </SystemModal>
        )}

        {/* Modal 4: Configuração Detalhada de Card da API */}
        {configuringApiCard && (
          <SystemModal onClose={() => setConfiguringApiCard(null)} maxWidth="520px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Adicionar ao Estoque</span>
                <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                  Configurar e Adicionar Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringApiCard(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
              <img
                src={configuringApiCard.imagemUrl}
                alt={configuringApiCard.nome}
                style={{ width: '70px', height: '98px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--color-headline)', fontWeight: 700 }}>
                  {configuringApiCard.nome}
                </h4>
                <span style={{ fontSize: '12px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                  {configuringApiCard.jogoNome} • {configuringApiCard.colecao}
                </span>
                <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700, marginTop: '6px' }}>
                  Preço de Referência: R$ {formatBRL(configuringApiCard.precoMercadoBrl)}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveConfiguredApiCard} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Estoque Inicial *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="system-input"
                    value={cfgStock}
                    onChange={(e) => setCfgStock(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Preço de Venda (R$) *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-outline)',
                        pointerEvents: 'none',
                      }}
                    >
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      className="system-input"
                      value={cfgPrice}
                      onChange={(e) => setCfgPrice(formatMoneyInput(e.target.value))}
                      placeholder="0,00"
                      style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="system-input"
                    value={cfgMinStock}
                    onChange={(e) => setCfgMinStock(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Categoria
                  </label>
                  <SystemSelect<ProductCategory>
                    value={cfgCategory}
                    onChange={(val) => setCfgCategory(val)}
                    options={CATEGORY_OPTIONS.map((c) => ({
                      value: c.value,
                      label: c.label,
                    }))}
                  />
                </div>
              </div>

              <div className="system-modal-actions">
                <button type="button" onClick={() => setConfiguringApiCard(null)} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" disabled={Boolean(importingCardUid)} className="btn-primary">
                  {importingCardUid ? 'Cadastrando no Estoque...' : 'Confirmar & Adicionar ao Estoque'}
                </button>
              </div>
            </form>
          </SystemModal>
        )}

        {/* Modal 5: Criação Manual de Produto */}
        {isCreateProductModalOpen && (
          <CreateManualProductModal
            isOpen={isCreateProductModalOpen}
            onClose={() => setIsCreateProductModalOpen(false)}
            onCreate={addProduct}
          />
        )}

        {/* Modal 6: Edição de Produto Cadastrado */}
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={(updated) => editProduct(editingProduct.id, updated)}
            onDelete={(id) => deleteProduct(id)}
            onReactivate={(id) => reactivateProduct(id)}
            onPermanentDelete={(id) => removeProductPermanently(id)}
          />
        )}

        {/* Modal 7: Senha Admin */}
        {isPasswordModalOpen && (
          <SystemModal onClose={() => setIsPasswordModalOpen(false)} maxWidth="440px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Segurança</span>
                <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                  Alterar Senha de Administrador
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

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
                />
              </div>

              <div className="system-modal-actions">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" disabled={isUpdatingPassword} className="btn-primary">
                  {isUpdatingPassword ? 'Atualizando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </SystemModal>
        )}

        {/* Modal 8: Novo Membro da Equipe */}
        {isNewUserModalOpen && (
          <SystemModal onClose={() => setIsNewUserModalOpen(false)} maxWidth="480px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Gestão de Equipe</span>
                <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                  Cadastrar Novo Membro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Nome Completo *
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
                  E-mail Institucional *
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
                  Senha Inicial *
                </label>
                <input
                  type="password"
                  required
                  className="system-input"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Nível de Acesso
                  </label>
                  <SystemSelect<UserRole>
                    value={newUserRole}
                    onChange={(val) => setNewUserRole(val)}
                    options={[
                      { value: 'funcionario', label: 'Funcionário' },
                      { value: 'admin', label: 'Administrador' },
                      { value: 'cliente', label: 'Cliente' },
                    ]}
                  />
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
                <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </SystemModal>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-MODAL: CADASTRO MANUAL DE PRODUTO
// ============================================================================
interface CreateManualProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (product: Omit<Product, 'id'>) => Promise<void> | void;
}

const CreateManualProductModal: React.FC<CreateManualProductModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('5');
  const [estoqueMinimo, setEstoqueMinimo] = useState('3');
  const [jogo, setJogo] = useState<GameId>('pokemon');
  const [categoria, setCategoria] = useState<ProductCategory>('Booster Pack');
  const [imagemUrl, setImagemUrl] = useState('');
  const [descricao, setDescricao] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece',
      outros: 'Acessórios / Geral',
    };

    await onCreate({
      nome: nome.trim(),
      subtitulo: subtitulo.trim() || `${categoria} • ${gameNames[jogo]}`,
      preco: parseMoneyToFloat(preco),
      estoque: parseInt(estoque, 10) || 0,
      estoqueMinimo: Math.max(0, parseInt(estoqueMinimo, 10) || 3),
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      descricao: descricao.trim() || 'Produto oficial licenciado da loja Noble Deck.',
      imagemUrl: imagemUrl.trim(),
      isNovo: true,
      isDestaque: false,
    });

    onClose();
  };

  return (
    <SystemModal onClose={onClose} maxWidth="600px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '4px' }}>Cadastro Manual</span>
          <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Adicionar Novo Produto ao Estoque
          </h3>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Nome do Produto *
          </label>
          <input
            type="text"
            required
            className="system-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Booster Box Escarlate e Violeta"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Subtítulo / Coleção / Código (Opcional)
          </label>
          <input
            type="text"
            className="system-input"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Ex: Coleção Especial 151 • Booster Pack"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Jogo *
            </label>
            <SystemSelect<GameId>
              value={jogo}
              onChange={(val) => setJogo(val)}
              options={GAME_OPTIONS.map((g) => ({
                value: g.value,
                label: g.label,
                badge: g.badge,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Categoria *
            </label>
            <SystemSelect<ProductCategory>
              value={categoria}
              onChange={(val) => setCategoria(val)}
              options={CATEGORY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Preço (R$) *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-outline)',
                  pointerEvents: 'none',
                }}
              >
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                className="system-input"
                value={preco}
                onChange={(e) => setPreco(formatMoneyInput(e.target.value))}
                placeholder="0,00"
                style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Estoque Inicial *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Estoque Mínimo *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            URL da Imagem
          </label>
          <input
            type="url"
            className="system-input"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Descrição
          </label>
          <textarea
            className="system-input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes sobre a edição, estado ou conteúdo..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="system-modal-actions">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Cadastrar Produto no Estoque
          </button>
        </div>
      </form>
    </SystemModal>
  );
};

// ============================================================================
// SUB-MODAL: EDIÇÃO DE PRODUTO EXISTENTE
// ============================================================================
interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: (updated: Partial<Product>) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
  onReactivate: (id: number) => Promise<void> | void;
  onPermanentDelete: (id: number) => Promise<void> | void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onSave,
  onDelete,
  onReactivate,
  onPermanentDelete,
}) => {
  const { showToastConfirm } = useApp();
  const [nome, setNome] = useState(product.nome);
  const [preco, setPreco] = useState(
    product.preco ? formatMoneyInput(product.preco) : ''
  );
  const [estoque, setEstoque] = useState(String(product.estoque));
  const [estoqueMinimo, setEstoqueMinimo] = useState(String(product.estoqueMinimo ?? 3));
  const [jogo, setJogo] = useState<GameId>(product.jogo);
  const [categoria, setCategoria] = useState<ProductCategory>(product.categoria);
  const [imagemUrl, setImagemUrl] = useState(product.imagemUrl || '');
  const [descricao, setDescricao] = useState(product.descricao || '');

  const isInactive = product.ativo === false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece',
      outros: 'Acessórios / Geral',
    };

    await onSave({
      nome: nome.trim(),
      preco: parseMoneyToFloat(preco),
      estoque: parseInt(estoque, 10) || 0,
      estoqueMinimo: Math.max(0, parseInt(estoqueMinimo, 10) || 3),
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      imagemUrl: imagemUrl.trim(),
      descricao: descricao.trim(),
    });

    onClose();
  };

  return (
    <SystemModal onClose={onClose} maxWidth="600px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.18)' : 'rgba(74, 222, 128, 0.15)',
                border: isInactive ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(74, 222, 128, 0.4)',
                color: isInactive ? '#f87171' : '#4ade80',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isInactive ? '#ef4444' : '#22c55e',
                }}
              />
              ID #{product.id} • {isInactive ? 'PRODUTO INATIVO' : 'PRODUTO ATIVO'}
            </span>
          </div>
          <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Editar Informações do Produto
          </h3>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Banner de Status Ativo / Inativo em Destaque */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(74, 222, 128, 0.08)',
          border: isInactive ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(74, 222, 128, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(74, 222, 128, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} color={isInactive ? '#f87171' : '#4ade80'} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: isInactive ? '#f87171' : '#4ade80', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isInactive ? 'Status: Inativo (Oculto da Loja)' : 'Status: Ativo (Visível na Loja)'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
              {isInactive
                ? 'Este produto não aparece na vitrine pública nem pode ser comprado por clientes.'
                : 'Este produto está publicado e disponível para clientes comprarem.'}
            </div>
          </div>
        </div>

        <div>
          {isInactive ? (
            <button
              type="button"
              onClick={async () => {
                await onReactivate(product.id);
                onClose();
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(74, 222, 128, 0.5)',
                backgroundColor: '#22c55e',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RotateCcw size={12} /> Reativar Agora
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await onDelete(product.id);
                onClose();
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Inativar Produto
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Nome do Produto *
          </label>
          <input
            type="text"
            required
            className="system-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Jogo *
            </label>
            <SystemSelect<GameId>
              value={jogo}
              onChange={(val) => setJogo(val)}
              options={GAME_OPTIONS.map((g) => ({
                value: g.value,
                label: g.label,
                badge: g.badge,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Categoria *
            </label>
            <SystemSelect<ProductCategory>
              value={categoria}
              onChange={(val) => setCategoria(val)}
              options={CATEGORY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Preço (R$) *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-outline)',
                  pointerEvents: 'none',
                }}
              >
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                className="system-input"
                value={preco}
                onChange={(e) => setPreco(formatMoneyInput(e.target.value))}
                placeholder="0,00"
                style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Saldo em Estoque *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Estoque Mínimo *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            URL da Imagem
          </label>
          <input
            type="url"
            className="system-input"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Descrição
          </label>
          <textarea
            className="system-input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <div>
            {isInactive ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={async () => {
                    await onReactivate(product.id);
                    onClose();
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(74, 222, 128, 0.4)',
                    backgroundColor: 'rgba(74, 222, 128, 0.12)',
                    color: '#4ade80',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Reativar Produto
                </button>

                <button
                  type="button"
                  onClick={() => {
                    showToastConfirm({
                      message: `Excluir permanentemente "${product.nome}" do banco de dados? Esta ação não pode ser desfeita.`,
                      confirmText: 'Excluir definitivamente',
                      cancelText: 'Cancelar',
                      onConfirm: async () => {
                        await onPermanentDelete(product.id);
                        onClose();
                      },
                    });
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Excluir Definitivo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await onDelete(product.id);
                  onClose();
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: '#f87171',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Desativar Produto
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn-outline">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar Alterações
            </button>
          </div>
        </div>
      </form>
    </SystemModal>
  );
};
