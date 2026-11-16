import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldAlert,
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
  Search,
  Boxes,
  Globe,
  Download,
  Check,
  SlidersHorizontal,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Home,
  UserCheck,
  ChevronLeft,
  ChevronRight,
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
import { api, formatBRL } from '../services/api';
import { searchLiveCards, getPokemonSets, type PokemonSetOption } from '../services/tcgApi';
import { SystemSelect } from '../components/SystemSelect';
import { SystemModal } from '../components/SystemModal';

type AdminTab = 'movements' | 'orders' | 'users' | 'api-catalog';
type MovementFilter = 'all' | 'entrada' | 'saida' | 'ajuste';
type MovementSort = 'newest' | 'oldest' | 'qty-desc';
type OrderStatusFilter = 'all' | Order['status'];
type OrderSort = 'newest' | 'oldest' | 'total-desc' | 'total-asc';
type UserGroupFilter = 'team' | 'customers' | 'all';

const GAME_OPTIONS: { value: GameId; label: string; badge: string; color: string }[] = [
  { value: 'pokemon', label: 'Pokémon TCG', badge: 'Pokémon', color: 'var(--color-accent-purple)' },
  { value: 'magic', label: 'Magic: The Gathering', badge: 'MTG', color: 'var(--color-accent-pink)' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!', badge: 'YGO', color: 'var(--color-accent-yellow)' },
  { value: 'onepiece', label: 'One Piece Card Game', badge: 'OP', color: '#ea580c' },
  { value: 'outros', label: 'Acessórios / Geral', badge: 'Geral', color: 'var(--color-primary)' },
];

const GAME_LABELS: Record<GameId, string> = {
  pokemon: 'Pokémon TCG',
  magic: 'Magic: The Gathering',
  yugioh: 'Yu-Gi-Oh!',
  onepiece: 'One Piece Card Game',
  outros: 'Acessórios / Geral',
};

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'Booster Box', label: 'Booster Box' },
  { value: 'Deck Commander', label: 'Deck Commander' },
  { value: 'Booster Pack', label: 'Booster Pack' },
  { value: 'Starter Deck', label: 'Starter Deck' },
  { value: 'Carta Avulsa', label: 'Carta Avulsa' },
  { value: 'Acessórios', label: 'Acessórios' },
];

const MOVEMENTS_PER_PAGE = 15;
const ORDERS_PER_PAGE = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeDecimalInput = (raw: string): string => {
  return raw.replace(/[^\d.,]/g, '');
};

const parseMoneyToFloat = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  }
  const trimmed = String(value ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .trim();
  if (!trimmed) return 0;

  let normalized = trimmed;
  if (trimmed.includes(',')) {
    // Formato pt-BR com vírgula decimal: remove pontos de milhar e converte vírgula para ponto
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      // Ex: "1.250" tratado como milhar apenas se tiver exatamente 3 dígitos após ponto único
      normalized = parts.join('');
    } else if (parts.length > 2) {
      const decimal = parts.pop() || '';
      normalized = decimal.length <= 2 ? `${parts.join('')}.${decimal}` : `${parts.join('')}${decimal}`;
    }
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
};

const parseNonNegativeInt = (raw: string, fallback: number): number => {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? fallback : Math.max(0, parsed);
};

const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim());

const maskEmail = (email: string): string => {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return trimmed;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 2))}@${domain}`;
};

interface SemanticTones {
  successText: string;
  successBg: string;
  successBorder: string;
  successSolidBg: string;
  successSolidText: string;
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;
  warningText: string;
  warningBg: string;
  warningBorder: string;
  infoText: string;
  infoBg: string;
  infoBorder: string;
  subtleSurface: string;
  activeTabBg: string;
  activeTabText: string;
  activeTabBorder: string;
}

const getSemanticTones = (isLight: boolean): SemanticTones => {
  if (isLight) {
    return {
      successText: '#166534',
      successBg: 'rgba(22, 163, 74, 0.10)',
      successBorder: 'rgba(22, 163, 74, 0.34)',
      successSolidBg: '#15803d',
      successSolidText: '#ffffff',
      dangerText: '#b91c1c',
      dangerBg: 'rgba(220, 38, 38, 0.09)',
      dangerBorder: 'rgba(220, 38, 38, 0.32)',
      warningText: '#92400e',
      warningBg: 'rgba(217, 119, 6, 0.11)',
      warningBorder: 'rgba(217, 119, 6, 0.36)',
      infoText: '#0369a1',
      infoBg: 'rgba(2, 132, 199, 0.10)',
      infoBorder: 'rgba(2, 132, 199, 0.32)',
      subtleSurface: 'var(--color-surface-container-low)',
      activeTabBg: 'rgba(255, 196, 0, 0.22)',
      activeTabText: '#7A4B00',
      activeTabBorder: 'rgba(212, 128, 0, 0.45)',
    };
  }
  return {
    successText: '#4ade80',
    successBg: 'rgba(34, 197, 94, 0.13)',
    successBorder: 'rgba(74, 222, 128, 0.35)',
    successSolidBg: '#15803d',
    successSolidText: '#ffffff',
    dangerText: '#f87171',
    dangerBg: 'rgba(239, 68, 68, 0.14)',
    dangerBorder: 'rgba(248, 113, 113, 0.38)',
    warningText: '#fbbf24',
    warningBg: 'rgba(245, 158, 11, 0.14)',
    warningBorder: 'rgba(251, 191, 36, 0.38)',
    infoText: '#38bdf8',
    infoBg: 'rgba(56, 189, 248, 0.14)',
    infoBorder: 'rgba(56, 189, 248, 0.35)',
    subtleSurface: 'rgba(255, 255, 255, 0.035)',
    activeTabBg: 'rgba(255, 196, 0, 0.16)',
    activeTabText: 'var(--color-primary)',
    activeTabBorder: 'rgba(255, 210, 26, 0.4)',
  };
};

const getOrderAllowedStatuses = (status: Order['status']): Order['status'][] => {
  if (status === 'Cancelado') return ['Cancelado'];
  if (status === 'Finalizado') return ['Finalizado', 'Cancelado'];
  if (status === 'Enviado') return ['Enviado', 'Finalizado', 'Cancelado'];
  if (status === 'Processando') return ['Processando', 'Enviado', 'Finalizado', 'Cancelado'];
  return ['Pendente', 'Processando', 'Enviado', 'Finalizado', 'Cancelado'];
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-on-surface-variant)',
  marginBottom: '5px',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.04em',
};

const responsiveTwoColGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: '12px',
};

const responsiveThreeColGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px',
};

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    setCurrentTab,
    loginUser,
    logoutUser,
    products,
    addProduct,
    editProduct,
    reactivateProduct,
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

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const tones = useMemo(() => getSemanticTones(isLight), [isLight]);

  // Autenticação Admin
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Navegação Principal do Admin
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('movements');

  // Filtros & Paginação de Movimentações
  const [movementTypeFilter, setMovementTypeFilter] = useState<MovementFilter>('all');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementSort, setMovementSort] = useState<MovementSort>('newest');
  const [movementPage, setMovementPage] = useState(1);

  // Filtros, Refresh & Paginação de Pedidos
  const [ordersOverride, setOrdersOverride] = useState<Order[] | null>(null);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState<OrderSort>('newest');
  const [orderPage, setOrderPage] = useState(1);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<number, boolean>>({});

  // Equipe & Usuários
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userGroupFilter, setUserGroupFilter] = useState<UserGroupFilter>('team');
  const [userSearch, setUserSearch] = useState('');
  const [revealedEmails, setRevealedEmails] = useState<Record<number, boolean>>({});
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

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
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [apiFilterType, setApiFilterType] = useState<'all' | 'sealed' | 'singles'>('all');
  const [importingCardUid, setImportingCardUid] = useState<string | null>(null);
  const [updatingStockProductId, setUpdatingStockProductId] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Configurações inline de importação de cards da API (armazenadas como strings para edição fluida)
  const [apiCardCustoms, setApiCardCustoms] = useState<
    Record<string, { stockStr: string; priceStr: string; minStock: number }>
  >({});

  // Modais de Gestão de Estoque
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [selectedStockProductId, setSelectedStockProductId] = useState<number>(0);
  const [stockAmountInput, setStockAmountInput] = useState('5');
  const [stockReasonInput, setStockReasonInput] = useState('');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Modal de Criação Manual de Produto
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);

  // Modal de Configuração ao Importar da API
  const [configuringApiCard, setConfiguringApiCard] = useState<ExternalCard | null>(null);
  const [cfgStock, setCfgStock] = useState('5');
  const [cfgPrice, setCfgPrice] = useState('');
  const [cfgMinStock, setCfgMinStock] = useState('3');
  const [cfgCategory, setCfgCategory] = useState<ProductCategory>('Carta Avulsa');

  // Modais de Equipe & Senha
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Refs para controle de concorrência e verificação de criação confirmada
  const apiRequestIdRef = useRef(0);
  const latestApiCardsRef = useRef<ExternalCard[]>([]);
  const latestProductsRef = useRef<Product[]>(products);
  const latestOrdersOverrideRef = useRef<Order[] | null>(ordersOverride);

  useEffect(() => {
    latestApiCardsRef.current = apiCards;
  }, [apiCards]);

  useEffect(() => {
    latestProductsRef.current = products;
  }, [products]);

  useEffect(() => {
    latestOrdersOverrideRef.current = ordersOverride;
  }, [ordersOverride]);

  useEffect(() => {
    setOrdersOverride((prev) => {
      if (!prev) return null;
      const contextMap = new Map(orders.map((o) => [o.id_pedido, o]));
      const merged = prev.map((existing) => contextMap.get(existing.id_pedido) ?? existing);
      const seen = new Set(prev.map((o) => o.id_pedido));
      const newFromContext = orders.filter((o) => !seen.has(o.id_pedido));
      return [...newFromContext, ...merged];
    });
  }, [orders]);

  const isAuthenticated = Boolean(currentUser.email) && currentUser.id !== 0;
  const isAdmin = isAuthenticated && currentUser.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setOrdersOverride(null);
    }
  }, [isAdmin]);

  const carregarUsuarios = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const dados = await api.obterUsuarios();
      setUserList(Array.isArray(dados) ? dados : []);
    } catch {
      setUserList([]);
      showToast('Não foi possível carregar a lista de usuários.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isAdmin) return;
    carregarUsuarios();
    refreshStockMovements();
  }, [isAdmin, carregarUsuarios, refreshStockMovements]);

  const carregarCardsDaApi = useCallback(
    async (game: ActiveGameApi | 'all', query = '', setId?: string, page = 1) => {
      const requestId = ++apiRequestIdRef.current;

      if (page === 1) {
        setIsLoadingApiCards(true);
        setApiPage(1);
        setApiErrorMessage(null);
      } else {
        setIsLoadingMoreApi(true);
      }

      try {
        const { cards, errors, totalCount, hasMore } = await searchLiveCards(
          game,
          query.trim(),
          page,
          setId
        );

        if (requestId !== apiRequestIdRef.current) return;

        if (errors && errors.length > 0) {
          const msg = `Algumas fontes externas retornaram erro: ${errors.join(' • ')}`;
          setApiErrorMessage(msg);
          if (cards.length === 0) {
            showToast('Não foi possível consultar o catálogo oficial no momento.');
          }
        } else {
          setApiErrorMessage(null);
        }

        if (page === 1) {
          const seen = new Set<string>();
          const unique = cards.filter((c) => {
            if (seen.has(c.uid)) return false;
            seen.add(c.uid);
            return true;
          });
          setApiCards(unique);
          setApiHasMore(Boolean(hasMore));
          setApiTotalCount(typeof totalCount === 'number' && totalCount > 0 ? totalCount : 0);
        } else {
          const existingUids = new Set(latestApiCardsRef.current.map((c) => c.uid));
          const newUnique = cards.filter((c) => {
            if (existingUids.has(c.uid)) return false;
            existingUids.add(c.uid);
            return true;
          });

          if (newUnique.length === 0) {
            setApiHasMore(false);
            showToast('Todas as cartas disponíveis para este filtro já foram carregadas.');
          } else {
            setApiCards((prev) => [...prev, ...newUnique]);
            setApiHasMore(Boolean(hasMore));
          }
          if (typeof totalCount === 'number' && totalCount > 0) {
            setApiTotalCount(totalCount);
          }
        }

        setApiPage(page);
      } catch (err: unknown) {
        if (requestId !== apiRequestIdRef.current) return;
        const msg = err instanceof Error ? err.message : 'Erro de conexão com as APIs externas.';
        setApiErrorMessage(msg);
        if (page === 1) {
          setApiCards([]);
          setApiHasMore(false);
          setApiTotalCount(0);
        }
        showToast(msg);
      } finally {
        if (requestId === apiRequestIdRef.current) {
          setApiHasLoadedOnce(true);
          setIsLoadingApiCards(false);
          setIsLoadingMoreApi(false);
        }
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (!isAdmin || activeAdminTab !== 'api-catalog') return;
    let cancelled = false;
    getPokemonSets()
      .then((sets) => {
        if (!cancelled) setPokemonSets(sets);
      })
      .catch(() => {
        if (!cancelled) setPokemonSets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, activeAdminTab]);

  useEffect(() => {
    if (isAdmin && activeAdminTab === 'api-catalog' && !apiHasLoadedOnce) {
      setApiHasLoadedOnce(true);
      void carregarCardsDaApi(apiGameFilter, apiSearchQuery, apiPokemonSetFilter, 1);
    }
  }, [
    isAdmin,
    activeAdminTab,
    apiHasLoadedOnce,
    apiGameFilter,
    apiSearchQuery,
    apiPokemonSetFilter,
    carregarCardsDaApi,
  ]);

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

  // Produtos e Métricas de Estoque
  const activeProducts = useMemo(() => products.filter((p) => p.ativo !== false), [products]);
  const inactiveProducts = useMemo(() => products.filter((p) => p.ativo === false), [products]);
  const productsWithStock = useMemo(() => activeProducts.filter((p) => p.estoque > 0), [activeProducts]);
  const selectedStockProduct = useMemo(
    () => activeProducts.find((p) => p.id === selectedStockProductId) || null,
    [activeProducts, selectedStockProductId]
  );

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

  const totalAlertasReposicao = produtosCriticos.length + produtosEsgotados.length;

  // Pedidos atuais (sincronizáveis via Atualizar)
  const displayedOrdersSource = ordersOverride ?? orders;

  const orderRevenueSummary = useMemo(() => {
    let confirmado = 0;
    let emAberto = 0;
    let cancelado = 0;
    let canceladoCount = 0;

    for (const o of displayedOrdersSource) {
      const val = Number(o.valor_total) || 0;
      if (o.status === 'Finalizado') {
        confirmado += val;
      } else if (o.status === 'Cancelado') {
        cancelado += val;
        canceladoCount += 1;
      } else {
        emAberto += val;
      }
    }

    return { confirmado, emAberto, cancelado, canceladoCount };
  }, [displayedOrdersSource]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const list = displayedOrdersSource.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (!q) return true;
      const matchesMeta =
        String(o.id_pedido).includes(q) ||
        (o.numero ? String(o.numero).includes(q) : false) ||
        (o.codigo_rastreio || '').toLowerCase().includes(q) ||
        o.cliente_nome.toLowerCase().includes(q) ||
        o.cliente_email.toLowerCase().includes(q);
      const matchesItem = o.itens.some(
        (item) =>
          item.produto.nome.toLowerCase().includes(q) ||
          String(item.produto.id).includes(q)
      );
      return matchesMeta || matchesItem;
    });

    return [...list].sort((a, b) => {
      if (orderSort === 'oldest') return a.id_pedido - b.id_pedido;
      if (orderSort === 'total-desc') return (b.valor_total || 0) - (a.valor_total || 0);
      if (orderSort === 'total-asc') return (a.valor_total || 0) - (b.valor_total || 0);
      return b.id_pedido - a.id_pedido;
    });
  }, [displayedOrdersSource, orderStatusFilter, orderSearch, orderSort]);

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const safePage = Math.min(orderPage, orderTotalPages);
    const start = (safePage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, orderPage, orderTotalPages]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderStatusFilter, orderSearch, orderSort]);

  // Movimentações filtradas e paginadas
  const filteredMovements = useMemo(() => {
    const q = movementSearch.trim().toLowerCase();
    const list = stockMovements.filter((m) => {
      if (movementTypeFilter !== 'all' && m.tipo !== movementTypeFilter) return false;
      if (!q) return true;
      return (
        m.produto_nome.toLowerCase().includes(q) ||
        String(m.produto_id).includes(q) ||
        m.motivo.toLowerCase().includes(q) ||
        m.responsavel.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (movementSort === 'oldest') return a.id_movimentacao - b.id_movimentacao;
      if (movementSort === 'qty-desc') return b.quantidade - a.quantidade;
      return b.id_movimentacao - a.id_movimentacao;
    });
  }, [stockMovements, movementTypeFilter, movementSearch, movementSort]);

  const movementTotalPages = Math.max(1, Math.ceil(filteredMovements.length / MOVEMENTS_PER_PAGE));
  const paginatedMovements = useMemo(() => {
    const safePage = Math.min(movementPage, movementTotalPages);
    const start = (safePage - 1) * MOVEMENTS_PER_PAGE;
    return filteredMovements.slice(start, start + MOVEMENTS_PER_PAGE);
  }, [filteredMovements, movementPage, movementTotalPages]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementTypeFilter, movementSearch, movementSort]);

  // Filtragem do Catálogo Oficial (API)
  const filteredApiCards = useMemo(() => {
    return apiCards.filter((card) => {
      if (apiFilterType === 'sealed') {
        return card.categoria === 'Booster Pack' || card.categoria === 'Booster Box';
      }
      if (apiFilterType === 'singles') {
        return !card.categoria || card.categoria === 'Carta Avulsa';
      }
      return true;
    });
  }, [apiCards, apiFilterType]);

  // Usuários separados por equipe vs clientes
  const teamUsers = useMemo(
    () => userList.filter((u) => u.role === 'admin' || u.role === 'funcionario'),
    [userList]
  );
  const customerUsers = useMemo(
    () => userList.filter((u) => u.role === 'cliente'),
    [userList]
  );

  const filteredUsers = useMemo(() => {
    const base =
      userGroupFilter === 'team'
        ? teamUsers
        : userGroupFilter === 'customers'
          ? customerUsers
          : userList;

    const q = userSearch.trim().toLowerCase();
    if (!q) return base;

    return base.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q) ||
        (u.cargo || '').toLowerCase().includes(q)
    );
  }, [userGroupFilter, teamUsers, customerUsers, userList, userSearch]);

  // Verifica se uma carta da API já existe no estoque (considerando subtitulo/set/código quando disponível)
  const findExistingProductForApiCard = (card: ExternalCard): Product | undefined => {
    const nameClean = card.nome.toLowerCase().trim();
    const candidates = products.filter(
      (p) => p.jogo === card.jogo && p.nome.toLowerCase().trim() === nameClean
    );
    if (candidates.length === 0) return undefined;

    const codeClean = (card.codigoCarta || '').toLowerCase().trim();
    const setClean = (card.colecao || '').toLowerCase().trim();

    const exactMatch = candidates.find((p) => {
      const sub = (p.subtitulo || '').toLowerCase();
      if (codeClean && sub.includes(codeClean)) return true;
      if (setClean && sub.includes(setClean)) return true;
      return false;
    });
    if (exactMatch) return exactMatch;

    // Fallback para produtos criados manualmente sem código/coleção específico no subtítulo
    return candidates.find((p) => {
      const sub = (p.subtitulo || '').toLowerCase().trim();
      return !sub || !sub.includes('•');
    });
  };

  const getApiCardCustom = (card: ExternalCard) => {
    return (
      apiCardCustoms[card.uid] || {
        stockStr: '5',
        priceStr: card.precoMercadoBrl > 0 ? formatBRL(card.precoMercadoBrl) : '',
        minStock: 3,
      }
    );
  };

  const handleQuickImportApiCard = async (card: ExternalCard) => {
    if (importingCardUid) return;

    const customs = getApiCardCustom(card);
    const stockNum = Number.parseInt(customs.stockStr.trim(), 10);
    if (Number.isNaN(stockNum) || stockNum < 1) {
      showToast('Informe uma quantidade inicial válida (mínimo 1 unidade).');
      return;
    }

    const priceNum = parseMoneyToFloat(customs.priceStr);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      showToast('Informe um preço de venda válido maior que R$ 0,00 antes de importar.');
      return;
    }

    setImportingCardUid(card.uid);
    const beforeIds = new Set(latestProductsRef.current.map((p) => p.id));

    try {
      const criado = await importExternalCard(card, stockNum, priceNum);
      if (criado && !beforeIds.has(criado.id)) {
        if (customs.minStock !== 3) {
          await updateProductMinStock(criado.id, customs.minStock);
        }
        await refreshStockMovements();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao importar carta para o estoque.');
    } finally {
      setImportingCardUid(null);
    }
  };

  const handleOpenConfigApiCard = (card: ExternalCard) => {
    setConfiguringApiCard(card);
    const customs = getApiCardCustom(card);
    setCfgStock(customs.stockStr);
    setCfgPrice(customs.priceStr);
    setCfgMinStock(String(customs.minStock));
    setCfgCategory(card.categoria || 'Carta Avulsa');
  };

  const handleSaveConfiguredApiCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringApiCard || importingCardUid) return;

    const initialStock = Number.parseInt(cfgStock.trim(), 10);
    if (Number.isNaN(initialStock) || initialStock < 1) {
      showToast('Informe um estoque inicial válido (mínimo 1 unidade).');
      return;
    }

    const priceNum = parseMoneyToFloat(cfgPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      showToast('Informe um preço de venda válido maior que R$ 0,00.');
      return;
    }

    const minStockNum = parseNonNegativeInt(cfgMinStock, 3);
    const beforeIds = new Set(latestProductsRef.current.map((p) => p.id));
    setImportingCardUid(configuringApiCard.uid);

    try {
      const criado = await importExternalCard(configuringApiCard, initialStock, priceNum);
      if (!criado) return;

      if (!beforeIds.has(criado.id)) {
        const defaultCat = configuringApiCard.categoria || 'Carta Avulsa';
        if (cfgCategory !== defaultCat || minStockNum !== 3) {
          await editProduct(criado.id, {
            categoria: cfgCategory,
            estoqueMinimo: minStockNum,
          });
        }
        await refreshStockMovements();
      }
      setConfiguringApiCard(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao configurar e importar card.');
    } finally {
      setImportingCardUid(null);
    }
  };

  // Login de Administrador (sem promoção client-side e com modo explícito 'login')
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const emailClean = loginEmail.trim().toLowerCase();
    if (!emailClean || !isValidEmail(emailClean)) {
      const msg = 'Informe um e-mail válido.';
      setLoginError(msg);
      showToast(msg);
      return;
    }
    if (!loginPassword.trim()) {
      const msg = 'Informe a senha de acesso.';
      setLoginError(msg);
      showToast(msg);
      return;
    }

    setIsAuthenticating(true);
    try {
      // Verifica credenciais e cargo real no servidor sem persistir sessão se não for admin
      const verifiedUser = await api.login(emailClean, loginPassword, false);
      if (verifiedUser.role !== 'admin') {
        const msg = 'Acesso restrito: esta conta não possui permissão de Administrador.';
        setLoginError(msg);
        showToast(msg);
        return;
      }

      const sucesso = await loginUser(
        verifiedUser.nome,
        emailClean,
        verifiedUser.role,
        loginPassword,
        undefined,
        'login'
      );
      if (!sucesso) {
        setLoginError('Não foi possível concluir a autenticação administrativa.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas.';
      setLoginError(msg);
      showToast(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Entrada & Saída de Estoque
  const openEntryModal = () => {
    if (activeProducts.length === 0) return;
    setSelectedStockProductId(activeProducts[0].id);
    setStockAmountInput('5');
    setStockReasonInput('Reposição de Fornecedor');
    setIsEntryModalOpen(true);
  };

  const openExitModal = () => {
    if (productsWithStock.length === 0) return;
    setSelectedStockProductId(productsWithStock[0].id);
    setStockAmountInput('1');
    setStockReasonInput('Baixa Operacional / Avaria');
    setIsExitModalOpen(true);
  };

  const handleConfirmEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct || isSubmittingStock) return;

    const qtd = Number.parseInt(stockAmountInput.trim(), 10);
    if (Number.isNaN(qtd) || qtd <= 0) {
      showToast('Informe uma quantidade válida maior que zero.');
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
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao registrar entrada de estoque.');
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const handleConfirmExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct || isSubmittingStock) return;

    const qtd = Number.parseInt(stockAmountInput.trim(), 10);
    if (Number.isNaN(qtd) || qtd <= 0) {
      showToast('Informe uma quantidade válida maior que zero.');
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
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao registrar baixa de estoque.');
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const handleQuickInlineStock = async (prod: Product, change: number) => {
    if (updatingStockProductId === prod.id) return;
    if (change < 0 && prod.estoque <= 0) {
      showToast('O produto já está esgotado!');
      return;
    }

    setUpdatingStockProductId(prod.id);
    try {
      if (change > 0) {
        await registerStockEntry(prod.id, change, 'Ajuste rápido no catálogo oficial');
      } else {
        await registerStockExit(prod.id, Math.abs(change), 'Ajuste rápido de saída');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Falha ao atualizar estoque rápido.');
    } finally {
      setUpdatingStockProductId(null);
    }
  };

  const handleCreateManualProduct = async (productData: Omit<Product, 'id'>): Promise<boolean> => {
    const beforeIds = new Set(latestProductsRef.current.map((p) => p.id));
    await addProduct(productData);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const added = latestProductsRef.current.some((p) => !beforeIds.has(p.id));
    if (added) {
      await refreshStockMovements();
    }
    return added;
  };

  const handleRefreshOrders = async () => {
    if (isRefreshingOrders) return;
    setIsRefreshingOrders(true);
    try {
      const fresh = await api.obterPedidos(latestProductsRef.current);
      setOrdersOverride(fresh);
      showToast('Pedidos atualizados com sucesso!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar pedidos do servidor.');
    } finally {
      setIsRefreshingOrders(false);
    }
  };

  const applyOrderStatusUpdate = async (orderId: number, nextStatus: Order['status']) => {
    await updateOrderStatus(orderId, nextStatus);
    if (latestOrdersOverrideRef.current !== null) {
      try {
        const fresh = await api.obterPedidos(latestProductsRef.current);
        setOrdersOverride(fresh);
      } catch {
        // Mantém a lista atual se a re-sincronização imediata falhar
      }
    }
  };

  const handleOrderStatusChange = (order: Order, nextStatus: Order['status']) => {
    if (nextStatus === order.status) return;
    if (nextStatus === 'Cancelado') {
      showToastConfirm({
        message: `Confirmar cancelamento do Pedido #${order.id_pedido} (${order.cliente_nome})? As unidades dos itens serão estornadas automaticamente ao estoque da loja.`,
        confirmText: 'Cancelar Pedido',
        cancelText: 'Voltar',
        onConfirm: () => applyOrderStatusUpdate(order.id_pedido, 'Cancelado'),
      });
      return;
    }
    void applyOrderStatusUpdate(order.id_pedido, nextStatus);
  };

  const handleDeleteUser = (user: UserProfile) => {
    if (user.id === currentUser.id) {
      showToast('Você não pode excluir sua própria conta ativa.');
      return;
    }
    showToastConfirm({
      message: `Remover o usuário "${user.nome}" (${user.email}) permanentemente? Esta ação não pode ser desfeita.`,
      confirmText: 'Remover Usuário',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await api.excluirUsuario(user.id);
          await carregarUsuarios();
          showToast(`Usuário "${user.nome}" removido com sucesso.`);
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Falha ao remover usuário.');
        }
      },
    });
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
                Autentique-se com uma conta de administrador para gerenciar estoque, pedidos e equipe.
              </p>
            </div>

            {loginError && (
              <div
                role="alert"
                style={{
                  marginBottom: '14px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: tones.dangerBg,
                  border: `1px solid ${tones.dangerBorder}`,
                  color: tones.dangerText,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                {loginError}
              </div>
            )}

            <form
              onSubmit={handleAdminLogin}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}
            >
              <div className="admin-field-group">
                <label htmlFor="admin-login-email" className="admin-field-label">
                  E-MAIL DE ACESSO
                </label>
                <div className="admin-input-wrapper">
                  <Mail size={16} className="admin-input-icon" />
                  <input
                    id="admin-login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="seuemail@nobledeck.com"
                    className="admin-modern-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="admin-field-group">
                <label htmlFor="admin-login-password" className="admin-field-label">
                  SENHA DE ACESSO
                </label>
                <div className="admin-input-wrapper">
                  <Key size={16} className="admin-input-icon" />
                  <input
                    id="admin-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="••••••••"
                    className="admin-modern-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="admin-toggle-eye-btn"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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

              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                className="btn-outline"
                style={{ width: '100%', padding: '11px 16px', fontSize: '12.5px' }}
              >
                <Home size={15} /> Voltar para a Loja
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. CASO AUTENTICADO MAS NÃO É ADMIN (sem auto-promoção client-side)
  if (!isAdmin) {
    return (
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }} className="admin-animate-fade">
        <div className="app-container" style={{ maxWidth: '520px' }}>
          <div className="access-denied-card">
            <div className="access-denied-icon-halo">
              <ShieldAlert size={34} color={tones.dangerText} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', color: 'var(--color-headline)' }}>
              Acesso Administrativo Restrito
            </h2>

            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
              Você está conectado como <strong>{currentUser.email}</strong> com o perfil{' '}
              <span style={{ fontWeight: 700, color: tones.activeTabText }}>
                {currentUser.role.toUpperCase()}
              </span>
              . Esta central é exclusiva para contas com permissão de administrador.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={() => setCurrentTab('dashboard')}
                className="btn-primary"
                style={{ padding: '12px 20px', borderRadius: 'var(--radius-full)' }}
              >
                <UserCheck size={16} /> Ir para Meu Painel
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                className="btn-outline"
                style={{ padding: '12px 20px', borderRadius: 'var(--radius-full)' }}
              >
                <Home size={15} /> Voltar para a Loja
              </button>

              <button
                type="button"
                onClick={() => logoutUser()}
                className="btn-outline"
                style={{
                  padding: '11px 20px',
                  borderRadius: 'var(--radius-full)',
                  borderColor: tones.dangerBorder,
                  color: tones.dangerText,
                }}
              >
                <LogOut size={15} /> Entrar com Outra Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determina subtexto e mantém destaque visual em vermelho no KPI de alertas de reposição
  const hasEmptyCatalog = products.length === 0;
  const hasNoActiveProducts = products.length > 0 && activeProducts.length === 0;
  const kpiAlertLevel: 'empty' | 'inactive' | 'danger' | 'warning' | 'ok' = hasEmptyCatalog
    ? 'empty'
    : hasNoActiveProducts
      ? 'inactive'
      : produtosEsgotados.length > 0
        ? 'danger'
        : produtosCriticos.length > 0
          ? 'warning'
          : 'ok';

  const kpiAlertSubtext = {
    empty: 'Nenhum produto cadastrado',
    inactive: 'Nenhum produto ativo',
    danger:
      produtosCriticos.length > 0
        ? `${produtosCriticos.length} críticos • ${produtosEsgotados.length} zerados`
        : `${produtosEsgotados.length} ${produtosEsgotados.length === 1 ? 'produto esgotado' : 'produtos esgotados'}`,
    warning: `${produtosCriticos.length} abaixo do estoque mínimo`,
    ok: 'Estoque 100% regular',
  }[kpiAlertLevel];

  const kpiAlertStyles = {
    border: tones.dangerBorder,
    bg: 'transparent',
    iconBg: tones.dangerBg,
    color: tones.dangerText,
    subtext: kpiAlertSubtext,
  };

  const headerBtnBase: React.CSSProperties = {
    height: '38px',
    padding: '0 14px',
    borderRadius: '10px',
    fontSize: '12.5px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  };

  // 3. PAINEL DE CONTROLE GERAL DO ADMINISTRADOR
  return (
    <div className="workstation-canvas admin-animate-fade">
      {/* =========================================================================
            HEADER ERP & COMANDOS RÁPIDOS
           ========================================================================= */}
      <div
        className="admin-header-box"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '18px',
          padding: '22px 26px',
          borderRadius: '20px',
          backgroundColor: 'var(--color-surface-container-low)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 10px 30px var(--shadow-color)',
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
            Gerencie inventário, catálogo oficial de TCG, pedidos da loja e permissões da equipe.
          </p>
        </div>

        {/* Botões de Ação Rápida Padronizados */}
        <div className="admin-actions-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={activeProducts.length === 0}
            onClick={openEntryModal}
            style={{
              ...headerBtnBase,
              backgroundColor: tones.successBg,
              border: `1px solid ${tones.successBorder}`,
              color: tones.successText,
              opacity: activeProducts.length === 0 ? 0.45 : 1,
              cursor: activeProducts.length === 0 ? 'not-allowed' : 'pointer',
            }}
            title={
              activeProducts.length === 0
                ? 'Cadastre ao menos um produto ativo antes de registrar entradas'
                : 'Registrar nova entrada de estoque'
            }
          >
            <ArrowUpCircle size={15} /> + Nova Entrada
          </button>

          <button
            type="button"
            disabled={productsWithStock.length === 0}
            onClick={openExitModal}
            style={{
              ...headerBtnBase,
              backgroundColor: tones.dangerBg,
              border: `1px solid ${tones.dangerBorder}`,
              color: tones.dangerText,
              opacity: productsWithStock.length === 0 ? 0.45 : 1,
              cursor: productsWithStock.length === 0 ? 'not-allowed' : 'pointer',
            }}
            title={
              productsWithStock.length === 0
                ? 'Nenhum produto ativo possui saldo positivo para baixa'
                : 'Registrar saída ou baixa do estoque'
            }
          >
            <ArrowDownCircle size={15} /> - Baixa no Estoque
          </button>

          <button
            type="button"
            onClick={() => setIsCreateProductModalOpen(true)}
            className="btn-primary"
            style={{
              ...headerBtnBase,
              textTransform: 'none',
              letterSpacing: '0.01em',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={15} /> Novo Produto Manual
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('product-control')}
            className="btn-outline"
            style={{
              ...headerBtnBase,
              textTransform: 'none',
              letterSpacing: '0.01em',
              fontFamily: 'var(--font-body)',
            }}
            title="Abrir tela de Controle e Edição de Produtos"
          >
            <Boxes size={14} /> Controle de Produtos
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
        {/* 1. Valor Total em Estoque (informativo, não clicável) */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-on-surface-variant)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Valor Total em Estoque
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 196, 0, 0.14)' }}>
              <DollarSign size={16} color="var(--color-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
            R$ {formatBRL(valorTotalEstoque)}
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-on-surface-variant)' }}>
            Ativos avaliados a preço de venda
          </span>
        </div>

        {/* 2. Inventário Físico (informativo) */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-on-surface-variant)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Inventário Físico
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 157, 0, 0.14)' }}>
              <Boxes size={16} color="var(--color-secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
            {totalUnidadesEstoque}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-on-surface-variant)' }}>
              unidades
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-on-surface-variant)' }}>
            Distribuídas em {products.length} produtos ({activeProducts.length} ativos
            {inactiveProducts.length > 0 ? `, ${inactiveProducts.length} inativos` : ''})
          </span>
        </div>

        {/* 3. Alertas de Reposição (clicável -> Controle de Produtos) */}
        <div
          role="button"
          tabIndex={0}
          className="glass-panel admin-kpi-card"
          onClick={() => setCurrentTab('product-control')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCurrentTab('product-control');
            }
          }}
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${kpiAlertStyles.border}`,
            backgroundColor: kpiAlertStyles.bg,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          title="Abrir Controle de Produtos para gerenciar estoque e reposições"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: kpiAlertStyles.color,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 700,
                }}
              >
                Alertas de Reposição
              </span>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: kpiAlertStyles.iconBg }}>
                <AlertTriangle size={16} color={kpiAlertStyles.color} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: kpiAlertStyles.color, fontFamily: 'var(--font-mono)' }}>
              {totalAlertasReposicao}{' '}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>({produtosEsgotados.length} zerados)</span>
            </div>
          </div>
          <div
            style={{
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '11.5px', color: kpiAlertStyles.color, fontWeight: 600 }}>
              {kpiAlertStyles.subtext}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: tones.activeTabText,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              Ver Controle <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
            BARRA DE ABAS PRINCIPAIS (4 ABAS COM ACESSIBILIDADE TABLIST)
           ========================================================================= */}
      <div
        role="tablist"
        aria-label="Seções do painel administrativo"
        className="admin-tabs-scroller"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--nav-border)',
          paddingBottom: '12px',
        }}
      >
        {(
          [
            {
              id: 'movements' as AdminTab,
              label: `Movimentações & Auditoria (${stockMovements.length})`,
              icon: <History size={16} />,
            },
            {
              id: 'orders' as AdminTab,
              label: `Pedidos da Loja (${displayedOrdersSource.length})`,
              icon: <ShoppingBag size={16} />,
            },
            {
              id: 'users' as AdminTab,
              label: `Usuários & Equipe (${userList.length})`,
              icon: <Users size={16} />,
            },
            {
              id: 'api-catalog' as AdminTab,
              label: apiHasLoadedOnce ? `Catálogo Oficial (API) (${apiCards.length})` : 'Catálogo Oficial (API)',
              icon: <Globe size={16} />,
            },
          ] as const
        ).map((tab) => {
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`admin-panel-${tab.id}`}
              onClick={() => setActiveAdminTab(tab.id)}
              className="admin-tab-btn"
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: isActive ? `1px solid ${tones.activeTabBorder}` : '1px solid transparent',
                backgroundColor: isActive ? tones.activeTabBg : 'transparent',
                color: isActive ? tones.activeTabText : 'var(--color-on-surface-variant)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isActive ? '0 0 14px var(--glow-color)' : 'none',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
            ABA 1: HISTÓRICO & AUDITORIA DE MOVIMENTAÇÕES
           ========================================================================= */}
      {activeAdminTab === 'movements' && (
        <div
          id="admin-panel-movements"
          role="tabpanel"
          aria-labelledby="admin-tab-movements"
          className="admin-animate-fade"
        >
          <div
            className="glass-panel"
            style={{
              position: 'relative',
              zIndex: 30,
              padding: '20px 24px',
              borderRadius: '16px',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div
              style={{
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
                  Auditoria das entradas, baixas, compras e ajustes de inventário (até 100 registros recentes).
                </p>
              </div>

              <button
                type="button"
                onClick={() => refreshStockMovements()}
                className="btn-outline"
                style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} /> Atualizar
              </button>
            </div>

            {/* Busca, Ordenação e Chips de Filtro */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-on-surface-variant)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="system-input"
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  placeholder="Buscar por produto, #ID, motivo ou responsável..."
                  aria-label="Buscar movimentações"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ width: '190px' }}>
                <SystemSelect<MovementSort>
                  size="sm"
                  value={movementSort}
                  onChange={setMovementSort}
                  options={[
                    { value: 'newest', label: 'Mais recentes' },
                    { value: 'oldest', label: 'Mais antigos' },
                    { value: 'qty-desc', label: 'Maior quantidade' },
                  ]}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {(
                [
                  { id: 'all' as MovementFilter, label: `Todas (${stockMovements.length})` },
                  {
                    id: 'entrada' as MovementFilter,
                    label: `Entradas (+) (${stockMovements.filter((m) => m.tipo === 'entrada').length})`,
                  },
                  {
                    id: 'saida' as MovementFilter,
                    label: `Saídas (-) (${stockMovements.filter((m) => m.tipo === 'saida').length})`,
                  },
                  {
                    id: 'ajuste' as MovementFilter,
                    label: `Ajustes (${stockMovements.filter((m) => m.tipo === 'ajuste').length})`,
                  },
                ] as const
              ).map((chip) => {
                const active = movementTypeFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setMovementTypeFilter(chip.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: active ? `1px solid ${tones.activeTabBorder}` : '1px solid var(--card-border)',
                      backgroundColor: active ? tones.activeTabBg : 'transparent',
                      color: active ? tones.activeTabText : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel" style={{ position: 'relative', zIndex: 1, padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
              {filteredMovements.length === 0 ? (
                <div style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                  <History size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                  <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--color-headline)' }}>
                    {stockMovements.length === 0
                      ? 'Nenhuma movimentação registrada ainda.'
                      : 'Nenhuma movimentação corresponde aos filtros.'}
                  </p>
                  <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                    {stockMovements.length === 0
                      ? activeProducts.length > 0
                        ? 'Registre uma entrada de estoque ou importe cartas do catálogo oficial.'
                        : 'Cadastre um produto manual ou importe cartas do Catálogo Oficial (API) para iniciar.'
                      : 'Tente limpar a busca ou selecionar outro tipo de operação.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {stockMovements.length === 0 ? (
                      <>
                        {activeProducts.length > 0 ? (
                          <button type="button" onClick={openEntryModal} className="btn-primary" style={{ padding: '9px 18px', fontSize: '12px' }}>
                            + Nova Entrada
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsCreateProductModalOpen(true)}
                            className="btn-primary"
                            style={{ padding: '9px 18px', fontSize: '12px' }}
                          >
                            + Novo Produto Manual
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveAdminTab('api-catalog')}
                          className="btn-outline"
                          style={{ padding: '9px 18px', fontSize: '12px' }}
                        >
                          <Globe size={14} /> Explorar Catálogo Oficial
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMovementSearch('');
                          setMovementTypeFilter('all');
                        }}
                        className="btn-outline"
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead className="workstation-table-header">
                    <tr
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        color: 'var(--color-on-surface-variant)',
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
                    {paginatedMovements.map((m) => {
                      const isEntrada = m.tipo === 'entrada';
                      const isAjuste = m.tipo === 'ajuste';
                      const badgeBg = isEntrada ? tones.successBg : isAjuste ? tones.warningBg : tones.dangerBg;
                      const badgeColor = isEntrada ? tones.successText : isAjuste ? tones.warningText : tones.dangerText;
                      const badgeLabel = isEntrada ? '+ ENTRADA' : isAjuste ? '~ AJUSTE' : '- SAÍDA';
                      const delta = m.saldo_posterior - m.saldo_anterior;
                      const qtyText = isEntrada
                        ? `+${m.quantidade}`
                        : isAjuste
                          ? `${delta >= 0 ? '+' : ''}${delta}`
                          : `-${m.quantidade}`;

                      return (
                        <tr
                          key={m.id_movimentacao}
                          className="admin-table-row"
                          style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}
                        >
                          <td
                            style={{
                              padding: '12px 16px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                              color: 'var(--color-on-surface-variant)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.data_hora}
                          </td>

                          <td style={{ padding: '12px 12px', fontWeight: 700, color: 'var(--color-headline)' }}>
                            {m.produto_nome}{' '}
                            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
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
                                backgroundColor: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {badgeLabel}
                            </span>
                          </td>

                          <td
                            style={{
                              padding: '12px 12px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              color: badgeColor,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {qtyText} un.
                          </td>

                          <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {m.saldo_anterior} &rarr; <strong>{m.saldo_posterior} un.</strong>
                          </td>

                          <td style={{ padding: '12px 12px', color: 'var(--color-on-surface-variant)' }}>
                            {m.motivo}
                          </td>

                          <td
                            style={{
                              padding: '12px 16px',
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                              color: tones.activeTabText,
                              fontWeight: 600,
                            }}
                          >
                            {m.responsavel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {filteredMovements.length > MOVEMENTS_PER_PAGE && (
              <PaginationBar
                currentPage={movementPage}
                totalPages={movementTotalPages}
                totalItems={filteredMovements.length}
                onPageChange={setMovementPage}
              />
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
            ABA 2: GESTÃO CENTRALIZADA DE PEDIDOS
           ========================================================================= */}
      {activeAdminTab === 'orders' && (
        <div
          id="admin-panel-orders"
          role="tabpanel"
          aria-labelledby="admin-tab-orders"
          className="glass-panel admin-animate-fade"
          style={{ padding: '24px', borderRadius: '16px' }}
        >
          {/* Cabeçalho & Resumo de Faturamento */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Gestão Centralizada de Pedidos ({displayedOrdersSource.length})
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                Acompanhe faturamento confirmado, itens vendidos e transições válidas de status.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={isRefreshingOrders}
              className="btn-outline"
              style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={isRefreshingOrders ? 'spin' : ''} />
              {isRefreshingOrders ? 'Atualizando...' : 'Atualizar Pedidos'}
            </button>
          </div>

          {/* Cards Resumo de Receita Separados */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: tones.successBg,
                border: `1px solid ${tones.successBorder}`,
              }}
            >
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: tones.successText, fontWeight: 700, textTransform: 'uppercase' }}>
                Faturamento Confirmado (Finalizado)
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: tones.successText, marginTop: '4px' }}>
                R$ {formatBRL(orderRevenueSummary.confirmado)}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: tones.warningBg,
                border: `1px solid ${tones.warningBorder}`,
              }}
            >
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: tones.warningText, fontWeight: 700, textTransform: 'uppercase' }}>
                Em Aberto (Pendente / Processando / Enviado)
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: tones.warningText, marginTop: '4px' }}>
                R$ {formatBRL(orderRevenueSummary.emAberto)}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: tones.dangerBg,
                border: `1px solid ${tones.dangerBorder}`,
              }}
            >
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: tones.dangerText, fontWeight: 700, textTransform: 'uppercase' }}>
                Cancelados ({orderRevenueSummary.canceladoCount})
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: tones.dangerText, marginTop: '4px' }}>
                R$ {formatBRL(orderRevenueSummary.cancelado)}
              </div>
            </div>
          </div>

          {/* Busca, Ordenação & Chips de Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-on-surface-variant)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="system-input"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Buscar por #pedido, cliente, e-mail ou produto..."
                  aria-label="Buscar pedidos"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ width: '190px' }}>
                <SystemSelect<OrderSort>
                  size="sm"
                  value={orderSort}
                  onChange={setOrderSort}
                  options={[
                    { value: 'newest', label: 'Mais recentes' },
                    { value: 'oldest', label: 'Mais antigos' },
                    { value: 'total-desc', label: 'Maior valor' },
                    { value: 'total-asc', label: 'Menor valor' },
                  ]}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(
                [
                  { id: 'all' as OrderStatusFilter, label: `Todos (${displayedOrdersSource.length})` },
                  {
                    id: 'Pendente' as OrderStatusFilter,
                    label: `Pendente (${displayedOrdersSource.filter((o) => o.status === 'Pendente').length})`,
                  },
                  {
                    id: 'Processando' as OrderStatusFilter,
                    label: `Processando (${displayedOrdersSource.filter((o) => o.status === 'Processando').length})`,
                  },
                  {
                    id: 'Enviado' as OrderStatusFilter,
                    label: `Enviado (${displayedOrdersSource.filter((o) => o.status === 'Enviado').length})`,
                  },
                  {
                    id: 'Finalizado' as OrderStatusFilter,
                    label: `Finalizado (${displayedOrdersSource.filter((o) => o.status === 'Finalizado').length})`,
                  },
                  {
                    id: 'Cancelado' as OrderStatusFilter,
                    label: `Cancelado (${displayedOrdersSource.filter((o) => o.status === 'Cancelado').length})`,
                  },
                ] as const
              ).map((chip) => {
                const active = orderStatusFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setOrderStatusFilter(chip.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: active ? `1px solid ${tones.activeTabBorder}` : '1px solid var(--card-border)',
                      backgroundColor: active ? tones.activeTabBg : 'transparent',
                      color: active ? tones.activeTabText : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                <ShoppingBag size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: 'var(--color-headline)' }}>
                  {displayedOrdersSource.length === 0
                    ? 'Nenhum pedido efetuado ainda.'
                    : 'Nenhum pedido encontrado para os filtros atuais.'}
                </p>
                {displayedOrdersSource.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearch('');
                      setOrderStatusFilter('all');
                    }}
                    className="btn-outline"
                    style={{ marginTop: '8px', padding: '8px 16px', fontSize: '12px' }}
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            ) : (
              paginatedOrders.map((o) => {
                const isExpanded = expandedOrderIds[o.id_pedido] ?? o.itens.length <= 3;
                const allowedOptions = getOrderAllowedStatuses(o.status);
                const statusColor =
                  o.status === 'Finalizado'
                    ? { bg: tones.successBg, border: tones.successBorder, text: tones.successText }
                    : o.status === 'Cancelado'
                      ? { bg: tones.dangerBg, border: tones.dangerBorder, text: tones.dangerText }
                      : o.status === 'Enviado'
                        ? { bg: tones.infoBg, border: tones.infoBorder, text: tones.infoText }
                        : { bg: tones.warningBg, border: tones.warningBorder, text: tones.warningText };

                return (
                  <div
                    key={o.id_pedido}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-surface-container-low)',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{ minWidth: '220px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '15px', color: 'var(--color-headline)' }}>
                            Pedido #{o.id_pedido}
                          </span>
                          {o.numero !== undefined && o.numero !== o.id_pedido && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--color-on-surface-variant)',
                              }}
                            >
                              Nº {o.numero}
                            </span>
                          )}
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              backgroundColor: statusColor.bg,
                              border: `1px solid ${statusColor.border}`,
                              color: statusColor.text,
                            }}
                          >
                            {o.status.toUpperCase()}
                          </span>
                          {o.codigo_rastreio && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                backgroundColor: tones.infoBg,
                                border: `1px solid ${tones.infoBorder}`,
                                color: tones.infoText,
                              }}
                            >
                              Rastreio: {o.codigo_rastreio}
                            </span>
                          )}
                          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                            {o.data}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                          Cliente: <strong style={{ color: 'var(--color-headline)' }}>{o.cliente_nome}</strong> ({o.cliente_email})
                          {o.cliente_telefone ? ` • ${o.cliente_telefone}` : ''}
                        </div>
                        {(o.endereco_entrega || o.metodo_pagamento) && (
                          <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
                            {o.endereco_entrega ? `Destino: ${o.endereco_entrega}` : ''}
                            {o.endereco_entrega && o.metodo_pagamento ? ' | ' : ''}
                            {o.metodo_pagamento
                              ? `Pagamento: ${o.metodo_pagamento.toUpperCase()}${
                                  o.status_pagamento ? ` (${o.status_pagamento})` : ''
                                }`
                              : ''}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 800, color: tones.activeTabText }}>
                          R$ {formatBRL(o.valor_total)}
                        </span>

                        <div style={{ width: '155px' }}>
                          <SystemSelect<Order['status']>
                            size="sm"
                            value={o.status}
                            disabled={o.status === 'Cancelado'}
                            onChange={(val) => handleOrderStatusChange(o, val)}
                            options={allowedOptions.map((st) => ({ value: st, label: st }))}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderIds((prev) => ({
                              ...prev,
                              [o.id_pedido]: !isExpanded,
                            }))
                          }
                          className="btn-outline"
                          style={{
                            padding: '6px 10px',
                            fontSize: '11.5px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Itens ({o.itens.length})
                        </button>
                      </div>
                    </div>

                    {/* Itens detalhados (expansível) */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          backgroundColor: tones.subtleSurface,
                          border: '1px solid var(--card-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {o.itens.length === 0 ? (
                          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                            Nenhum item detalhado retornado para este pedido.
                          </span>
                        ) : (
                          o.itens.map((item, idx) => {
                            const unitPrice =
                              item.quantidade > 0 && Number.isFinite(item.subtotal)
                                ? item.subtotal / item.quantidade
                                : item.produto.preco;
                            return (
                              <div
                                key={`${o.id_pedido}-${item.produto.id}-${idx}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  fontSize: '12.5px',
                                  paddingBottom: idx < o.itens.length - 1 ? '8px' : 0,
                                  borderBottom: idx < o.itens.length - 1 ? '1px solid var(--card-border)' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span className="badge badge-muted" style={{ fontSize: '10px' }}>
                                    #{item.produto.id}
                                  </span>
                                  <strong style={{ color: 'var(--color-headline)' }}>{item.produto.nome}</strong>
                                  <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '11.5px' }}>
                                    ({item.produto.jogoNome || 'Geral'})
                                  </span>
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                                  {item.quantidade}x R$ {formatBRL(unitPrice)} ={' '}
                                  <strong style={{ color: 'var(--color-headline)' }}>R$ {formatBRL(item.subtotal)}</strong>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {filteredOrders.length > ORDERS_PER_PAGE && (
            <div style={{ marginTop: '16px' }}>
              <PaginationBar
                currentPage={orderPage}
                totalPages={orderTotalPages}
                totalItems={filteredOrders.length}
                onPageChange={setOrderPage}
              />
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
            ABA 3: USUÁRIOS & EQUIPE
           ========================================================================= */}
      {activeAdminTab === 'users' && (
        <div
          id="admin-panel-users"
          role="tabpanel"
          aria-labelledby="admin-tab-users"
          className="glass-panel admin-animate-fade"
          style={{ padding: '24px', borderRadius: '16px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Colaboradores & Usuários ({userList.length})
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                Separe a equipe interna dos clientes cadastrados e gerencie níveis de acesso com segurança.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => carregarUsuarios()}
                disabled={isLoadingUsers}
                className="btn-outline"
                style={{ padding: '9px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={isLoadingUsers ? 'spin' : ''} /> Atualizar
              </button>

              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(true)}
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: '12.5px', fontWeight: 700 }}
              >
                + Cadastrar Novo Membro
              </button>
            </div>
          </div>

          {/* Filtro Equipe vs Clientes + Busca */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'team' as UserGroupFilter, label: `Equipe Interna (${teamUsers.length})` },
                  { id: 'customers' as UserGroupFilter, label: `Clientes (${customerUsers.length})` },
                  { id: 'all' as UserGroupFilter, label: `Todos (${userList.length})` },
                ] as const
              ).map((tab) => {
                const active = userGroupFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setUserGroupFilter(tab.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: active ? `1px solid ${tones.activeTabBorder}` : '1px solid var(--card-border)',
                      backgroundColor: active ? tones.activeTabBg : 'transparent',
                      color: active ? tones.activeTabText : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ position: 'relative', minWidth: '240px', flex: '0 1 320px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-on-surface-variant)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="system-input"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail, #ID ou cargo..."
                aria-label="Buscar usuários"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {isLoadingUsers ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                Carregando lista de usuários...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                <Users size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: 'var(--color-headline)' }}>
                  {userList.length === 0
                    ? 'Nenhum usuário cadastrado no sistema.'
                    : 'Nenhum usuário encontrado para este filtro.'}
                </p>
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch('')}
                    className="btn-outline"
                    style={{ marginTop: '8px', padding: '8px 16px', fontSize: '12px' }}
                  >
                    Limpar Busca
                  </button>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead className="workstation-table-header">
                  <tr
                    style={{
                      borderBottom: '1px solid var(--card-border)',
                      color: 'var(--color-on-surface-variant)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '12px 10px' }}>ID</th>
                    <th style={{ padding: '12px 10px' }}>Nome</th>
                    <th style={{ padding: '12px 10px' }}>E-mail</th>
                    <th style={{ padding: '12px 10px' }}>Nível de Acesso</th>
                    <th style={{ padding: '12px 10px' }}>Cargo / Função</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    const isCustomer = u.role === 'cliente';
                    const isEmailRevealed = !isCustomer || Boolean(revealedEmails[u.id]);

                    return (
                      <tr key={u.id} className="admin-table-row" style={{ borderBottom: '1px solid var(--card-border)', fontSize: '13px' }}>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', color: 'var(--color-on-surface-variant)' }}>
                          #{u.id}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--color-headline)' }}>
                          {u.nome}{' '}
                          {isSelf && (
                            <span className="badge badge-primary" style={{ marginLeft: '6px', fontSize: '9.5px' }}>
                              Você
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--color-on-surface-variant)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span>{isEmailRevealed ? u.email : maskEmail(u.email)}</span>
                            {isCustomer && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedEmails((prev) => ({
                                    ...prev,
                                    [u.id]: !prev[u.id],
                                  }))
                                }
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-on-surface-variant)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                aria-label={isEmailRevealed ? 'Ocultar e-mail do cliente' : 'Revelar e-mail do cliente'}
                                title={isEmailRevealed ? 'Ocultar e-mail' : 'Exibir e-mail completo'}
                              >
                                {isEmailRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            )}
                          </div>
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
                          {u.cargo ||
                            (u.role === 'admin'
                              ? 'Administrador Geral'
                              : u.role === 'funcionario'
                                ? 'Atendente'
                                : 'Cliente')}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              className="btn-outline"
                              style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '7px' }}
                              aria-label={`Editar perfil de ${u.nome}`}
                              title="Editar nível de acesso ou cargo"
                            >
                              <Edit3 size={12} /> Editar
                            </button>

                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleDeleteUser(u)}
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                borderRadius: '7px',
                                border: `1px solid ${tones.dangerBorder}`,
                                backgroundColor: tones.dangerBg,
                                color: tones.dangerText,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                opacity: isSelf ? 0.4 : 1,
                                cursor: isSelf ? 'not-allowed' : 'pointer',
                              }}
                              aria-label={`Excluir usuário ${u.nome}`}
                              title={isSelf ? 'Você não pode excluir sua própria conta ativa' : 'Remover usuário'}
                            >
                              <Trash2 size={12} /> Excluir
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
        </div>
      )}

      {/* =========================================================================
            ABA 4: CATÁLOGO OFICIAL DE CARDS (API)
           ========================================================================= */}
      {activeAdminTab === 'api-catalog' && (
        <div
          id="admin-panel-api-catalog"
          role="tabpanel"
          aria-labelledby="admin-tab-api-catalog"
          className="admin-animate-fade"
        >
          {/* Box Explicativo & Barra de Busca Live */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              borderRadius: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(255, 210, 26, 0.25)',
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
                  Explore o acervo oficial de <strong>Pokémon</strong>, <strong>Magic: The Gathering</strong>,{' '}
                  <strong>Yu-Gi-Oh!</strong> e <strong>One Piece Card Game</strong>. Defina estoque inicial, preço em
                  reais e importe diretamente ao estoque da loja.
                </p>
              </div>

              <button
                type="button"
                onClick={() => carregarCardsDaApi(apiGameFilter, apiSearchQuery, apiPokemonSetFilter, 1)}
                disabled={isLoadingApiCards}
                className="btn-outline"
                style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={isLoadingApiCards ? 'spin' : ''} /> Atualizar Catálogo
              </button>
            </div>

            {apiErrorMessage && (
              <div
                role="alert"
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: tones.dangerBg,
                  border: `1px solid ${tones.dangerBorder}`,
                  color: tones.dangerText,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <span>{apiErrorMessage}</span>
                <button
                  type="button"
                  onClick={() => carregarCardsDaApi(apiGameFilter, apiSearchQuery, apiPokemonSetFilter, 1)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${tones.dangerBorder}`,
                    backgroundColor: 'transparent',
                    color: tones.dangerText,
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            {/* Filtro por Jogo (Chips) */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {(
                [
                  { id: 'all' as const, label: 'Todos os Jogos', color: 'var(--color-primary)' },
                  { id: 'pokemon' as const, label: 'Pokémon TCG', color: 'var(--color-accent-purple)' },
                  { id: 'magic' as const, label: 'Magic: The Gathering', color: 'var(--color-accent-pink)' },
                  { id: 'yugioh' as const, label: 'Yu-Gi-Oh!', color: 'var(--color-accent-yellow)' },
                  { id: 'onepiece' as const, label: 'One Piece Card Game', color: isLight ? '#ea580c' : '#fb923c' },
                ] as const
              ).map((chip) => {
                const active = apiGameFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleGameFilterChange(chip.id)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: active ? `1px solid ${chip.color}` : '1px solid var(--card-border)',
                      backgroundColor: active ? tones.activeTabBg : 'transparent',
                      color: active ? (isLight ? '#7A4B00' : chip.color) : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Form de Busca Live */}
            <form onSubmit={handleSearchApi} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {apiGameFilter === 'pokemon' && (
                <div style={{ width: '230px' }}>
                  <SystemSelect<string>
                    value={apiPokemonSetFilter}
                    onChange={(val) => {
                      setApiPokemonSetFilter(val);
                      carregarCardsDaApi(apiGameFilter, apiSearchQuery, val, 1);
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
                    color: 'var(--color-on-surface-variant)',
                    pointerEvents: 'none',
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
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-on-surface-variant)',
                  textTransform: 'uppercase',
                }}
              >
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
                  border: apiFilterType === 'all' ? `1px solid ${tones.activeTabBorder}` : '1px solid var(--card-border)',
                  backgroundColor: apiFilterType === 'all' ? tones.activeTabBg : 'transparent',
                  color: apiFilterType === 'all' ? tones.activeTabText : 'var(--color-on-surface-variant)',
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
                  border: apiFilterType === 'sealed' ? `1px solid ${tones.warningBorder}` : '1px solid var(--card-border)',
                  backgroundColor: apiFilterType === 'sealed' ? tones.warningBg : 'transparent',
                  color: apiFilterType === 'sealed' ? tones.warningText : 'var(--color-on-surface-variant)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                Booster Packs & Boxes (
                {apiCards.filter((c) => c.categoria === 'Booster Pack' || c.categoria === 'Booster Box').length})
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
                  border: apiFilterType === 'singles' ? `1px solid ${tones.infoBorder}` : '1px solid var(--card-border)',
                  backgroundColor: apiFilterType === 'singles' ? tones.infoBg : 'transparent',
                  color: apiFilterType === 'singles' ? tones.infoText : 'var(--color-on-surface-variant)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                Cards Avulsos ({apiCards.filter((c) => !c.categoria || c.categoria === 'Carta Avulsa').length})
              </button>

              {apiCards.length > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    color: 'var(--color-on-surface-variant)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {apiTotalCount > 0
                    ? `Exibindo ${apiCards.length} de ${apiTotalCount} itens disponíveis`
                    : `Exibindo ${apiCards.length} itens carregados`}
                </span>
              )}
            </div>
          </div>

          {/* Grid dos Cards do Catálogo Oficial */}
          {isLoadingApiCards ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
              <RefreshCw size={36} className="spin" style={{ margin: '0 auto 14px', color: 'var(--color-primary)' }} />
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-headline)' }}>
                Consultando catálogo oficial de cards...
              </p>
              <span style={{ fontSize: '12.5px' }}>
                Carregando imagens em alta resolução, raridades e valores de referência.
              </span>
            </div>
          ) : apiCards.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '50px 20px',
                textAlign: 'center',
                borderRadius: '16px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <Globe size={40} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--color-headline)' }}>
                Nenhum card encontrado no catálogo.
              </p>
              <span style={{ fontSize: '13px' }}>
                Tente buscar por termos populares em inglês como &ldquo;Dragon&rdquo;, &ldquo;Pikachu&rdquo;, &ldquo;Lotus&rdquo; ou &ldquo;Luffy&rdquo;.
              </span>
            </div>
          ) : filteredApiCards.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '44px 20px',
                textAlign: 'center',
                borderRadius: '16px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
              <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--color-headline)' }}>
                Nenhum item do tipo &ldquo;
                {apiFilterType === 'sealed' ? 'Booster Packs & Boxes' : 'Cards Avulsos'}
                &rdquo; entre os {apiCards.length} resultados carregados.
              </p>
              <button
                type="button"
                onClick={() => setApiFilterType('all')}
                className="btn-outline"
                style={{ marginTop: '10px', padding: '8px 16px', fontSize: '12px' }}
              >
                Exibir Todos ({apiCards.length})
              </button>
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
                {filteredApiCards.map((card) => {
                  const existingProduct = findExistingProductForApiCard(card);
                  const isImporting = importingCardUid === card.uid;
                  const custom = getApiCardCustom(card);
                  const hasMarketPrice = Number.isFinite(card.precoMercadoBrl) && card.precoMercadoBrl > 0;
                  const isBrokenImg = Boolean(brokenImages[card.uid]);

                  return (
                    <div
                      key={card.uid}
                      className="glass-panel"
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        border: existingProduct
                          ? `1px solid ${tones.successBorder}`
                          : '1px solid var(--card-border)',
                        backgroundColor: existingProduct
                          ? tones.successBg
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
                        {/* Imagem do Card com fallback onError */}
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
                          {card.imagemUrl && !isBrokenImg ? (
                            <img
                              src={card.imagemUrl}
                              alt={card.nome}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                              onError={() =>
                                setBrokenImages((prev) => ({
                                  ...prev,
                                  [card.uid]: true,
                                }))
                              }
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '6px',
                                textAlign: 'center',
                              }}
                            >
                              <Package size={22} color="var(--color-on-surface-variant)" />
                              <span style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)' }}>
                                Sem imagem
                              </span>
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

                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                            {card.colecao} {card.codigoCarta ? `• #${card.codigoCarta}` : ''}
                          </span>

                          <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', display: 'block' }}>
                              Preço de Mercado:
                            </span>
                            <span
                              style={{
                                fontSize: '14.5px',
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                color: hasMarketPrice ? tones.activeTabText : 'var(--color-on-surface-variant)',
                              }}
                            >
                              {hasMarketPrice ? `R$ ${formatBRL(card.precoMercadoBrl)}` : 'Sob consulta'}
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
                              backgroundColor: tones.dangerBg,
                              border: `1px solid ${tones.dangerBorder}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertTriangle size={14} color={tones.dangerText} />
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: tones.dangerText,
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                Inativo ({existingProduct.estoque} un.)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => reactivateProduct(existingProduct.id)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: tones.successSolidBg,
                                color: tones.successSolidText,
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
                              backgroundColor: tones.successBg,
                              border: `1px solid ${tones.successBorder}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Check size={14} color={tones.successText} />
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: tones.successText,
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                Em Estoque: {existingProduct.estoque} un.
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={updatingStockProductId === existingProduct.id}
                              onClick={() => handleQuickInlineStock(existingProduct, 5)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: tones.successSolidBg,
                                color: tones.successSolidText,
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: updatingStockProductId === existingProduct.id ? 'wait' : 'pointer',
                                opacity: updatingStockProductId === existingProduct.id ? 0.6 : 1,
                              }}
                              title="Adicionar +5 unidades rapidamente a este produto existente"
                            >
                              {updatingStockProductId === existingProduct.id ? '...' : '+5 un.'}
                            </button>
                          </div>
                        )
                      ) : (
                        <div
                          style={{
                            padding: '10px',
                            borderRadius: '10px',
                            backgroundColor: tones.subtleSurface,
                            border: '1px solid var(--card-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          {/* Parâmetros rápidos de importação */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label
                                htmlFor={`api-qty-${card.uid}`}
                                style={{
                                  display: 'block',
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--color-on-surface-variant)',
                                  marginBottom: '3px',
                                  fontWeight: 600,
                                }}
                              >
                                QTD. INICIAL
                              </label>
                              <input
                                id={`api-qty-${card.uid}`}
                                type="text"
                                inputMode="numeric"
                                className="system-input"
                                value={custom.stockStr}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  setApiCardCustoms((prev) => ({
                                    ...prev,
                                    [card.uid]: {
                                      ...(prev[card.uid] ?? custom),
                                      stockStr: digits,
                                    },
                                  }));
                                }}
                                onBlur={() => {
                                  setApiCardCustoms((prev) => {
                                    const current = prev[card.uid] ?? custom;
                                    const parsed = Number.parseInt(current.stockStr, 10);
                                    const normalized = Number.isNaN(parsed) || parsed < 1 ? '1' : String(parsed);
                                    return {
                                      ...prev,
                                      [card.uid]: {
                                        ...current,
                                        stockStr: normalized,
                                      },
                                    };
                                  });
                                }}
                                style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`api-price-${card.uid}`}
                                style={{
                                  display: 'block',
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--color-on-surface-variant)',
                                  marginBottom: '3px',
                                  fontWeight: 600,
                                }}
                              >
                                PREÇO VENDA (R$)
                              </label>
                              <input
                                id={`api-price-${card.uid}`}
                                type="text"
                                inputMode="decimal"
                                className="system-input"
                                value={custom.priceStr}
                                onChange={(e) => {
                                  const clean = sanitizeDecimalInput(e.target.value);
                                  setApiCardCustoms((prev) => ({
                                    ...prev,
                                    [card.uid]: {
                                      ...(prev[card.uid] ?? custom),
                                      priceStr: clean,
                                    },
                                  }));
                                }}
                                onBlur={() => {
                                  setApiCardCustoms((prev) => {
                                    const current = prev[card.uid] ?? custom;
                                    const val = parseMoneyToFloat(current.priceStr);
                                    return {
                                      ...prev,
                                      [card.uid]: {
                                        ...current,
                                        priceStr: val > 0 ? formatBRL(val) : '',
                                      },
                                    };
                                  });
                                }}
                                placeholder="0,00"
                                style={{
                                  height: '32px',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  fontFamily: 'var(--font-mono)',
                                }}
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
                              aria-label={`Configurar detalhes de ${card.nome}`}
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

              {/* Paginação Contínua */}
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
                        <Plus size={15} /> Carregar Mais Cartas (Página {apiPage + 1})
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
            MODAIS OPERACIONAIS
           ========================================================================= */}

      {/* Modal 1: Entrada de Estoque */}
      {isEntryModalOpen && (
        <SystemModal onClose={() => setIsEntryModalOpen(false)} maxWidth="520px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
                Movimentação de Entrada
              </span>
              <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Registrar Entrada de Mercadoria
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsEntryModalOpen(false)}
              aria-label="Fechar modal"
              title="Fechar"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleConfirmEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Produto a Receber *</label>
              <SystemSelect<number>
                value={selectedStockProduct?.id ?? (activeProducts[0]?.id ?? 0)}
                onChange={(val) => setSelectedStockProductId(val)}
                options={activeProducts.map((p) => ({
                  value: p.id,
                  label: `#${p.id} - ${p.nome}`,
                  badge: `${p.estoque} un.`,
                }))}
              />
            </div>

            <div>
              <label htmlFor="entry-qty-input" style={labelStyle}>
                Quantidade a Adicionar *
              </label>
              <input
                id="entry-qty-input"
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
              <label htmlFor="entry-reason-input" style={labelStyle}>
                Motivo / Fornecedor / Nota *
              </label>
              <input
                id="entry-reason-input"
                type="text"
                required
                className="system-input"
                value={stockReasonInput}
                onChange={(e) => setStockReasonInput(e.target.value)}
                placeholder="Ex: Compra Distribuidor Copag"
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Compra Distribuidor', 'Reposição de Balcão', 'Devolução de Cliente', 'Ajuste de Inventário'].map(
                  (chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setStockReasonInput(chip)}
                      style={{
                        background: tones.subtleSurface,
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
                  )
                )}
              </div>
            </div>

            <div className="system-modal-actions">
              <button type="button" onClick={() => setIsEntryModalOpen(false)} className="btn-outline">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingStock || !selectedStockProduct}
                className="btn-primary"
              >
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
              <span
                className="badge"
                style={{
                  marginBottom: '6px',
                  backgroundColor: tones.dangerBg,
                  border: `1px solid ${tones.dangerBorder}`,
                  color: tones.dangerText,
                }}
              >
                Movimentação de Saída
              </span>
              <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Dar Baixa no Estoque
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsExitModalOpen(false)}
              aria-label="Fechar modal"
              title="Fechar"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleConfirmExit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Produto a Dar Baixa *</label>
              <SystemSelect<number>
                value={selectedStockProduct?.id ?? (productsWithStock[0]?.id ?? 0)}
                onChange={(val) => setSelectedStockProductId(val)}
                options={activeProducts.map((p) => ({
                  value: p.id,
                  label: `#${p.id} - ${p.nome}`,
                  badge: p.estoque <= 0 ? 'Esgotado' : `${p.estoque} un.`,
                  disabled: p.estoque <= 0,
                }))}
              />
            </div>

            <div style={responsiveTwoColGrid}>
              <div>
                <label htmlFor="exit-qty-input" style={labelStyle}>
                  Qtd. a Retirar *
                </label>
                <input
                  id="exit-qty-input"
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
                <label style={labelStyle}>Saldo Resultante</label>
                {(() => {
                  const parsedQty = Number.parseInt(stockAmountInput, 10) || 0;
                  const projected = selectedStockProduct ? selectedStockProduct.estoque - parsedQty : 0;
                  const isOver = Boolean(selectedStockProduct) && projected < 0;
                  return (
                    <div
                      style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        backgroundColor: isOver ? tones.dangerBg : tones.subtleSurface,
                        border: `1px solid ${isOver ? tones.dangerBorder : 'var(--input-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        color: tones.dangerText,
                      }}
                    >
                      {selectedStockProduct
                        ? `${selectedStockProduct.estoque} - ${parsedQty} = ${projected} un.${isOver ? ' (Insuficiente)' : ''}`
                        : '-'}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <label htmlFor="exit-reason-input" style={labelStyle}>
                Motivo / Justificativa da Baixa *
              </label>
              <input
                id="exit-reason-input"
                type="text"
                required
                className="system-input"
                value={stockReasonInput}
                onChange={(e) => setStockReasonInput(e.target.value)}
                placeholder="Ex: Embalagem danificada / Avaria"
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Avaria / Dano', 'Premiação / Evento', 'Uso Interno', 'Ajuste de Inventário', 'Venda Balcão'].map(
                  (chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setStockReasonInput(chip)}
                      style={{
                        background: tones.subtleSurface,
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
                  )
                )}
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
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: '#ffffff',
                }}
              >
                {isSubmittingStock ? 'Confirmando...' : 'Confirmar Baixa'}
              </button>
            </div>
          </form>
        </SystemModal>
      )}

      {/* Modal 3: Configuração Detalhada de Card da API */}
      {configuringApiCard && (
        <SystemModal onClose={() => setConfiguringApiCard(null)} maxWidth="520px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
                Adicionar ao Estoque
              </span>
              <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Configurar e Adicionar Card
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setConfiguringApiCard(null)}
              aria-label="Fechar modal"
              title="Fechar"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '14px', marginBottom: '16px', alignItems: 'center' }}>
            <div
              style={{
                width: '70px',
                height: '98px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'var(--color-surface-container)',
                border: '1px solid var(--card-border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {configuringApiCard.imagemUrl && !brokenImages[`cfg-${configuringApiCard.uid}`] ? (
                <img
                  src={configuringApiCard.imagemUrl}
                  alt={configuringApiCard.nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() =>
                    setBrokenImages((prev) => ({
                      ...prev,
                      [`cfg-${configuringApiCard.uid}`]: true,
                    }))
                  }
                />
              ) : (
                <Package size={24} color="var(--color-on-surface-variant)" />
              )}
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--color-headline)', fontWeight: 700 }}>
                {configuringApiCard.nome}
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                {configuringApiCard.jogoNome} • {configuringApiCard.colecao}
              </span>
              <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700, marginTop: '6px' }}>
                Preço de Referência:{' '}
                {configuringApiCard.precoMercadoBrl > 0
                  ? `R$ ${formatBRL(configuringApiCard.precoMercadoBrl)}`
                  : 'Sob consulta (informe manualmente)'}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveConfiguredApiCard} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={responsiveTwoColGrid}>
              <div>
                <label htmlFor="cfg-stock-input" style={labelStyle}>
                  Estoque Inicial *
                </label>
                <input
                  id="cfg-stock-input"
                  type="number"
                  min="1"
                  required
                  className="system-input"
                  value={cfgStock}
                  onChange={(e) => setCfgStock(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="cfg-price-input" style={labelStyle}>
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
                      color: 'var(--color-on-surface-variant)',
                      pointerEvents: 'none',
                    }}
                  >
                    R$
                  </span>
                  <input
                    id="cfg-price-input"
                    type="text"
                    inputMode="decimal"
                    required
                    className="system-input"
                    value={cfgPrice}
                    onChange={(e) => setCfgPrice(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => {
                      const val = parseMoneyToFloat(cfgPrice);
                      if (val > 0) setCfgPrice(formatBRL(val));
                    }}
                    placeholder="0,00"
                    style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>

            <div style={responsiveTwoColGrid}>
              <div>
                <label htmlFor="cfg-min-stock-input" style={labelStyle}>
                  Estoque Mínimo
                </label>
                <input
                  id="cfg-min-stock-input"
                  type="number"
                  min="0"
                  required
                  className="system-input"
                  value={cfgMinStock}
                  onChange={(e) => setCfgMinStock(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Categoria</label>
                <SystemSelect<ProductCategory>
                  value={cfgCategory}
                  onChange={setCfgCategory}
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

      {/* Modal 4: Criação Manual de Produto */}
      {isCreateProductModalOpen && (
        <CreateManualProductModal
          isOpen={isCreateProductModalOpen}
          onClose={() => setIsCreateProductModalOpen(false)}
          onCreate={handleCreateManualProduct}
          showToast={showToast}
          tones={tones}
        />
      )}

      {/* Modal 5: Senha do Usuário Ativo */}
      {isPasswordModalOpen && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setIsPasswordModalOpen(false)}
          showToast={showToast}
          tones={tones}
        />
      )}

      {/* Modal 6: Novo Membro da Equipe */}
      {isNewUserModalOpen && (
        <CreateUserModal
          onClose={() => setIsNewUserModalOpen(false)}
          onCreated={carregarUsuarios}
          showToast={showToast}
        />
      )}

      {/* Modal 7: Editar Cargo / Nível de Acesso de Usuário */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isSelf={editingUser.id === currentUser.id}
          onClose={() => setEditingUser(null)}
          onSaved={carregarUsuarios}
          showToast={showToast}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTE: BARRA DE PAGINAÇÃO
// ============================================================================
interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  const safePage = Math.min(currentPage, totalPages);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 16px',
        borderTop: '1px solid var(--card-border)',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
        Página {safePage} de {totalPages} • {totalItems} itens
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="btn-outline"
          style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px' }}
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="btn-outline"
          style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px' }}
        >
          Próxima <ChevronRight size={14} />
        </button>
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
  onCreate: (product: Omit<Product, 'id'>) => Promise<boolean>;
  showToast: (msg: string) => void;
  tones: SemanticTones;
}

const CreateManualProductModal: React.FC<CreateManualProductModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  showToast,
  tones,
}) => {
  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('5');
  const [estoqueMinimo, setEstoqueMinimo] = useState('3');
  const [jogo, setJogo] = useState<GameId>('pokemon');
  const [categoria, setCategoria] = useState<ProductCategory>('Booster Pack');
  const [imagemUrl, setImagemUrl] = useState('');
  const [imagemBroken, setImagemBroken] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!nome.trim()) {
      showToast('Informe o nome do produto.');
      return;
    }

    const priceNum = parseMoneyToFloat(preco);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      showToast('Informe um preço válido maior que R$ 0,00.');
      return;
    }

    const stockNum = Number.parseInt(estoque.trim(), 10);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      showToast('Informe um estoque inicial válido (0 ou maior).');
      return;
    }

    const minStockNum = Number.parseInt(estoqueMinimo.trim(), 10);
    if (Number.isNaN(minStockNum) || minStockNum < 0) {
      showToast('Informe um estoque mínimo válido (0 ou maior).');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onCreate({
        nome: nome.trim(),
        subtitulo: subtitulo.trim() || `${categoria} • ${GAME_LABELS[jogo]}`,
        preco: priceNum,
        estoque: stockNum,
        estoqueMinimo: minStockNum,
        jogo,
        jogoNome: GAME_LABELS[jogo] || 'Geral',
        categoria,
        descricao: descricao.trim() || 'Produto oficial licenciado da loja Noble Deck.',
        imagemUrl: imagemUrl.trim(),
        isNovo: true,
        isDestaque: false,
      });

      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SystemModal onClose={onClose} maxWidth="600px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '4px' }}>
            Cadastro Manual
          </span>
          <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Adicionar Novo Produto ao Estoque
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          title="Fechar"
          style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label htmlFor="manual-prod-name" style={labelStyle}>
            Nome do Produto *
          </label>
          <input
            id="manual-prod-name"
            type="text"
            required
            className="system-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Booster Box Escarlate e Violeta"
          />
        </div>

        <div>
          <label htmlFor="manual-prod-subtitle" style={labelStyle}>
            Subtítulo / Coleção / Código (Opcional)
          </label>
          <input
            id="manual-prod-subtitle"
            type="text"
            className="system-input"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Ex: Coleção Especial 151 • Booster Pack"
          />
        </div>

        <div style={responsiveTwoColGrid}>
          <div>
            <label style={labelStyle}>Jogo *</label>
            <SystemSelect<GameId>
              value={jogo}
              onChange={setJogo}
              options={GAME_OPTIONS.map((g) => ({
                value: g.value,
                label: g.label,
                badge: g.badge,
              }))}
            />
          </div>

          <div>
            <label style={labelStyle}>Categoria *</label>
            <SystemSelect<ProductCategory>
              value={categoria}
              onChange={setCategoria}
              options={CATEGORY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
          </div>
        </div>

        <div style={responsiveThreeColGrid}>
          <div>
            <label htmlFor="manual-prod-price" style={labelStyle}>
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
                  color: 'var(--color-on-surface-variant)',
                  pointerEvents: 'none',
                }}
              >
                R$
              </span>
              <input
                id="manual-prod-price"
                type="text"
                inputMode="decimal"
                required
                className="system-input"
                value={preco}
                onChange={(e) => setPreco(sanitizeDecimalInput(e.target.value))}
                onBlur={() => {
                  const val = parseMoneyToFloat(preco);
                  if (val > 0) setPreco(formatBRL(val));
                }}
                placeholder="0,00"
                style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="manual-prod-stock" style={labelStyle}>
              Estoque Inicial *
            </label>
            <input
              id="manual-prod-stock"
              type="number"
              min="0"
              required
              className="system-input"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="manual-prod-min-stock" style={labelStyle}>
              Estoque Mínimo *
            </label>
            <input
              id="manual-prod-min-stock"
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
          <label htmlFor="manual-prod-img" style={labelStyle}>
            URL da Imagem
          </label>
          <input
            id="manual-prod-img"
            type="url"
            className="system-input"
            value={imagemUrl}
            onChange={(e) => {
              setImagemUrl(e.target.value);
              setImagemBroken(false);
            }}
            placeholder="https://..."
          />
          {imagemUrl.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              {!imagemBroken ? (
                <img
                  src={imagemUrl.trim()}
                  alt="Pré-visualização do produto"
                  onError={() => setImagemBroken(true)}
                  style={{
                    width: '48px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                  }}
                />
              ) : (
                <span style={{ fontSize: '11.5px', color: tones.dangerText, fontWeight: 600 }}>
                  Não foi possível carregar a imagem desta URL.
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="manual-prod-desc" style={labelStyle}>
            Descrição
          </label>
          <textarea
            id="manual-prod-desc"
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
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Produto no Estoque'}
          </button>
        </div>
      </form>
    </SystemModal>
  );
};

// ============================================================================
// SUB-MODAL: ALTERAR SENHA DO USUÁRIO ATIVO
// ============================================================================
interface ChangePasswordModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  showToast: (msg: string) => void;
  tones: SemanticTones;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  onClose,
  showToast,
  tones,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      showToast('Senha da conta ativa atualizada com sucesso!');
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar senha.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SystemModal onClose={onClose} maxWidth="460px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
            Segurança
          </span>
          <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Alterar Senha de Acesso
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          title="Fechar"
          style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderRadius: '10px',
          backgroundColor: tones.warningBg,
          border: `1px solid ${tones.warningBorder}`,
          color: tones.warningText,
          fontSize: '12px',
          lineHeight: 1.45,
          marginBottom: '14px',
        }}
      >
        Esta alteração será aplicada exclusivamente à conta ativa:{' '}
        <strong>
          {currentUser.nome} ({currentUser.email})
        </strong>
        .
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label htmlFor="pwd-current" style={labelStyle}>
            Senha Atual *
          </label>
          <input
            id="pwd-current"
            type="password"
            required
            className="system-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div>
          <label htmlFor="pwd-new" style={labelStyle}>
            Nova Senha *
          </label>
          <input
            id="pwd-new"
            type="password"
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
          <label htmlFor="pwd-confirm" style={labelStyle}>
            Confirmar Nova Senha *
          </label>
          <input
            id="pwd-confirm"
            type="password"
            required
            minLength={8}
            className="system-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            autoComplete="new-password"
          />
        </div>

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

// ============================================================================
// SUB-MODAL: CADASTRAR NOVO MEMBRO / USUÁRIO
// ============================================================================
interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => Promise<void>;
  showToast: (msg: string) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreated, showToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('funcionario');
  const [cargo, setCargo] = useState('Atendente de Loja');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanName.length < 2) {
      showToast('Informe o nome completo.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      showToast('Informe um endereço de e-mail válido.');
      return;
    }
    if (cleanPassword.length < 8) {
      showToast('A senha inicial deve possuir pelo menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.cadastrarUsuario(
        cleanName,
        normalizedEmail,
        cleanPassword,
        role,
        '',
        cargo.trim() || undefined
      );
      await onCreated();
      showToast(`Novo ${role.toUpperCase()} cadastrado com sucesso!`);
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SystemModal onClose={onClose} maxWidth="480px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
            Gestão de Equipe
          </span>
          <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Cadastrar Novo Membro
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          title="Fechar"
          style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label htmlFor="new-user-name" style={labelStyle}>
            Nome Completo *
          </label>
          <input
            id="new-user-name"
            type="text"
            required
            className="system-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Beatriz Lima"
          />
        </div>

        <div>
          <label htmlFor="new-user-email" style={labelStyle}>
            E-mail Institucional *
          </label>
          <input
            id="new-user-email"
            type="email"
            required
            className="system-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="beatriz@nobledeck.com"
          />
        </div>

        <div>
          <label htmlFor="new-user-password" style={labelStyle}>
            Senha Inicial * (mín. 8 caracteres)
          </label>
          <input
            id="new-user-password"
            type="password"
            required
            minLength={8}
            className="system-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div style={responsiveTwoColGrid}>
          <div>
            <label style={labelStyle}>Nível de Acesso</label>
            <SystemSelect<UserRole>
              value={role}
              onChange={(val) => {
                setRole(val);
                if (val === 'admin') setCargo('Administrador Geral');
                else if (val === 'funcionario') setCargo('Atendente de Loja');
                else setCargo('Cliente');
              }}
              options={[
                { value: 'funcionario', label: 'Funcionário' },
                { value: 'admin', label: 'Administrador' },
                { value: 'cliente', label: 'Cliente' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="new-user-cargo" style={labelStyle}>
              Cargo / Função
            </label>
            <input
              id="new-user-cargo"
              type="text"
              className="system-input"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Atendente de Loja"
            />
          </div>
        </div>

        <div className="system-modal-actions">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Salvando...' : 'Salvar Colaborador'}
          </button>
        </div>
      </form>
    </SystemModal>
  );
};

// ============================================================================
// SUB-MODAL: EDITAR PERFIL / CARGO DO USUÁRIO
// ============================================================================
interface EditUserModalProps {
  user: UserProfile;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  showToast: (msg: string) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isSelf,
  onClose,
  onSaved,
  showToast,
}) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [cargo, setCargo] = useState(
    user.cargo ||
    (user.role === 'admin'
      ? 'Administrador Geral'
      : user.role === 'funcionario'
        ? 'Atendente de Loja'
        : 'Cliente')
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (isSelf && role !== 'admin') {
      showToast('Não é permitido rebaixar o nível de acesso da sua própria conta ativa.');
      return;
    }

    setIsSaving(true);
    try {
      await api.atualizarPerfilUsuario(user.id, role, cargo.trim() || undefined);
      await onSaved();
      showToast(`Permissões de "${user.nome}" atualizadas com sucesso!`);
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar perfil do usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SystemModal onClose={onClose} maxWidth="460px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
            Permissões • #{user.id}
          </span>
          <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Editar Usuário: {user.nome}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          title="Fechar"
          style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={responsiveTwoColGrid}>
          <div>
            <label style={labelStyle}>Nível de Acesso</label>
            <SystemSelect<UserRole>
              value={role}
              disabled={isSelf}
              onChange={setRole}
              options={[
                { value: 'admin', label: 'Administrador' },
                { value: 'funcionario', label: 'Funcionário' },
                { value: 'cliente', label: 'Cliente' },
              ]}
            />
            {isSelf && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                Conta ativa não pode ser rebaixada.
              </span>
            )}
          </div>

          <div>
            <label htmlFor="edit-user-cargo" style={labelStyle}>
              Cargo / Função
            </label>
            <input
              id="edit-user-cargo"
              type="text"
              className="system-input"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
            />
          </div>
        </div>

        <div className="system-modal-actions">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Salvando...' : 'Salvar Permissões'}
          </button>
        </div>
      </form>
    </SystemModal>
  );
};
