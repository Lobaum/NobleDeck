import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type {
  Product,
  CartItem,
  Order,
  UserProfile,
  UserRole,
  StaffPermission,
  GameId,
  ExternalCard,
  StockMovement,
  CheckoutSubmissionPayload,
} from '../types';
import {
  api,
  externalCardToProduct,
  getAuthToken,
  setAuthToken,
  setUnauthorizedHandler,
} from '../services/api';
import {
  userHasAnyProductControlPermission,
  userHasPermission,
} from '../constants/accessControl';

export type NavigationTab =
  | 'home'
  | 'products'
  | 'about'
  | 'dashboard'
  | 'staff'
  | 'admin'
  | 'product-control'
  | 'checkout';

const GUEST_USER: UserProfile = {
  id: 0,
  nome: '',
  email: '',
  role: 'cliente',
};

const findMatchingStoreProduct = (target: Product, catalog: Product[]): Product | undefined => {
  const cleanName = target.nome.toLowerCase().trim();
  const candidates = catalog.filter(
    (p) =>
      p.ativo !== false &&
      Number.isFinite(p.preco) &&
      p.preco > 0 &&
      p.estoque > 0 &&
      p.jogo === target.jogo &&
      p.nome.toLowerCase().trim() === cleanName
  );
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];
  const sub = (target.subtitulo || '').toLowerCase().trim();
  return candidates.find((p) => (p.subtitulo || '').toLowerCase().trim() === sub) || candidates[0];
};

const reconcileCartWithProducts = (prevCart: CartItem[], liveProducts: Product[]): CartItem[] => {
  return prevCart.reduce<CartItem[]>((acc, item) => {
    if (!item?.produto || item.produto.id <= 0 || item.produto.externalCard) return acc;

    const live = liveProducts.find((dp) => dp.id === item.produto.id);

    if (
      !live ||
      live.ativo === false ||
      !Number.isFinite(live.preco) ||
      live.preco <= 0 ||
      live.estoque <= 0
    ) {
      return acc;
    }

    const requestedQty = Math.max(1, Math.floor(item.quantidade || 1));
    const existingIdx = acc.findIndex((entry) => entry.produto.id === live.id);
    if (existingIdx >= 0) {
      const combinedQty = Math.min(acc[existingIdx].quantidade + requestedQty, live.estoque);
      acc[existingIdx] = {
        produto: live,
        quantidade: combinedQty,
        subtotal: Math.round(combinedQty * live.preco * 100) / 100,
      };
    } else {
      const clampedQty = Math.min(requestedQty, live.estoque);
      acc.push({
        produto: live,
        quantidade: clampedQty,
        subtotal: Math.round(clampedQty * live.preco * 100) / 100,
      });
    }
    return acc;
  }, []);
};

interface AppContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  selectedGameFilter: GameId | 'all';
  setSelectedGameFilter: (game: GameId | 'all') => void;

  products: Product[];
  selectedProductForModal: Product | null;
  setSelectedProductForModal: (product: Product | null) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void> | void;
  importExternalCard: (card: ExternalCard, estoque?: number, preco?: number) => Promise<Product | null>;
  updateProductStock: (productId: number, change: number) => Promise<void> | void;
  setProductStockExact: (productId: number, newStock: number) => Promise<void> | void;
  editProduct: (productId: number, updatedFields: Partial<Product>) => Promise<void> | void;
  deleteProduct: (productId: number) => Promise<void> | void;
  reactivateProduct: (productId: number) => Promise<void> | void;
  removeProductPermanently: (productId: number) => Promise<void> | void;
  stockMovements: StockMovement[];
  refreshStockMovements: () => Promise<void> | void;
  registerStockEntry: (productId: number, quantity: number, motivo?: string) => Promise<void> | void;
  registerStockExit: (productId: number, quantity: number, motivo?: string) => Promise<void> | void;
  updateProductMinStock: (productId: number, minStock: number) => Promise<void> | void;

  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;

  orders: Order[];
  refreshOrders: () => Promise<void>;
  createOrder: (checkoutDetails: CheckoutSubmissionPayload) => Promise<Order | null>;
  updateOrderStatus: (
    orderId: number,
    status: Order['status'],
    options?: { codigoRastreio?: string; statusPagamento?: string }
  ) => Promise<void> | void;
  cancelOwnOrder: (orderId: number) => Promise<Order | null>;

  externalRequestProduct: Product | null;
  setExternalRequestProduct: (product: Product | null) => void;
  startCheckoutFlow: () => void;

  currentUser: UserProfile;
  hasPermission: (permission: StaffPermission) => boolean;
  canAccessProductControl: boolean;
  refreshCurrentUser: () => Promise<void>;
  updateOwnProfile: (dados: {
    nome: string;
    email: string;
    telefone?: string;
    cpf?: string;
    cep?: string;
    endereco?: string;
  }) => Promise<UserProfile | null>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  loginUser: (
    nome: string,
    email: string,
    role: UserRole,
    senha?: string,
    telefone?: string,
    mode?: 'login' | 'register'
  ) => Promise<boolean>;
  logoutUser: () => void;

  toastMessage: string | null;
  showToast: (msg: string) => void;
  toastConfirm: {
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null;
  showToastConfirm: (options: {
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => void;
  closeToastConfirm: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAdminPath = (pathname: string) => {
    const clean = pathname.toLowerCase().replace(/\/+$/, '');
    return clean === '/admin';
  };

  const isStaffPath = (pathname: string) => {
    const clean = pathname.toLowerCase().replace(/\/+$/, '');
    return clean === '/equipe' || clean === '/painel';
  };

  const isDashboardPath = (pathname: string) => {
    const clean = pathname.toLowerCase().replace(/\/+$/, '');
    return clean === '/minha-conta';
  };

  const isProductControlPath = (pathname: string) => {
    const clean = pathname.toLowerCase().replace(/\/+$/, '');
    return clean === '/gestao-produtos' || clean === '/controle-produtos' || clean === '/produtos-admin';
  };

  const isCheckoutPath = (pathname: string) => {
    const clean = pathname.toLowerCase().replace(/\/+$/, '');
    return clean === '/checkout';
  };

  const getInitialTab = (): NavigationTab => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (isAdminPath(p)) return 'admin';
      if (isStaffPath(p)) return 'staff';
      if (isDashboardPath(p)) return 'dashboard';
      if (isProductControlPath(p)) return 'product-control';
      if (isCheckoutPath(p)) return 'checkout';
    }
    return 'home';
  };

  const [currentTab, setCurrentTabState] = useState<NavigationTab>(getInitialTab);
  const pendingCheckoutAfterAuthRef = useRef(false);

  const setCurrentTab = useCallback((tab: NavigationTab) => {
    setCurrentTabState(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'admin') {
        if (!isAdminPath(window.location.pathname)) {
          window.history.pushState(null, '', '/admin');
        }
      } else if (tab === 'staff') {
        if (!isStaffPath(window.location.pathname)) {
          window.history.pushState(null, '', '/equipe');
        }
      } else if (tab === 'dashboard') {
        if (!isDashboardPath(window.location.pathname)) {
          window.history.pushState(null, '', '/minha-conta');
        }
      } else if (tab === 'product-control') {
        if (!isProductControlPath(window.location.pathname)) {
          window.history.pushState(null, '', '/gestao-produtos');
        }
      } else if (tab === 'checkout') {
        if (!isCheckoutPath(window.location.pathname)) {
          window.history.pushState(null, '', '/checkout');
        }
      } else {
        if (
          isAdminPath(window.location.pathname) ||
          isStaffPath(window.location.pathname) ||
          isDashboardPath(window.location.pathname) ||
          isProductControlPath(window.location.pathname) ||
          isCheckoutPath(window.location.pathname)
        ) {
          window.history.pushState(null, '', '/');
        }
      }
    }
  }, []);

  useEffect(() => {
    const handlePop = () => {
      const p = window.location.pathname;
      if (isAdminPath(p)) {
        setCurrentTabState('admin');
      } else if (isStaffPath(p)) {
        setCurrentTabState('staff');
      } else if (isDashboardPath(p)) {
        setCurrentTabState('dashboard');
      } else if (isProductControlPath(p)) {
        setCurrentTabState('product-control');
      } else if (isCheckoutPath(p)) {
        setCurrentTabState('checkout');
      } else {
        setCurrentTabState('home');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Remove caches antigos de dados mock que pudessem existir no localStorage
  useEffect(() => {
    localStorage.removeItem('noble_products');
    localStorage.removeItem('noble_orders');
    localStorage.removeItem('noble_registered_emails');
  }, []);

  const [selectedGameFilter, setSelectedGameFilter] = useState<GameId | 'all'>('all');

  const [products, setProducts] = useState<Product[]>([]);
  const [hasInitializedProducts, setHasInitializedProducts] = useState(false);
  const productsRef = useRef<Product[]>(products);
  const [orders, setOrders] = useState<Order[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('noble_cart');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item: CartItem) =>
          Boolean(item?.produto) &&
          typeof item.produto.id === 'number' &&
          item.produto.id > 0 &&
          !item.produto.externalCard &&
          item.produto.ativo !== false &&
          Number.isFinite(item.produto.preco) &&
          item.produto.preco > 0 &&
          Number.isFinite(item.produto.estoque) &&
          item.produto.estoque > 0 &&
          Number.isFinite(item.quantidade) &&
          item.quantidade > 0
      );
    } catch {
      return [];
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('noble_user');
    const token = getAuthToken();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed?.email || !parsed?.id || parsed.id <= 0 || !token) {
          localStorage.removeItem('noble_user');
          setAuthToken(null);
          return GUEST_USER;
        }
        return parsed;
      } catch {
        localStorage.removeItem('noble_user');
        setAuthToken(null);
        return GUEST_USER;
      }
    }
    return GUEST_USER;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [externalRequestProduct, setExternalRequestProduct] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastConfirm, setToastConfirm] = useState<{
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const showToastConfirm = useCallback((options: {
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setToastConfirm(options);
  }, []);

  const closeToastConfirm = useCallback(() => {
    setToastConfirm(null);
  }, []);

  const syncProductsAndCart = useCallback((nextProducts: Product[]) => {
    productsRef.current = nextProducts;
    setProducts(nextProducts);
    setCart((prev) => reconcileCartWithProducts(prev, nextProducts));
  }, []);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    localStorage.setItem('noble_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (currentUser.email && currentUser.id > 0 && getAuthToken()) {
      const { token: _omitToken, ...userToStore } = currentUser;
      localStorage.setItem('noble_user', JSON.stringify(userToStore));
    } else {
      localStorage.removeItem('noble_user');
    }
  }, [currentUser]);

  const hasPermission = useCallback(
    (permission: StaffPermission) => userHasPermission(currentUser, permission),
    [currentUser]
  );

  const canAccessProductControl = userHasAnyProductControlPermission(currentUser);

  const refreshCurrentUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const liveProfile = await api.obterSessaoAtual();
      setCurrentUser(liveProfile);
    } catch {
      // Tratamento 401 já limpa a sessão via interceptor
    }
  }, []);

  const updateOwnProfile = useCallback(
    async (dados: {
      nome: string;
      email: string;
      telefone?: string;
      cpf?: string;
      cep?: string;
      endereco?: string;
    }): Promise<UserProfile | null> => {
      try {
        const atualizado = await api.atualizarMeusDados(dados);
        setCurrentUser(atualizado);
        showToast('Dados pessoais da conta atualizados com sucesso!');
        return atualizado;
      } catch (err: any) {
        showToast(err?.message || 'Erro ao atualizar dados da conta.');
        return null;
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (getAuthToken() && currentUser.id > 0) {
      void refreshCurrentUser();
    }
  }, [refreshCurrentUser]);

  // Trata expiração/invalidez de token Bearer (401) em requisições protegidas
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(GUEST_USER);
      setOrders([]);
      setStockMovements([]);
      showToast('Sua sessão expirou ou é inválida. Faça login novamente.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Carregamento inicial público do catálogo de produtos + reconciliação do carrinho
  useEffect(() => {
    let active = true;

    async function loadInitialProducts() {
      try {
        const dadosProdutos = await api.obterProdutos(false);
        if (active && Array.isArray(dadosProdutos)) {
          syncProductsAndCart(dadosProdutos);
        }
      } catch (err: any) {
        console.error('Erro ao carregar produtos do backend:', err);
        if (active) {
          showToast(err?.message || 'Não foi possível carregar o catálogo de produtos do servidor.');
        }
      } finally {
        if (active) {
          setHasInitializedProducts(true);
        }
      }
    }

    loadInitialProducts();
    return () => {
      active = false;
    };
  }, []);

  // Carrega pedidos e movimentações apenas quando autenticado (e movimentações apenas para quem tem permissão de estoque)
  useEffect(() => {
    if (!hasInitializedProducts) return;

    if (currentUser.id <= 0 || !currentUser.email || !getAuthToken()) {
      setOrders([]);
      setStockMovements([]);
      return;
    }

    let active = true;
    const canViewMovements = userHasPermission(currentUser, 'estoque');

    async function loadAuthenticatedData() {
      try {
        const dadosPedidos = await api.obterPedidos(productsRef.current);
        if (active && Array.isArray(dadosPedidos)) {
          setOrders(dadosPedidos);
        }
      } catch (err: any) {
        console.warn('Não foi possível carregar pedidos do backend:', err?.message);
      }

      if (canViewMovements) {
        try {
          const dadosMovimentacoes = await api.obterMovimentacoesEstoque(100);
          if (active && Array.isArray(dadosMovimentacoes)) {
            setStockMovements(dadosMovimentacoes);
          }
        } catch (err: any) {
          console.warn('Não foi possível carregar movimentações de estoque:', err?.message);
        }
      } else {
        setStockMovements([]);
      }
    }

    loadAuthenticatedData();
    return () => {
      active = false;
    };
  }, [hasInitializedProducts, currentUser.id, currentUser.email, currentUser.role, currentUser.permissoes]);

  const refreshProducts = useCallback(async (): Promise<Product[] | null> => {
    try {
      const dadosProdutos = await api.obterProdutos(false);
      if (Array.isArray(dadosProdutos)) {
        syncProductsAndCart(dadosProdutos);
        return dadosProdutos;
      }
      return null;
    } catch (err: any) {
      console.warn('Erro ao recarregar produtos:', err?.message);
      return null;
    }
  }, [syncProductsAndCart]);

  const refreshOrders = useCallback(async (): Promise<void> => {
    if (!currentUser.email || currentUser.id <= 0 || !getAuthToken()) {
      setOrders([]);
      return;
    }
    try {
      const dadosPedidos = await api.obterPedidos(productsRef.current);
      if (Array.isArray(dadosPedidos)) {
        setOrders(dadosPedidos);
      }
    } catch (err: any) {
      console.warn('Erro ao atualizar pedidos:', err?.message);
      showToast(err?.message || 'Não foi possível atualizar os pedidos do servidor.');
    }
  }, [currentUser.email, currentUser.id, showToast]);

  const refreshStockMovements = useCallback(async () => {
    const canViewMovements = userHasPermission(currentUser, 'estoque');
    if (!currentUser.email || currentUser.id <= 0 || !canViewMovements || !getAuthToken()) {
      setStockMovements([]);
      return;
    }
    try {
      const movs = await api.obterMovimentacoesEstoque(100);
      if (Array.isArray(movs)) {
        setStockMovements(movs);
      }
    } catch (err: any) {
      console.warn('Erro ao atualizar movimentações de estoque:', err?.message);
    }
  }, [currentUser]);

  const addToCart = (product: Product, quantity = 1) => {
    let targetProduct = product;
    if (product.id <= 0 || product.externalCard) {
      const matched = findMatchingStoreProduct(product, productsRef.current);
      if (!matched) {
        setSelectedProductForModal(null);
        setExternalRequestProduct(product);
        showToast('Carta externa não catalogada na loja. Envie uma solicitação de encomenda.');
        return;
      }
      targetProduct = matched;
    }

    if (!currentUser.email || currentUser.id <= 0 || !getAuthToken()) {
      showToast('Faça login para adicionar produtos ao carrinho!');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    if (targetProduct.ativo === false) {
      showToast('Este produto não está disponível no momento.');
      return;
    }

    if (!Number.isFinite(targetProduct.preco) || targetProduct.preco <= 0) {
      showToast('Este produto está sem preço definido e não pode ser adicionado ao carrinho.');
      return;
    }

    if (targetProduct.estoque <= 0) {
      showToast('Produto sem estoque disponível no momento!');
      return;
    }

    const safeQty = Math.max(1, Math.floor(quantity));
    if (safeQty > targetProduct.estoque) {
      showToast(`Quantidade máxima em estoque atingida (${targetProduct.estoque})`);
      return;
    }

    let exceeded = false;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.produto.id === targetProduct.id);
      if (existing) {
        const nextQty = existing.quantidade + safeQty;
        if (nextQty > targetProduct.estoque) {
          exceeded = true;
          return prevCart;
        }
        return prevCart.map((item) =>
          item.produto.id === targetProduct.id
            ? {
                produto: targetProduct,
                quantidade: nextQty,
                subtotal: Math.round(nextQty * targetProduct.preco * 100) / 100,
              }
            : item
        );
      }
      return [
        ...prevCart,
        {
          produto: targetProduct,
          quantidade: safeQty,
          subtotal: Math.round(safeQty * targetProduct.preco * 100) / 100,
        },
      ];
    });

    if (exceeded) {
      showToast(`Quantidade máxima em estoque atingida (${targetProduct.estoque})`);
      return;
    }

    showToast(`"${targetProduct.nome}" adicionado ao carrinho!`);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.produto.id !== productId));
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (productId <= 0 || quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.produto.id === productId) {
          const live = productsRef.current.find((p) => p.id === productId) || item.produto;
          const clampedQty = Math.min(Math.floor(quantity), live.estoque);
          if (clampedQty <= 0) return item;
          return {
            produto: live,
            quantidade: clampedQty,
            subtotal: Math.round(clampedQty * live.preco * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantidade, 0);

  const startCheckoutFlow = useCallback(() => {
    if (cart.length === 0) {
      showToast('Seu carrinho está vazio.');
      return;
    }

    const hasUncataloged = cart.some((item) => item.produto.id <= 0 || Boolean(item.produto.externalCard));
    if (hasUncataloged) {
      setCart((prev) => prev.filter((item) => item.produto.id > 0 && !item.produto.externalCard));
      showToast('Itens externos não catalogados foram removidos do carrinho.');
      return;
    }

    if (!currentUser.email || currentUser.id <= 0 || !getAuthToken()) {
      pendingCheckoutAfterAuthRef.current = true;
      setIsCartOpen(false);
      showToast('Faça login ou crie uma conta para acessar o checkout.');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    setIsCartOpen(false);
    setCurrentTab('checkout');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [cart, currentUser.email, currentUser.id, setCurrentTab, showToast]);

  const createOrder = async (checkoutDetails: CheckoutSubmissionPayload): Promise<Order | null> => {
    if (!currentUser.email || currentUser.id <= 0 || !getAuthToken()) {
      showToast('Faça login para finalizar seu pedido!');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return null;
    }

    if (cart.length === 0) {
      showToast('Seu carrinho está vazio.');
      return null;
    }

    const tipoEntrega = checkoutDetails.tipo_entrega || 'entrega';
    const cepLimpo = (checkoutDetails.cep || '').replace(/\D/g, '');
    const enderecoEntrega = (checkoutDetails.endereco_entrega || '').trim();

    if (tipoEntrega === 'entrega') {
      if (cepLimpo.length !== 8) {
        showToast('Informe um CEP válido com 8 dígitos para entrega.');
        return null;
      }
      if (enderecoEntrega.length < 10) {
        showToast('Informe o endereço completo de entrega antes de finalizar.');
        return null;
      }
    }

    try {
      const currentCatalog = [...productsRef.current];
      const resolvedItems: { produto_id: number; quantidade: number }[] = [];

      for (const item of cart) {
        if (item.produto.id <= 0 || item.produto.externalCard) {
          showToast(`"${item.produto.nome}" é um item externo não catalogado e não pode ser comprado diretamente.`);
          return null;
        }
        const p = currentCatalog.find((prod) => prod.id === item.produto.id && prod.ativo !== false);
        if (!p) {
          showToast(`Produto "${item.produto.nome}" não está mais disponível no catálogo.`);
          return null;
        }
        if (!Number.isFinite(p.preco) || p.preco <= 0) {
          showToast(`Produto "${p.nome}" está com preço indisponível.`);
          return null;
        }
        if (p.estoque < item.quantidade) {
          showToast(`Estoque insuficiente para ${item.produto.nome}`);
          return null;
        }
        resolvedItems.push({
          produto_id: p.id,
          quantidade: item.quantidade,
        });
      }

      const payload = {
        cliente_id: currentUser.id > 0 ? currentUser.id : undefined,
        cliente_nome: currentUser.nome,
        cliente_email: currentUser.email,
        cliente_telefone: checkoutDetails.cliente_telefone || currentUser.telefone || undefined,
        endereco_entrega:
          tipoEntrega === 'retirada' && !enderecoEntrega
            ? 'Retirada na Loja - Av. Paulista, 1800, Conj. 42, Bela Vista - São Paulo/SP'
            : enderecoEntrega,
        tipo_entrega: tipoEntrega,
        cep: tipoEntrega === 'retirada' ? '01310-200' : `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`,
        metodo_pagamento: checkoutDetails.metodo_pagamento,
        status_pagamento: checkoutDetails.status_pagamento,
        parcelas: checkoutDetails.parcelas ?? 1,
        observacoes: checkoutDetails.observacoes?.trim() || undefined,
        itens: resolvedItems,
      };

      const pedidoBackend = await api.criarPedido(payload, currentCatalog);
      setOrders((prev) => [pedidoBackend, ...prev]);

      await Promise.all([refreshProducts(), refreshStockMovements()]);

      clearCart();
      setIsCartOpen(false);
      showToast(`Pedido #${pedidoBackend.numero || pedidoBackend.id_pedido} confirmado!`);
      return pedidoBackend;
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível finalizar o pedido no servidor.');
      return null;
    }
  };

  const updateOrderStatus = async (
    orderId: number,
    status: Order['status'],
    options?: { codigoRastreio?: string; statusPagamento?: string }
  ) => {
    if (!userHasPermission(currentUser, 'pedidos')) {
      showToast('Seu nível de acesso não inclui permissão para atualizar pedidos.');
      return;
    }
    try {
      const atualizado = await api.atualizarStatusPedido(
        orderId,
        status,
        productsRef.current,
        options?.codigoRastreio,
        options?.statusPagamento
      );
      setOrders((prev) => prev.map((o) => (o.id_pedido === orderId ? atualizado : o)));
      if (status === 'Cancelado') {
        await Promise.all([
          refreshProducts(),
          userHasPermission(currentUser, 'estoque') ? refreshStockMovements() : Promise.resolve(),
        ]);
      }
      showToast(`Pedido #${atualizado.numero || orderId} atualizado para ${status}`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao atualizar status do pedido no servidor.');
    }
  };

  const cancelOwnOrder = async (orderId: number): Promise<Order | null> => {
    try {
      const cancelado = await api.cancelarMeuPedido(orderId, productsRef.current);
      setOrders((prev) => prev.map((o) => (o.id_pedido === orderId ? cancelado : o)));
      await Promise.all([refreshProducts(), refreshStockMovements()]);
      showToast(`Pedido #${cancelado.numero || cancelado.id_pedido} cancelado e itens estornados.`);
      return cancelado;
    } catch (err: any) {
      showToast(err?.message || 'Erro ao cancelar o pedido.');
      return null;
    }
  };

  const registerStockEntry = async (
    productId: number,
    quantity: number,
    motivo: string = 'Reposição de Estoque'
  ) => {
    if (!userHasPermission(currentUser, 'estoque')) {
      showToast('Seu nível de acesso não inclui permissão para registrar entradas de estoque.');
      return;
    }
    const prod = productsRef.current.find((p) => p.id === productId);
    try {
      const resp = await api.registrarEntradaEstoque(
        productId,
        quantity,
        motivo,
        currentUser.nome || 'Equipe'
      );
      const nextProducts = productsRef.current.map((p) =>
        p.id === productId
          ? {
              ...p,
              estoque: resp.quantidade ?? p.estoque + quantity,
              estoqueMinimo: resp.estoque_minimo ?? p.estoqueMinimo,
            }
          : p
      );
      syncProductsAndCart(nextProducts);
      await refreshStockMovements();
      showToast(`Entrada de +${quantity} un. registrada para "${prod?.nome || 'Produto'}"!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao registrar entrada de estoque.');
      throw err;
    }
  };

  const registerStockExit = async (
    productId: number,
    quantity: number,
    motivo: string = 'Baixa Operacional'
  ) => {
    if (!userHasPermission(currentUser, 'estoque')) {
      showToast('Seu nível de acesso não inclui permissão para registrar baixas de estoque.');
      return;
    }
    const prod = productsRef.current.find((p) => p.id === productId);
    try {
      const resp = await api.registrarSaidaEstoque(
        productId,
        quantity,
        motivo,
        currentUser.nome || 'Equipe'
      );
      const nextProducts = productsRef.current.map((p) =>
        p.id === productId
          ? {
              ...p,
              estoque: resp.quantidade ?? Math.max(0, p.estoque - quantity),
              estoqueMinimo: resp.estoque_minimo ?? p.estoqueMinimo,
            }
          : p
      );
      syncProductsAndCart(nextProducts);
      await refreshStockMovements();
      showToast(`Saída de -${quantity} un. registrada para "${prod?.nome || 'Produto'}"!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao registrar saída de estoque.');
      throw err;
    }
  };

  const updateProductMinStock = async (productId: number, minStock: number) => {
    if (!userHasPermission(currentUser, 'estoque') && !userHasPermission(currentUser, 'catalogo_api')) {
      showToast('Seu nível de acesso não permite configurar o estoque mínimo.');
      return;
    }
    const prod = productsRef.current.find((p) => p.id === productId);
    try {
      const resp = await api.definirEstoqueMinimo(productId, minStock);
      const nextProducts = productsRef.current.map((p) =>
        p.id === productId
          ? { ...p, estoqueMinimo: resp.estoque_minimo ?? minStock }
          : p
      );
      syncProductsAndCart(nextProducts);
      showToast(`Estoque mínimo de "${prod?.nome || 'Produto'}" definido para ${minStock} un.!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao atualizar estoque mínimo.');
    }
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    if (!userHasPermission(currentUser, 'produtos')) {
      showToast('Seu nível de acesso não inclui permissão para cadastrar produtos!');
      return;
    }
    if (!Number.isFinite(p.preco) || p.preco <= 0) {
      showToast('Informe um preço de venda válido maior que R$ 0,00.');
      return;
    }
    try {
      const criado = await api.cadastrarProduto(p, 'manual');
      syncProductsAndCart([criado, ...productsRef.current.filter((item) => item.id !== criado.id)]);
      await Promise.all([refreshProducts(), refreshStockMovements()]);
      showToast(`Produto "${criado.nome}" cadastrado com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao cadastrar produto no servidor.');
    }
  };

  const importExternalCard = async (
    card: ExternalCard,
    estoque = 5,
    preco?: number
  ): Promise<Product | null> => {
    if (!userHasPermission(currentUser, 'catalogo_api')) {
      showToast('Seu nível de acesso não inclui permissão para importar do catálogo oficial!');
      return null;
    }

    const existing = productsRef.current.find(
      (p) => p.nome.toLowerCase().trim() === card.nome.toLowerCase().trim() && p.jogo === card.jogo
    );
    if (existing) {
      showToast(`"${card.nome}" já está cadastrado no estoque da loja!`);
      return existing;
    }

    const resolvedPrice = preco !== undefined ? preco : card.precoMercadoBrl;
    if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
      showToast('Informe um preço de venda válido maior que R$ 0,00 antes de importar.');
      return null;
    }

    if (!Number.isFinite(estoque) || estoque < 0) {
      showToast('Informe uma quantidade de estoque válida.');
      return null;
    }

    try {
      const mapped = externalCardToProduct(card, Math.floor(estoque));
      const { id: _ignoreId, externalCard: _ignoreExt, ...payload } = mapped;
      payload.preco = resolvedPrice;
      const criado = await api.cadastrarProduto(payload, 'catalogo_api');
      syncProductsAndCart([criado, ...productsRef.current.filter((item) => item.id !== criado.id)]);
      await Promise.all([refreshProducts(), refreshStockMovements()]);
      showToast(`Carta "${criado.nome}" adicionada com sucesso ao estoque!`);
      return criado;
    } catch (err: any) {
      showToast(err?.message || 'Erro ao importar carta para o estoque.');
      return null;
    }
  };

  const updateProductStock = async (productId: number, change: number) => {
    if (!userHasPermission(currentUser, 'estoque')) {
      showToast('Seu nível de acesso não inclui permissão para alterar o estoque!');
      return;
    }

    const prod = productsRef.current.find((p) => p.id === productId);
    if (!prod) return;

    try {
      const atualizado = await api.atualizarEstoque(productId, change, prod.estoque);
      syncProductsAndCart(productsRef.current.map((p) => (p.id === productId ? atualizado : p)));
      await refreshStockMovements();
      showToast('Estoque atualizado!');
    } catch (err: any) {
      showToast(err?.message || 'Falha ao atualizar estoque no servidor.');
    }
  };

  const setProductStockExact = async (productId: number, newStock: number) => {
    if (!userHasPermission(currentUser, 'estoque')) {
      showToast('Seu nível de acesso não inclui permissão para alterar o estoque!');
      return;
    }

    const prod = productsRef.current.find((p) => p.id === productId);
    if (!prod) return;

    const clampedStock = Math.max(0, Math.floor(newStock));

    try {
      const atualizado = await api.definirEstoque(productId, clampedStock);
      syncProductsAndCart(productsRef.current.map((p) => (p.id === productId ? atualizado : p)));
      await refreshStockMovements();
      showToast(`Estoque de "${prod.nome}" atualizado para ${clampedStock} unidades!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao definir estoque no servidor.');
    }
  };

  const editProduct = async (productId: number, updatedFields: Partial<Product>) => {
    const keys = Object.keys(updatedFields);
    const stockOnly = keys.every((k) => k === 'estoque' || k === 'estoqueMinimo');
    if (stockOnly) {
      if (!userHasPermission(currentUser, 'estoque')) {
        showToast('Seu nível de acesso não inclui permissão para alterar o estoque!');
        return;
      }
    } else if (!userHasPermission(currentUser, 'produtos')) {
      showToast('Seu nível de acesso não inclui permissão para editar produtos!');
      return;
    }

    if (
      updatedFields.preco !== undefined &&
      (!Number.isFinite(updatedFields.preco) || updatedFields.preco <= 0)
    ) {
      showToast('Informe um preço válido maior que R$ 0,00.');
      return;
    }

    try {
      const atualizado = await api.atualizarProduto(productId, updatedFields);
      syncProductsAndCart(productsRef.current.map((p) => (p.id === productId ? atualizado : p)));
      await Promise.all([refreshProducts(), refreshStockMovements()]);
      showToast(`Produto "${atualizado.nome}" atualizado com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao atualizar produto no servidor.');
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!userHasPermission(currentUser, 'produtos')) {
      showToast('Seu nível de acesso não inclui permissão para inativar produtos!');
      return;
    }

    const prod = productsRef.current.find((p) => p.id === productId);
    try {
      const inativado = await api.inativarProduto(productId);
      syncProductsAndCart(productsRef.current.map((p) => (p.id === productId ? inativado : p)));
      await Promise.all([refreshProducts(), refreshStockMovements()]);
      showToast(`Produto "${prod?.nome || ''}" inativado com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao inativar produto no servidor.');
    }
  };

  const reactivateProduct = async (productId: number) => {
    if (!userHasPermission(currentUser, 'produtos')) {
      showToast('Seu nível de acesso não inclui permissão para reativar produtos!');
      return;
    }

    const prod = productsRef.current.find((p) => p.id === productId);
    try {
      const reativado = await api.reativarProduto(productId);
      syncProductsAndCart(productsRef.current.map((p) => (p.id === productId ? reativado : p)));
      await Promise.all([refreshProducts(), refreshStockMovements()]);
      showToast(`Produto "${prod?.nome || ''}" reativado com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao reativar produto no servidor.');
    }
  };

  const removeProductPermanently = async (productId: number) => {
    if (currentUser.role !== 'admin') {
      showToast('Apenas administradores podem excluir produtos permanentemente!');
      return;
    }

    const prod = productsRef.current.find((p) => p.id === productId);
    try {
      await api.excluirProduto(productId);
      syncProductsAndCart(productsRef.current.filter((p) => p.id !== productId));
      await Promise.all([refreshProducts(), refreshStockMovements()]);
      showToast(`Produto "${prod?.nome || ''}" excluído permanentemente!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao excluir produto no servidor.');
      throw err;
    }
  };

  const loginUser = async (
    nome: string,
    email: string,
    role: UserRole,
    senha?: string,
    telefone?: string,
    mode?: 'login' | 'register'
  ): Promise<boolean> => {
    const emailLimpo = email.trim().toLowerCase();
    const effectiveMode = mode ?? authModalMode;

    if (!senha) {
      showToast('Informe sua senha para autenticar.');
      return false;
    }

    try {
      if (effectiveMode === 'register') {
        const cadastrado = await api.cadastrarUsuario(
          nome,
          emailLimpo,
          senha,
          role,
          telefone || '',
          undefined,
          true
        );
        const token = cadastrado.token || getAuthToken();
        if (!token) {
          showToast('Erro de autenticação: token de sessão não recebido.');
          return false;
        }
        setAuthToken(token);
        setCurrentUser(cadastrado);
        setIsAuthModalOpen(false);
        showToast(`Cadastro realizado! Bem-vindo, ${cadastrado.nome}!`);
        if (pendingCheckoutAfterAuthRef.current) {
          pendingCheckoutAfterAuthRef.current = false;
          setCurrentTab('checkout');
        } else if (cadastrado.role === 'admin') {
          setCurrentTab('admin');
        } else if (cadastrado.role === 'funcionario') {
          setCurrentTab('staff');
        }
        return true;
      } else {
        const logado = await api.login(emailLimpo, senha);
        const token = logado.token || getAuthToken();
        if (!token) {
          showToast('Erro de autenticação: token de sessão não recebido.');
          return false;
        }
        setAuthToken(token);
        setCurrentUser(logado);
        setIsAuthModalOpen(false);
        showToast(`Bem-vindo de volta, ${logado.nome}!`);
        if (pendingCheckoutAfterAuthRef.current) {
          pendingCheckoutAfterAuthRef.current = false;
          setCurrentTab('checkout');
        } else if (logado.role === 'admin') {
          setCurrentTab('admin');
        } else if (logado.role === 'funcionario') {
          setCurrentTab('staff');
        }
        return true;
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro na autenticação.');
      return false;
    }
  };

  const logoutUser = () => {
    setCurrentUser(GUEST_USER);
    setOrders([]);
    setStockMovements([]);
    localStorage.removeItem('noble_user');
    setAuthToken(null);
    showToast('Sessão encerrada.');
    setCurrentTab('home');
  };

  useEffect(() => {
    if (!isAuthModalOpen && (!currentUser.email || currentUser.id <= 0)) {
      pendingCheckoutAfterAuthRef.current = false;
    }
  }, [isAuthModalOpen, currentUser.email, currentUser.id]);

  // Bloqueia acesso direto a painéis restritos se não estiver autenticado/autorizado
  useEffect(() => {
    if (currentTab === 'dashboard' && (!currentUser.email || currentUser.id === 0)) {
      setCurrentTab('home');
      showToast('Faça login para acessar sua conta!');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
    } else if (currentTab === 'staff') {
      if (!currentUser.email || currentUser.id === 0) {
        setCurrentTab('home');
        showToast('Faça login com uma conta da equipe para acessar a Central Operacional.');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
      } else if (currentUser.role === 'admin') {
        setCurrentTab('admin');
      } else if (currentUser.role !== 'funcionario') {
        setCurrentTab('dashboard');
        showToast('Área exclusiva para colaboradores da loja.');
      }
    } else if (currentTab === 'product-control') {
      if (!currentUser.email || currentUser.id === 0) {
        setCurrentTab('home');
        showToast('Acesso restrito a colaboradores autorizados e administradores!');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
      } else if (!userHasAnyProductControlPermission(currentUser)) {
        setCurrentTab(currentUser.role === 'funcionario' ? 'staff' : 'home');
        showToast('Seu nível de acesso atual não inclui o Controle de Produtos.');
      }
    }
  }, [currentTab, currentUser, setCurrentTab, showToast]);

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        selectedGameFilter,
        setSelectedGameFilter,
        products,
        selectedProductForModal,
        setSelectedProductForModal,
        addProduct,
        importExternalCard,
        updateProductStock,
        setProductStockExact,
        editProduct,
        deleteProduct,
        reactivateProduct,
        removeProductPermanently,
        stockMovements,
        refreshStockMovements,
        registerStockEntry,
        registerStockExit,
        updateProductMinStock,
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        cartItemsCount,
        orders,
        refreshOrders,
        createOrder,
        updateOrderStatus,
        cancelOwnOrder,
        externalRequestProduct,
        setExternalRequestProduct,
        startCheckoutFlow,
        currentUser,
        hasPermission,
        canAccessProductControl,
        refreshCurrentUser,
        updateOwnProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        loginUser,
        logoutUser,
        toastMessage,
        showToast,
        toastConfirm,
        showToastConfirm,
        closeToastConfirm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de um AppProvider');
  return ctx;
};
