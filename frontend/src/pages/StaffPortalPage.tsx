import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CreditCard,
  History,
  Home,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  User,
  ShoppingBag,
  Store,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { api, formatBRL } from '../services/api';
import { SystemModal } from '../components/SystemModal';
import { SystemSelect } from '../components/SystemSelect';
import { AccountProfilePanel } from '../components/AccountProfilePanel';
import { CreateProductModal2, ProductControlPage } from './ProductControlPage';
import type { Order } from '../types';

type StaffTab = 'orders' | 'stock' | 'catalog' | 'account';
type OrderFilter = 'all' | 'active' | Order['status'];
type OrderSort = 'priority' | 'newest' | 'oldest' | 'total-desc';
type MovementFilter = 'all' | 'entrada' | 'saida' | 'ajuste';
type MovementSort = 'newest' | 'oldest' | 'qty-desc';

const MOVEMENTS_PER_PAGE = 15;
const ORDERS_PER_PAGE = 10;

interface StaffSemanticTones {
  successText: string;
  successBg: string;
  successBorder: string;
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;
  warningText: string;
  warningBg: string;
  warningBorder: string;
  infoText: string;
  infoBg: string;
  infoBorder: string;
  pendingText: string;
  pendingBg: string;
  pendingBorder: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  subtleSurface: string;
}

const getStaffTones = (isLight: boolean): StaffSemanticTones =>
  isLight
    ? {
      successText: '#166534',
      successBg: 'rgba(22, 163, 74, 0.10)',
      successBorder: 'rgba(22, 163, 74, 0.34)',
      dangerText: '#b91c1c',
      dangerBg: 'rgba(220, 38, 38, 0.09)',
      dangerBorder: 'rgba(220, 38, 38, 0.32)',
      warningText: '#92400e',
      warningBg: 'rgba(217, 119, 6, 0.11)',
      warningBorder: 'rgba(217, 119, 6, 0.36)',
      infoText: '#0369a1',
      infoBg: 'rgba(2, 132, 199, 0.10)',
      infoBorder: 'rgba(2, 132, 199, 0.32)',
      pendingText: '#9a3412',
      pendingBg: 'rgba(234, 88, 12, 0.10)',
      pendingBorder: 'rgba(234, 88, 12, 0.32)',
      accentText: '#7A4B00',
      accentBg: 'rgba(255, 196, 0, 0.22)',
      accentBorder: 'rgba(212, 128, 0, 0.45)',
      subtleSurface: 'var(--color-surface-container-low)',
    }
    : {
      successText: '#4ade80',
      successBg: 'rgba(34, 197, 94, 0.13)',
      successBorder: 'rgba(74, 222, 128, 0.35)',
      dangerText: '#f87171',
      dangerBg: 'rgba(239, 68, 68, 0.14)',
      dangerBorder: 'rgba(248, 113, 113, 0.38)',
      warningText: '#fbbf24',
      warningBg: 'rgba(245, 158, 11, 0.14)',
      warningBorder: 'rgba(251, 191, 36, 0.38)',
      infoText: '#38bdf8',
      infoBg: 'rgba(56, 189, 248, 0.14)',
      infoBorder: 'rgba(56, 189, 248, 0.35)',
      pendingText: '#FF9D00',
      pendingBg: 'rgba(255, 157, 0, 0.12)',
      pendingBorder: 'rgba(255, 157, 0, 0.35)',
      accentText: '#FFD21A',
      accentBg: 'rgba(255, 196, 0, 0.15)',
      accentBorder: 'rgba(255, 210, 26, 0.38)',
      subtleSurface: 'rgba(255, 255, 255, 0.035)',
    };

const getOrderAllowedStatuses = (status: Order['status']): Order['status'][] => {
  if (status === 'Cancelado') return ['Cancelado'];
  if (status === 'Finalizado') return ['Finalizado', 'Cancelado'];
  if (status === 'Enviado') return ['Enviado', 'Finalizado', 'Cancelado'];
  if (status === 'Processando') return ['Processando', 'Enviado', 'Finalizado', 'Cancelado'];
  return ['Pendente', 'Processando', 'Enviado', 'Finalizado', 'Cancelado'];
};

const getOrderStatusVisual = (status: Order['status'], tones: StaffSemanticTones, isLight: boolean) => {
  switch (status) {
    case 'Finalizado':
      return { dot: isLight ? '#16a34a' : '#22c55e', text: tones.successText, bg: tones.successBg, border: tones.successBorder };
    case 'Enviado':
      return { dot: isLight ? '#0284c7' : '#38bdf8', text: tones.infoText, bg: tones.infoBg, border: tones.infoBorder };
    case 'Processando':
      return { dot: isLight ? '#d97706' : '#fbbf24', text: tones.warningText, bg: tones.warningBg, border: tones.warningBorder };
    case 'Cancelado':
      return { dot: isLight ? '#dc2626' : '#f87171', text: tones.dangerText, bg: tones.dangerBg, border: tones.dangerBorder };
    default:
      return { dot: isLight ? '#c2410c' : '#FF9D00', text: tones.pendingText, bg: tones.pendingBg, border: tones.pendingBorder };
  }
};

const STATUS_PRIORITY_WEIGHT: Record<Order['status'], number> = {
  Pendente: 0,
  Processando: 1,
  Enviado: 2,
  Finalizado: 3,
  Cancelado: 4,
};

function formatPaymentLabel(method?: string): string {
  switch ((method || '').toLowerCase()) {
    case 'pix':
      return 'PIX';
    case 'cartao':
      return 'Cartão';
    case 'boleto':
      return 'Boleto';
    case 'retirada_loja':
      return 'Na Retirada';
    default:
      return method ? method.toUpperCase() : 'Não informado';
  }
}

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

export const StaffPortalPage: React.FC = () => {
  const {
    currentUser,
    hasPermission,
    canAccessProductControl,
    setCurrentTab,
    setIsAuthModalOpen,
    setAuthModalMode,
    products,
    addProduct,
    orders,
    updateOrderStatus,
    stockMovements,
    refreshStockMovements,
    registerStockEntry,
    registerStockExit,
    showToast,
    showToastConfirm,
  } = useApp();

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const tones = useMemo(() => getStaffTones(isLight), [isLight]);

  const isAuthenticated = Boolean(currentUser.email) && currentUser.id > 0;
  const isStaff = isAuthenticated && currentUser.role === 'funcionario';
  const isAdmin = isAuthenticated && currentUser.role === 'admin';

  const canManageOrders = hasPermission('pedidos');
  const canManageStock = hasPermission('estoque');
  const canEditProducts = hasPermission('produtos');
  const canImportCatalog = hasPermission('catalogo_api');
  const canViewCatalogTab = canEditProducts || canImportCatalog;

  // Redireciona administradores ao Portal /admin
  useEffect(() => {
    if (isAdmin) {
      setCurrentTab('admin');
    }
  }, [isAdmin, setCurrentTab]);

  // Determina aba padrão compatível com as permissões do colaborador
  const defaultTab: StaffTab = useMemo(() => {
    if (canManageOrders) return 'orders';
    if (canManageStock) return 'stock';
    if (canViewCatalogTab) return 'catalog';
    return 'account';
  }, [canManageOrders, canManageStock, canViewCatalogTab]);

  const [activeTab, setActiveTab] = useState<StaffTab>(defaultTab);

  // Garante que se as permissões mudarem, a aba ativa permaneça válida
  useEffect(() => {
    const allowedTabs: StaffTab[] = ['account'];
    if (canManageOrders) allowedTabs.push('orders');
    if (canManageStock) allowedTabs.push('stock');
    if (canViewCatalogTab) allowedTabs.push('catalog');
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [activeTab, canManageOrders, canManageStock, canViewCatalogTab, defaultTab]);

  // Pedidos
  const [ordersOverride, setOrdersOverride] = useState<Order[] | null>(null);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState<OrderSort>('priority');
  const [orderPage, setOrderPage] = useState(1);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<number, boolean>>({});

  // Modal de Despacho / Código de Rastreio
  const [dispatchingOrder, setDispatchingOrder] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<number | null>(null);

  // Estoque & Movimentações
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementSort, setMovementSort] = useState<MovementSort>('newest');
  const [movementPage, setMovementPage] = useState(1);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [selectedStockProductId, setSelectedStockProductId] = useState<number>(0);
  const [stockAmountInput, setStockAmountInput] = useState('5');
  const [stockReasonInput, setStockReasonInput] = useState('');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Modal de Produto
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);

  const latestProductsRef = useRef(products);
  const latestOrdersOverrideRef = useRef(ordersOverride);

  useEffect(() => {
    latestProductsRef.current = products;
  }, [products]);

  useEffect(() => {
    latestOrdersOverrideRef.current = ordersOverride;
  }, [ordersOverride]);

  useEffect(() => {
    setOrdersOverride((prev) => {
      if (!prev) return null;
      const map = new Map(orders.map((o) => [o.id_pedido, o]));
      const merged = prev.map((existing) => map.get(existing.id_pedido) ?? existing);
      const seen = new Set(prev.map((o) => o.id_pedido));
      const added = orders.filter((o) => !seen.has(o.id_pedido));
      return [...added, ...merged];
    });
  }, [orders]);

  // Produtos e Alertas
  const activeProducts = useMemo(() => products.filter((p) => p.ativo !== false), [products]);
  const inactiveProducts = useMemo(() => products.filter((p) => p.ativo === false), [products]);
  const productsWithStock = useMemo(() => activeProducts.filter((p) => p.estoque > 0), [activeProducts]);
  const totalUnitsInStock = useMemo(
    () => activeProducts.reduce((sum, p) => sum + (p.estoque || 0), 0),
    [activeProducts]
  );

  const outOfStockProducts = useMemo(
    () => activeProducts.filter((p) => p.estoque <= 0),
    [activeProducts]
  );
  const criticalStockProducts = useMemo(
    () => activeProducts.filter((p) => p.estoque > 0 && p.estoque <= (p.estoqueMinimo ?? 3)),
    [activeProducts]
  );
  const replenishmentQueue = useMemo(
    () =>
      [...outOfStockProducts, ...criticalStockProducts].sort(
        (a, b) => a.estoque - b.estoque || a.nome.localeCompare(b.nome)
      ),
    [outOfStockProducts, criticalStockProducts]
  );

  const selectedStockProduct = useMemo(
    () => activeProducts.find((p) => p.id === selectedStockProductId) || null,
    [activeProducts, selectedStockProductId]
  );

  // Pedidos da loja (ou próprios se não tiver permissão 'pedidos')
  const ordersSource = ordersOverride ?? orders;
  const personalOrders = useMemo(
    () =>
      ordersSource.filter(
        (o) =>
          o.cliente_id === currentUser.id ||
          o.cliente_email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()
      ),
    [ordersSource, currentUser.id, currentUser.email]
  );

  const orderStats = useMemo(() => {
    let pending = 0;
    let processing = 0;
    let shipped = 0;
    let finished = 0;
    let cancelled = 0;
    let pickupPending = 0;

    for (const o of ordersSource) {
      if (o.status === 'Pendente') pending += 1;
      else if (o.status === 'Processando') processing += 1;
      else if (o.status === 'Enviado') shipped += 1;
      else if (o.status === 'Finalizado') finished += 1;
      else if (o.status === 'Cancelado') cancelled += 1;

      if (o.tipo_entrega === 'retirada' && o.status !== 'Finalizado' && o.status !== 'Cancelado') {
        pickupPending += 1;
      }
    }

    return {
      pending,
      processing,
      activeQueue: pending + processing,
      shipped,
      finished,
      cancelled,
      pickupPending,
    };
  }, [ordersSource]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const list = ordersSource.filter((o) => {
      if (orderFilter === 'active') {
        if (o.status !== 'Pendente' && o.status !== 'Processando') return false;
      } else if (orderFilter !== 'all' && o.status !== orderFilter) {
        return false;
      }
      if (!q) return true;
      const matchesMeta =
        String(o.id_pedido).includes(q) ||
        (o.numero ? String(o.numero).includes(q) : false) ||
        (o.codigo_rastreio || '').toLowerCase().includes(q) ||
        o.cliente_nome.toLowerCase().includes(q) ||
        o.cliente_email.toLowerCase().includes(q) ||
        (o.cliente_telefone || '').toLowerCase().includes(q);
      const matchesItem = o.itens.some((item) => item.produto.nome.toLowerCase().includes(q));
      return matchesMeta || matchesItem;
    });

    return [...list].sort((a, b) => {
      if (orderSort === 'priority') {
        const diff = STATUS_PRIORITY_WEIGHT[a.status] - STATUS_PRIORITY_WEIGHT[b.status];
        if (diff !== 0) return diff;
        return b.id_pedido - a.id_pedido;
      }
      if (orderSort === 'oldest') return a.id_pedido - b.id_pedido;
      if (orderSort === 'total-desc') return (b.valor_total || 0) - (a.valor_total || 0);
      return b.id_pedido - a.id_pedido;
    });
  }, [ordersSource, orderFilter, orderSearch, orderSort]);

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const safePage = Math.min(orderPage, orderTotalPages);
    const start = (safePage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, orderPage, orderTotalPages]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderFilter, orderSearch, orderSort]);

  // Movimentações
  const filteredMovements = useMemo(() => {
    const q = movementSearch.trim().toLowerCase();
    const list = stockMovements.filter((m) => {
      if (movementFilter !== 'all' && m.tipo !== movementFilter) return false;
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
  }, [stockMovements, movementFilter, movementSearch, movementSort]);

  const movementTotalPages = Math.max(1, Math.ceil(filteredMovements.length / MOVEMENTS_PER_PAGE));
  const paginatedMovements = useMemo(() => {
    const safePage = Math.min(movementPage, movementTotalPages);
    const start = (safePage - 1) * MOVEMENTS_PER_PAGE;
    return filteredMovements.slice(start, start + MOVEMENTS_PER_PAGE);
  }, [filteredMovements, movementPage, movementTotalPages]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementFilter, movementSearch, movementSort]);

  const handleRefreshOrders = useCallback(async () => {
    if (isRefreshingOrders) return;
    setIsRefreshingOrders(true);
    try {
      const fresh = await api.obterPedidos(latestProductsRef.current);
      setOrdersOverride(fresh);
      showToast('Fila de pedidos atualizada!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Não foi possível atualizar os pedidos.');
    } finally {
      setIsRefreshingOrders(false);
    }
  }, [isRefreshingOrders, showToast]);

  const executeOrderUpdate = async (
    order: Order,
    nextStatus: Order['status'],
    options?: { codigoRastreio?: string; statusPagamento?: string }
  ) => {
    setIsUpdatingOrder(order.id_pedido);
    try {
      await updateOrderStatus(order.id_pedido, nextStatus, options);
      if (latestOrdersOverrideRef.current !== null) {
        try {
          const fresh = await api.obterPedidos(latestProductsRef.current);
          setOrdersOverride(fresh);
        } catch {
          // Mantém estado local atualizado via AppContext
        }
      }
    } finally {
      setIsUpdatingOrder(null);
    }
  };

  const handleRequestStatusChange = (order: Order, nextStatus: Order['status']) => {
    if (nextStatus === order.status) return;
    const orderNum = order.numero || order.id_pedido;

    if (nextStatus === 'Cancelado') {
      showToastConfirm({
        message: `Confirmar cancelamento do Pedido #${orderNum} (${order.cliente_nome})? As unidades serão estornadas ao estoque automaticamente.`,
        confirmText: 'Cancelar Pedido',
        cancelText: 'Voltar',
        onConfirm: () => {
          void executeOrderUpdate(order, 'Cancelado');
        },
      });
      return;
    }

    if (nextStatus === 'Enviado' && order.tipo_entrega !== 'retirada') {
      setDispatchingOrder(order);
      setTrackingInput(order.codigo_rastreio || '');
      return;
    }

    if (
      nextStatus === 'Finalizado' &&
      (order.status_pagamento === 'Na Retirada' || order.status_pagamento === 'Aguardando')
    ) {
      showToastConfirm({
        message: `Finalizar Pedido #${orderNum} e marcar o pagamento (${formatPaymentLabel(order.metodo_pagamento)}) como Aprovado?`,
        confirmText: 'Finalizar e Aprovar',
        cancelText: 'Cancelar',
        onConfirm: () => {
          void executeOrderUpdate(order, 'Finalizado', { statusPagamento: 'Aprovado' });
        },
      });
      return;
    }

    void executeOrderUpdate(order, nextStatus);
  };

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingOrder) return;
    const code = trackingInput.trim();
    const targetOrder = dispatchingOrder;
    setDispatchingOrder(null);
    await executeOrderUpdate(targetOrder, 'Enviado', code ? { codigoRastreio: code } : undefined);
  };

  const openEntryModal = (preselectedProductId?: number) => {
    if (!canManageStock || activeProducts.length === 0) return;
    setSelectedStockProductId(preselectedProductId || activeProducts[0].id);
    setStockAmountInput('5');
    setStockReasonInput('Reposição de Estoque');
    setIsEntryModalOpen(true);
  };

  const openExitModal = (preselectedProductId?: number) => {
    if (!canManageStock || productsWithStock.length === 0) return;
    setSelectedStockProductId(preselectedProductId || productsWithStock[0].id);
    setStockAmountInput('1');
    setStockReasonInput('Baixa Operacional / Balcão');
    setIsExitModalOpen(true);
  };

  const handleConfirmEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct || isSubmittingStock) return;
    const qty = Number.parseInt(stockAmountInput.trim(), 10);
    if (Number.isNaN(qty) || qty <= 0) {
      showToast('Informe uma quantidade válida maior que zero.');
      return;
    }
    setIsSubmittingStock(true);
    try {
      await registerStockEntry(
        selectedStockProduct.id,
        qty,
        stockReasonInput.trim() || 'Reposição de Estoque'
      );
      setIsEntryModalOpen(false);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const handleConfirmExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct || isSubmittingStock) return;
    const qty = Number.parseInt(stockAmountInput.trim(), 10);
    if (Number.isNaN(qty) || qty <= 0) {
      showToast('Informe uma quantidade válida maior que zero.');
      return;
    }
    if (qty > selectedStockProduct.estoque) {
      showToast(`Saldo insuficiente! Estoque atual: ${selectedStockProduct.estoque} un.`);
      return;
    }
    setIsSubmittingStock(true);
    try {
      await registerStockExit(
        selectedStockProduct.id,
        qty,
        stockReasonInput.trim() || 'Baixa Operacional'
      );
      setIsExitModalOpen(false);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Estado não autenticado
  if (!isAuthenticated) {
    return (
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }}>
        <div className="app-container" style={{ maxWidth: '500px' }}>
          <div className="access-denied-card">
            <div className="access-denied-glow-bg" />
            <div className="access-denied-icon-box">
              <Shield size={32} color="var(--color-primary)" />
            </div>
            <span className="access-denied-pill">Acesso Restrito à Equipe</span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-headline)', margin: '0 0 10px' }}>
              Central Operacional da Loja
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.6, marginBottom: '26px' }}>
              Entre com sua conta de colaborador para acessar a fila de pedidos, reposição de estoque e catálogo autorizado.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="btn-primary"
                style={{ padding: '12px 26px', borderRadius: '8px' }}
              >
                Fazer Login
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                className="btn-outline"
                style={{ padding: '12px 22px', borderRadius: '8px' }}
              >
                <Home size={15} /> Voltar à Loja
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return null;
  }

  // Caso cliente tente acessar /equipe
  if (!isStaff) {
    return (
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }}>
        <div className="app-container" style={{ maxWidth: '520px' }}>
          <div className="access-denied-card">
            <div className="access-denied-icon-box">
              <ShieldAlert size={32} color={tones.dangerText} />
            </div>
            <h2 style={{ fontSize: '23px', fontWeight: 800, margin: '0 0 10px', color: 'var(--color-headline)' }}>
              Área Exclusiva de Colaboradores
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              Você está conectado como <strong>{currentUser.email}</strong>. Para acompanhar suas compras e dados pessoais, acesse sua área de cliente.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCurrentTab('dashboard')}
                className="btn-primary"
                style={{ padding: '12px 22px', borderRadius: '8px' }}
              >
                <UserCheck size={15} /> Ir para Meus Pedidos
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                className="btn-outline"
                style={{ padding: '12px 20px', borderRadius: '8px' }}
              >
                Voltar à Loja
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const firstName = currentUser.nome.trim().split(' ')[0] || currentUser.nome;

  const availableTabs: Array<{
    id: StaffTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeTone?: 'accent' | 'danger';
  }> = [];

  if (canManageOrders) {
    availableTabs.push({
      id: 'orders',
      label: 'Pedidos & Expedição',
      icon: <ShoppingBag size={15} />,
      badge: orderStats.activeQueue > 0 ? orderStats.activeQueue : undefined,
      badgeTone: 'accent',
    });
  }
  if (canManageStock) {
    availableTabs.push({
      id: 'stock',
      label: 'Estoque & Movimentações',
      icon: <History size={15} />,
      badge: replenishmentQueue.length > 0 ? replenishmentQueue.length : undefined,
      badgeTone: 'danger',
    });
  }
  if (canViewCatalogTab) {
    availableTabs.push({
      id: 'catalog',
      label: 'Produtos & Catálogo',
      icon: <Boxes size={15} />,
    });
  }
  availableTabs.push({
    id: 'account',
    label: 'Minha Conta',
    icon: <User size={15} />,
  });

  return (
    <div className="workstation-canvas staff-portal-root admin-animate-fade">
      <section className="staff-command-header">
        <div className="staff-command-top">
          <div className="staff-identity-col">
            <div className="staff-role-strip">
              <span className="staff-cargo-tag">
                {currentUser.cargo || 'Atendente de Loja'}
              </span>
            </div>

            <h1 className="staff-page-title">
              Central Operacional de {firstName}
            </h1>

            <p className="staff-identity-meta">
              <span>{currentUser.nome}</span>
              <span aria-hidden="true">•</span>
              <span>{currentUser.email}</span>
            </p>
          </div>

          {/* Comandos Rápidos condicionais às permissões reais */}
          <div className="staff-actions-cluster">
            {canManageStock && (
              <>
                <button
                  type="button"
                  disabled={activeProducts.length === 0}
                  onClick={() => openEntryModal()}
                  className="staff-action-btn"
                  style={{
                    backgroundColor: tones.successBg,
                    borderColor: tones.successBorder,
                    color: tones.successText,
                    opacity: activeProducts.length === 0 ? 0.45 : 1,
                    cursor: activeProducts.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ArrowUpCircle size={15} />
                  <span>Nova Entrada</span>
                </button>

                <button
                  type="button"
                  disabled={productsWithStock.length === 0}
                  onClick={() => openExitModal()}
                  className="staff-action-btn"
                  style={{
                    backgroundColor: tones.dangerBg,
                    borderColor: tones.dangerBorder,
                    color: tones.dangerText,
                    opacity: productsWithStock.length === 0 ? 0.45 : 1,
                    cursor: productsWithStock.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ArrowDownCircle size={15} />
                  <span>Baixa Operacional</span>
                </button>
              </>
            )}

            {canEditProducts && (
              <button
                type="button"
                onClick={() => setIsCreateProductModalOpen(true)}
                className="btn-primary staff-primary-btn"
              >
                <Plus size={15} />
                <span>Novo Produto</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="btn-outline staff-secondary-btn"
              title="Alterar dados pessoais, e-mail ou senha"
            >
              <User size={14} />
              <span>Minha Conta</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. TELEMETRIA OPERACIONAL (INDICADORES DINÂMICOS DA OPERAÇÃO)
         ===================================================================== */}
      <section className="staff-kpi-grid" aria-label="Indicadores operacionais">
        {canManageOrders && (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setOrderFilter('active');
              }}
              className={`staff-kpi-card ${orderStats.pending > 0 ? 'is-attention' : ''}`}
            >
              <div className="staff-kpi-head">
                <span className="staff-kpi-label">Fila de Pedidos Ativos</span>
                <span
                  className="staff-kpi-icon"
                  style={{
                    backgroundColor: tones.accentBg,
                    color: tones.accentText,
                  }}
                >
                  <ShoppingBag size={16} />
                </span>
              </div>
              <div className="staff-kpi-value" style={{ color: 'var(--color-headline)' }}>
                {orderStats.activeQueue}
              </div>
              <div className="staff-kpi-foot">
                <span>{orderStats.pending} pendentes • {orderStats.processing} em preparo</span>
                <ArrowRight size={13} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setOrderFilter('Enviado');
              }}
              className="staff-kpi-card"
            >
              <div className="staff-kpi-head">
                <span className="staff-kpi-label">Expedição & Retiradas</span>
                <span
                  className="staff-kpi-icon"
                  style={{
                    backgroundColor: tones.infoBg,
                    color: tones.infoText,
                  }}
                >
                  <Truck size={16} />
                </span>
              </div>
              <div className="staff-kpi-value" style={{ color: tones.infoText }}>
                {orderStats.shipped}
              </div>
              <div className="staff-kpi-foot">
                <span>{orderStats.pickupPending} retiradas em loja em aberto</span>
                <ArrowRight size={13} />
              </div>
            </button>
          </>
        )}

        {(canManageStock || canViewCatalogTab) && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab(canManageStock ? 'stock' : 'catalog')}
              className={`staff-kpi-card ${outOfStockProducts.length > 0
                ? 'is-danger'
                : criticalStockProducts.length > 0
                  ? 'is-attention'
                  : ''
                }`}
            >
              <div className="staff-kpi-head">
                <span className="staff-kpi-label">Alertas de Reposição</span>
                <span
                  className="staff-kpi-icon"
                  style={{
                    backgroundColor: outOfStockProducts.length > 0
                      ? tones.dangerBg
                      : criticalStockProducts.length > 0
                        ? tones.warningBg
                        : tones.successBg,
                    color: outOfStockProducts.length > 0
                      ? tones.dangerText
                      : criticalStockProducts.length > 0
                        ? tones.warningText
                        : tones.successText,
                  }}
                >
                  <AlertTriangle size={16} />
                </span>
              </div>
              <div
                className="staff-kpi-value"
                style={{
                  color: outOfStockProducts.length > 0
                    ? tones.dangerText
                    : criticalStockProducts.length > 0
                      ? tones.warningText
                      : tones.successText,
                }}
              >
                {replenishmentQueue.length}
              </div>
              <div className="staff-kpi-foot">
                <span>
                  {replenishmentQueue.length === 0
                    ? 'Estoque regular em todos os itens'
                    : `${outOfStockProducts.length} zerados • ${criticalStockProducts.length} abaixo do mínimo`}
                </span>
                <ArrowRight size={13} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(canViewCatalogTab ? 'catalog' : 'stock')}
              className="staff-kpi-card"
            >
              <div className="staff-kpi-head">
                <span className="staff-kpi-label">Inventário em Loja</span>
                <span
                  className="staff-kpi-icon"
                  style={{
                    backgroundColor: tones.accentBg,
                    color: tones.accentText,
                  }}
                >
                  <Package size={16} />
                </span>
              </div>
              <div className="staff-kpi-value">
                {totalUnitsInStock}{' '}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>un.</span>
              </div>
              <div className="staff-kpi-foot">
                <span>
                  {activeProducts.length} produtos ativos
                  {inactiveProducts.length > 0 ? ` (${inactiveProducts.length} inativos)` : ''}
                </span>
                <ArrowRight size={13} />
              </div>
            </button>
          </>
        )}

        {!canManageOrders && !canManageStock && !canViewCatalogTab && (
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className="staff-kpi-card"
          >
            <div className="staff-kpi-head">
              <span className="staff-kpi-label">Minhas Compras</span>
              <span
                className="staff-kpi-icon"
                style={{
                  backgroundColor: tones.accentBg,
                  color: tones.accentText,
                }}
              >
                <ShoppingBag size={16} />
              </span>
            </div>
            <div className="staff-kpi-value">{personalOrders.length}</div>
            <div className="staff-kpi-foot">
              <span>Pedidos pessoais registrados na loja</span>
              <ArrowRight size={13} />
            </div>
          </button>
        )}
      </section>

      {/* =====================================================================
          3. NAVEGAÇÃO POR ABAS DA ESTAÇÃO OPERACIONAL
         ===================================================================== */}
      <div
        role="tablist"
        aria-label="Módulos operacionais da equipe"
        className="staff-tablist"
      >
        {availableTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`staff-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`staff-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`staff-tab-btn ${isActive ? 'is-active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className="staff-tab-count"
                  style={{
                    backgroundColor: tab.badgeTone === 'danger' ? tones.dangerBg : tones.accentBg,
                    borderColor: tab.badgeTone === 'danger' ? tones.dangerBorder : tones.accentBorder,
                    color: tab.badgeTone === 'danger' ? tones.dangerText : tones.accentText,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          ABA 1: PEDIDOS & EXPEDIÇÃO
         ===================================================================== */}
      {activeTab === 'orders' && canManageOrders && (
        <section
          id="staff-panel-orders"
          role="tabpanel"
          aria-labelledby="staff-tab-orders"
          className="staff-panel-box admin-animate-fade"
        >
          <div className="staff-section-header">
            <div>
              <h2>Fila de Pedidos & Expedição ({ordersSource.length})</h2>
              <p>
                Acompanhe pedidos em andamento, registre código de rastreio no despacho e confirme pagamentos na retirada.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={isRefreshingOrders}
              className="btn-outline"
              style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px' }}
            >
              <RefreshCw size={13} className={isRefreshingOrders ? 'spin' : ''} />
              <span>{isRefreshingOrders ? 'Atualizando...' : 'Atualizar Fila'}</span>
            </button>
          </div>

          {/* Barra de Filtros, Busca e Ordenação */}
          <div className="staff-toolbar">
            <div className="staff-filter-pills">
              {(
                [
                  { id: 'all' as OrderFilter, label: `Todos (${ordersSource.length})` },
                  { id: 'active' as OrderFilter, label: `Fila Ativa (${orderStats.activeQueue})` },
                  { id: 'Pendente' as OrderFilter, label: `Pendente (${orderStats.pending})` },
                  { id: 'Processando' as OrderFilter, label: `Processando (${orderStats.processing})` },
                  { id: 'Enviado' as OrderFilter, label: `Enviado (${orderStats.shipped})` },
                  { id: 'Finalizado' as OrderFilter, label: `Finalizado (${orderStats.finished})` },
                  { id: 'Cancelado' as OrderFilter, label: `Cancelado (${orderStats.cancelled})` },
                ] as const
              ).map((chip) => {
                const active = orderFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setOrderFilter(chip.id)}
                    className={`staff-chip ${active ? 'is-active' : ''}`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <div className="staff-search-row">
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
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
                  placeholder="Buscar por #pedido, cliente, e-mail, rastreio ou carta..."
                  aria-label="Buscar pedidos da loja"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ width: '210px', flexShrink: 0 }}>
                <SystemSelect<OrderSort>
                  size="sm"
                  value={orderSort}
                  onChange={setOrderSort}
                  options={[
                    { value: 'priority', label: 'Prioridade operacional' },
                    { value: 'newest', label: 'Mais recentes' },
                    { value: 'oldest', label: 'Mais antigos' },
                    { value: 'total-desc', label: 'Maior valor' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Lista de Pedidos */}
          {filteredOrders.length === 0 ? (
            <div className="staff-empty-state">
              <ShoppingBag size={36} style={{ opacity: 0.55 }} />
              <h3>
                {ordersSource.length === 0
                  ? 'Nenhum pedido registrado na loja ainda.'
                  : 'Nenhum pedido corresponde aos filtros selecionados.'}
              </h3>
              <p>
                {ordersSource.length === 0
                  ? 'Assim que clientes concluírem compras no checkout, os pedidos aparecerão aqui para separação.'
                  : 'Limpe a busca ou troque o filtro de status para ver outros pedidos.'}
              </p>
              {ordersSource.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderFilter('all');
                    setOrderSearch('');
                  }}
                  className="btn-outline"
                  style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="staff-orders-list">
              {paginatedOrders.map((order) => {
                const orderNum = order.numero || order.id_pedido;
                const statusStyle = getOrderStatusVisual(order.status, tones, isLight);
                const allowedStatuses = getOrderAllowedStatuses(order.status);
                const isExpanded = expandedOrderIds[order.id_pedido] ?? order.itens.length <= 3;
                const isPickup = order.tipo_entrega === 'retirada';
                const isPaymentPending =
                  order.status !== 'Cancelado' &&
                  (order.status_pagamento === 'Aguardando' || order.status_pagamento === 'Na Retirada');
                const isBusy = isUpdatingOrder === order.id_pedido;

                let quickActionLabel: string | null = null;
                let quickActionTarget: Order['status'] | null = null;
                if (order.status === 'Pendente') {
                  quickActionLabel = 'Iniciar Preparo';
                  quickActionTarget = 'Processando';
                } else if (order.status === 'Processando') {
                  quickActionLabel = isPickup ? 'Concluir Retirada' : 'Despachar Pedido';
                  quickActionTarget = isPickup ? 'Finalizado' : 'Enviado';
                } else if (order.status === 'Enviado') {
                  quickActionLabel = 'Confirmar Entrega';
                  quickActionTarget = 'Finalizado';
                }

                return (
                  <article
                    key={order.id_pedido}
                    className="staff-order-card"
                    style={{ borderLeftColor: statusStyle.dot }}
                  >
                    {/* Top Row */}
                    <div className="staff-order-head">
                      <div className="staff-order-meta">
                        <div className="staff-order-title-row">
                          <span className="staff-order-id">Pedido #{orderNum}</span>
                          {order.numero !== undefined && order.numero !== order.id_pedido && (
                            <span className="staff-order-subid">ID #{order.id_pedido}</span>
                          )}
                          <span
                            className="staff-status-pill"
                            style={{
                              backgroundColor: statusStyle.bg,
                              borderColor: statusStyle.border,
                              color: statusStyle.text,
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: statusStyle.dot,
                              }}
                            />
                            {order.status}
                          </span>

                          <span
                            className="staff-delivery-pill"
                            style={{
                              backgroundColor: isPickup ? tones.accentBg : tones.infoBg,
                              borderColor: isPickup ? tones.accentBorder : tones.infoBorder,
                              color: isPickup ? tones.accentText : tones.infoText,
                            }}
                          >
                            {isPickup ? <Store size={12} /> : <Truck size={12} />}
                            <span>{isPickup ? 'Retirada na Loja' : 'Entrega'}</span>
                          </span>

                          {order.metodo_pagamento && (
                            <span
                              className="staff-delivery-pill"
                              style={{
                                backgroundColor:
                                  order.status_pagamento === 'Aprovado'
                                    ? tones.successBg
                                    : order.status_pagamento === 'Estornado' || order.status_pagamento === 'Cancelado'
                                      ? tones.dangerBg
                                      : tones.warningBg,
                                borderColor:
                                  order.status_pagamento === 'Aprovado'
                                    ? tones.successBorder
                                    : order.status_pagamento === 'Estornado' || order.status_pagamento === 'Cancelado'
                                      ? tones.dangerBorder
                                      : tones.warningBorder,
                                color:
                                  order.status_pagamento === 'Aprovado'
                                    ? tones.successText
                                    : order.status_pagamento === 'Estornado' || order.status_pagamento === 'Cancelado'
                                      ? tones.dangerText
                                      : tones.warningText,
                              }}
                            >
                              <CreditCard size={12} />
                              <span>
                                {formatPaymentLabel(order.metodo_pagamento)}
                                {order.status_pagamento ? ` • ${order.status_pagamento}` : ''}
                              </span>
                            </span>
                          )}

                          {order.codigo_rastreio && (
                            <button
                              type="button"
                              onClick={() => {
                                setDispatchingOrder(order);
                                setTrackingInput(order.codigo_rastreio || '');
                              }}
                              className="staff-delivery-pill"
                              style={{
                                backgroundColor: tones.infoBg,
                                borderColor: tones.infoBorder,
                                color: tones.infoText,
                                cursor: 'pointer',
                              }}
                              title="Editar código de rastreio"
                            >
                              <span>Rastreio: {order.codigo_rastreio}</span>
                            </button>
                          )}
                        </div>

                        <div className="staff-order-customer">
                          <strong>{order.cliente_nome}</strong>
                          <span>•</span>
                          <span>{order.cliente_email}</span>
                          {order.cliente_telefone && (
                            <>
                              <span>•</span>
                              <span>{order.cliente_telefone}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="font-mono">{order.data}</span>
                        </div>

                        {order.endereco_entrega && (
                          <div className="staff-order-address">
                            <strong>Destino:</strong> {order.endereco_entrega}
                            {order.cep && !isPickup ? ` (CEP ${order.cep})` : ''}
                          </div>
                        )}

                        {order.observacoes && (
                          <div
                            className="staff-order-notes"
                            style={{
                              backgroundColor: tones.warningBg,
                              borderColor: tones.warningBorder,
                              color: tones.warningText,
                            }}
                          >
                            <strong>Observação do cliente:</strong> {order.observacoes}
                          </div>
                        )}
                      </div>

                      {/* Controles Operacionais do Pedido */}
                      <div className="staff-order-controls">
                        <div className="staff-order-total-block">
                          <span className="staff-order-total-label">Total</span>
                          <span className="staff-order-total-value" style={{ color: tones.accentText }}>
                            R$ {formatBRL(order.valor_total)}
                          </span>
                        </div>

                        <div className="staff-order-buttons-row">
                          {quickActionLabel && quickActionTarget && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRequestStatusChange(order, quickActionTarget)}
                              className="btn-primary"
                              style={{
                                padding: '7px 14px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {quickActionLabel}
                            </button>
                          )}

                          {isPaymentPending && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                showToastConfirm({
                                  message: `Confirmar recebimento do pagamento (${formatPaymentLabel(order.metodo_pagamento)}) do Pedido #${orderNum}?`,
                                  confirmText: 'Confirmar Pagamento',
                                  cancelText: 'Voltar',
                                  onConfirm: () => {
                                    void executeOrderUpdate(order, order.status, {
                                      statusPagamento: 'Aprovado',
                                    });
                                  },
                                });
                              }}
                              className="btn-outline"
                              style={{
                                padding: '7px 12px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                borderColor: tones.successBorder,
                                color: tones.successText,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Check size={13} /> Confirmar Pagamento
                            </button>
                          )}

                          <div style={{ width: '150px' }}>
                            <SystemSelect<Order['status']>
                              size="sm"
                              value={order.status}
                              disabled={order.status === 'Cancelado' || isBusy}
                              onChange={(next) => handleRequestStatusChange(order, next)}
                              options={allowedStatuses.map((st) => ({ value: st, label: st }))}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrderIds((prev) => ({
                                ...prev,
                                [order.id_pedido]: !isExpanded,
                              }))
                            }
                            className="btn-outline"
                            style={{
                              padding: '7px 11px',
                              borderRadius: '8px',
                              fontSize: '11.5px',
                              whiteSpace: 'nowrap',
                            }}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            <span>Itens ({order.itens.length})</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Itens do Pedido */}
                    {isExpanded && (
                      <div className="staff-order-items-box">
                        {order.itens.length === 0 ? (
                          <span style={{ fontSize: '12.5px', color: 'var(--color-on-surface-variant)' }}>
                            Nenhum item detalhado disponível.
                          </span>
                        ) : (
                          order.itens.map((item, idx) => {
                            const unitPrice =
                              item.quantidade > 0 && Number.isFinite(item.subtotal)
                                ? item.subtotal / item.quantidade
                                : item.produto.preco;
                            return (
                              <div key={`${order.id_pedido}-${item.produto.id}-${idx}`} className="staff-order-item-row">
                                <div className="staff-order-item-left">
                                  <span className="staff-order-qty" style={{ color: tones.accentText }}>
                                    {item.quantidade}x
                                  </span>
                                  <span className="staff-order-item-name">{item.produto.nome}</span>
                                  <span className="badge badge-muted" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                    {item.produto.jogoNome || 'Geral'}
                                  </span>
                                </div>
                                <div className="staff-order-item-right">
                                  <span>
                                    R$ {formatBRL(unitPrice)} un.
                                  </span>
                                  <strong>R$ {formatBRL(item.subtotal)}</strong>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {filteredOrders.length > ORDERS_PER_PAGE && (
            <PaginationBar
              currentPage={orderPage}
              totalPages={orderTotalPages}
              totalItems={filteredOrders.length}
              onPageChange={setOrderPage}
            />
          )}
        </section>
      )}

      {/* =====================================================================
          ABA 2: ESTOQUE, REPOSIÇÃO & MOVIMENTAÇÕES
         ===================================================================== */}
      {activeTab === 'stock' && canManageStock && (
        <section
          id="staff-panel-stock"
          role="tabpanel"
          aria-labelledby="staff-tab-stock"
          className="staff-stock-stack admin-animate-fade"
        >
          {/* Fila de Alertas de Reposição */}
          <div className="staff-panel-box">
            <div className="staff-section-header">
              <div>
                <h2>Alertas de Reposição ({replenishmentQueue.length})</h2>
                <p>
                  Itens esgotados ou com saldo igual ou inferior ao estoque mínimo configurado.
                </p>
              </div>
              {canAccessProductControl && (
                <button
                  type="button"
                  onClick={() => setCurrentTab('product-control')}
                  className="btn-outline"
                  style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px' }}
                >
                  <Boxes size={14} /> Abrir Controle de Produtos
                </button>
              )}
            </div>

            {replenishmentQueue.length === 0 ? (
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: '10px',
                  backgroundColor: tones.successBg,
                  border: `1px solid ${tones.successBorder}`,
                  color: tones.successText,
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <CheckCircle2 size={18} />
                <span>Todos os produtos ativos estão acima do limite mínimo de estoque.</span>
              </div>
            ) : (
              <div className="staff-alerts-grid">
                {replenishmentQueue.map((prod) => {
                  const isZero = prod.estoque <= 0;
                  return (
                    <div
                      key={prod.id}
                      className="staff-alert-item"
                      style={{
                        borderColor: isZero ? tones.dangerBorder : tones.warningBorder,
                        backgroundColor: isZero ? tones.dangerBg : tones.warningBg,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span
                            className="font-mono"
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: isZero ? tones.dangerText : tones.warningText,
                            }}
                          >
                            {isZero ? 'Esgotado' : 'Estoque Baixo'}
                          </span>
                          <span className="badge badge-muted" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {prod.jogoNome}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--color-headline)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={prod.nome}
                        >
                          {prod.nome}
                        </div>
                        <div className="font-mono" style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginTop: '3px' }}>
                          Atual: <strong style={{ color: isZero ? tones.dangerText : tones.warningText }}>{prod.estoque} un.</strong> / Mínimo: {prod.estoqueMinimo ?? 3} un.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEntryModal(prod.id)}
                        className="btn-primary"
                        style={{ padding: '7px 12px', fontSize: '11.5px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                      >
                        <Plus size={13} /> Repor
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Auditoria de Movimentações */}
          <div className="staff-panel-box" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--card-border)' }}>
              <div className="staff-section-header" style={{ marginBottom: '14px' }}>
                <div>
                  <h2>Histórico de Movimentações ({stockMovements.length})</h2>
                  <p>Registro completo de entradas, baixas operacionais, vendas e estornos.</p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={activeProducts.length === 0}
                    onClick={() => openEntryModal()}
                    className="staff-action-btn"
                    style={{
                      backgroundColor: tones.successBg,
                      borderColor: tones.successBorder,
                      color: tones.successText,
                    }}
                  >
                    <ArrowUpCircle size={14} /> Entrada
                  </button>
                  <button
                    type="button"
                    disabled={productsWithStock.length === 0}
                    onClick={() => openExitModal()}
                    className="staff-action-btn"
                    style={{
                      backgroundColor: tones.dangerBg,
                      borderColor: tones.dangerBorder,
                      color: tones.dangerText,
                    }}
                  >
                    <ArrowDownCircle size={14} /> Baixa
                  </button>
                  <button
                    type="button"
                    onClick={() => refreshStockMovements()}
                    className="btn-outline"
                    style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    <RefreshCw size={13} /> Atualizar
                  </button>
                </div>
              </div>

              <div className="staff-toolbar" style={{ marginBottom: 0 }}>
                <div className="staff-filter-pills">
                  {(
                    [
                      { id: 'all' as MovementFilter, label: `Todas (${stockMovements.length})` },
                      {
                        id: 'entrada' as MovementFilter,
                        label: `Entradas (${stockMovements.filter((m) => m.tipo === 'entrada').length})`,
                      },
                      {
                        id: 'saida' as MovementFilter,
                        label: `Saídas (${stockMovements.filter((m) => m.tipo === 'saida').length})`,
                      },
                      {
                        id: 'ajuste' as MovementFilter,
                        label: `Ajustes (${stockMovements.filter((m) => m.tipo === 'ajuste').length})`,
                      },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setMovementFilter(chip.id)}
                      className={`staff-chip ${movementFilter === chip.id ? 'is-active' : ''}`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div className="staff-search-row">
                  <div style={{ position: 'relative', flex: '1 1 240px' }}>
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
                  <div style={{ width: '190px', flexShrink: 0 }}>
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
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
              {filteredMovements.length === 0 ? (
                <div className="staff-empty-state">
                  <History size={34} style={{ opacity: 0.55 }} />
                  <h3>Nenhuma movimentação encontrada</h3>
                  <p>Registre entradas ou baixas para acompanhar o histórico de estoque.</p>
                </div>
              ) : (
                <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                      <th style={{ padding: '13px 16px' }}>Data e Hora</th>
                      <th style={{ padding: '13px 12px' }}>Produto</th>
                      <th style={{ padding: '13px 12px' }}>Operação</th>
                      <th style={{ padding: '13px 12px' }}>Qtd.</th>
                      <th style={{ padding: '13px 12px' }}>Saldo</th>
                      <th style={{ padding: '13px 12px' }}>Motivo</th>
                      <th style={{ padding: '13px 16px', textAlign: 'right' }}>Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMovements.map((m) => {
                      const isEntrada = m.tipo === 'entrada';
                      const isAjuste = m.tipo === 'ajuste';
                      const badgeBg = isEntrada ? tones.successBg : isAjuste ? tones.warningBg : tones.dangerBg;
                      const badgeColor = isEntrada ? tones.successText : isAjuste ? tones.warningText : tones.dangerText;
                      const badgeLabel = isEntrada ? 'ENTRADA' : isAjuste ? 'AJUSTE' : 'SAÍDA';
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
                          <td className="font-mono" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
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
                              className="font-mono"
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                backgroundColor: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {badgeLabel}
                            </span>
                          </td>
                          <td className="font-mono" style={{ padding: '12px 12px', fontWeight: 800, color: badgeColor, whiteSpace: 'nowrap' }}>
                            {qtyText} un.
                          </td>
                          <td className="font-mono" style={{ padding: '12px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {m.saldo_anterior} &rarr; <strong>{m.saldo_posterior} un.</strong>
                          </td>
                          <td style={{ padding: '12px 12px', color: 'var(--color-on-surface-variant)' }}>
                            {m.motivo}
                          </td>
                          <td className="font-mono" style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: tones.accentText, fontWeight: 600 }}>
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
        </section>
      )}

      {/* =====================================================================
          ABA 3: PRODUTOS & CATÁLOGO (EMBEDDED DO CONTROLE UNIFICADO)
         ===================================================================== */}
      {activeTab === 'catalog' && canViewCatalogTab && (
        <section
          id="staff-panel-catalog"
          role="tabpanel"
          aria-labelledby="staff-tab-catalog"
          className="admin-animate-fade"
        >
          <ProductControlPage embedded />
        </section>
      )}

      {/* =====================================================================
          ABA 4: MINHA CONTA (DADOS PESSOAIS, SENHA & COMPRAS)
         ===================================================================== */}
      {activeTab === 'account' && (
        <section
          id="staff-panel-account"
          role="tabpanel"
          aria-labelledby="staff-tab-account"
          className="admin-animate-fade"
        >
          <AccountProfilePanel
            personalOrders={personalOrders}
            showPersonalOrders
            onBrowseCatalog={() => setCurrentTab('products')}
          />
        </section>
      )}

      {/* =====================================================================
          MODAIS OPERACIONAIS DA ESTAÇÃO
         ===================================================================== */}

      {/* Modal: Despacho / Código de Rastreio */}
      {dispatchingOrder && (
        <SystemModal onClose={() => setDispatchingOrder(null)} maxWidth="460px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
                Expedição • Pedido #{dispatchingOrder.numero || dispatchingOrder.id_pedido}
              </span>
              <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                {dispatchingOrder.status === 'Enviado'
                  ? 'Atualizar Código de Rastreio'
                  : 'Despachar Pedido para Entrega'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDispatchingOrder(null)}
              aria-label="Fechar modal de rastreio"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleConfirmDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              Destinatário: <strong style={{ color: 'var(--color-headline)' }}>{dispatchingOrder.cliente_nome}</strong>
              {dispatchingOrder.endereco_entrega ? ` • ${dispatchingOrder.endereco_entrega}` : ''}
            </p>

            <div>
              <label htmlFor="staff-tracking-code" style={labelStyle}>
                Código de Rastreio (Opcional)
              </label>
              <input
                id="staff-tracking-code"
                type="text"
                className="system-input"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                placeholder="Ex: BR123456789SP"
                autoFocus
              />
            </div>

            <div className="system-modal-actions">
              <button type="button" onClick={() => setDispatchingOrder(null)} className="btn-outline">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                <Truck size={15} />
                <span>
                  {dispatchingOrder.status === 'Enviado' ? 'Salvar Rastreio' : 'Confirmar Envio'}
                </span>
              </button>
            </div>
          </form>
        </SystemModal>
      )}

      {/* Modal: Entrada de Estoque */}
      {isEntryModalOpen && canManageStock && (
        <SystemModal onClose={() => setIsEntryModalOpen(false)} maxWidth="500px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
                Movimentação de Entrada
              </span>
              <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Registrar Entrada de Mercadoria
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsEntryModalOpen(false)}
              aria-label="Fechar modal"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleConfirmEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Produto *</label>
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
              <label htmlFor="staff-entry-qty" style={labelStyle}>
                Quantidade a Adicionar *
              </label>
              <input
                id="staff-entry-qty"
                type="number"
                min="1"
                required
                className="system-input"
                value={stockAmountInput}
                onChange={(e) => setStockAmountInput(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="staff-entry-reason" style={labelStyle}>
                Motivo / Fornecedor *
              </label>
              <input
                id="staff-entry-reason"
                type="text"
                required
                className="system-input"
                value={stockReasonInput}
                onChange={(e) => setStockReasonInput(e.target.value)}
                placeholder="Ex: Compra Distribuidor"
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Reposição de Estoque', 'Compra Distribuidor', 'Devolução de Cliente', 'Ajuste de Inventário'].map(
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

      {/* Modal: Baixa Operacional */}
      {isExitModalOpen && canManageStock && (
        <SystemModal onClose={() => setIsExitModalOpen(false)} maxWidth="500px">
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
              <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
                Registrar Baixa no Estoque
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsExitModalOpen(false)}
              aria-label="Fechar modal"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleConfirmExit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Produto *</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label htmlFor="staff-exit-qty" style={labelStyle}>
                  Qtd. a Retirar *
                </label>
                <input
                  id="staff-exit-qty"
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
                        color: isOver ? tones.dangerText : 'var(--color-headline)',
                      }}
                    >
                      {selectedStockProduct
                        ? `${selectedStockProduct.estoque} - ${parsedQty} = ${projected} un.`
                        : '-'}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <label htmlFor="staff-exit-reason" style={labelStyle}>
                Motivo / Justificativa *
              </label>
              <input
                id="staff-exit-reason"
                type="text"
                required
                className="system-input"
                value={stockReasonInput}
                onChange={(e) => setStockReasonInput(e.target.value)}
                placeholder="Ex: Venda Balcão / Avaria"
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Venda Balcão', 'Avaria / Dano', 'Uso Interno', 'Ajuste de Inventário'].map((chip) => (
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

      {/* Modal: Novo Produto Manual */}
      {isCreateProductModalOpen && canEditProducts && (
        <CreateProductModal2
          isOpen={isCreateProductModalOpen}
          onClose={() => setIsCreateProductModalOpen(false)}
          onCreate={async (product) => {
            await addProduct(product);
            setIsCreateProductModalOpen(false);
          }}
        />
      )}

    </div>
  );
};

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
        padding: '14px 18px',
        borderTop: '1px solid var(--card-border)',
      }}
    >
      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
        Página {safePage} de {totalPages} • {totalItems} registros
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
