import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  CartItem,
  Order,
  UserProfile,
  UserRole,
  GameId,
  ExternalCard,
  StockMovement,
} from '../types';
import { api, externalCardToProduct } from '../services/api';

export type NavigationTab = 'home' | 'products' | 'about' | 'dashboard' | 'admin' | 'product-control';

const GUEST_USER: UserProfile = {
  id: 0,
  nome: '',
  email: '',
  role: 'cliente',
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
  createOrder: () => Promise<Order | null>;
  updateOrderStatus: (orderId: number, status: Order['status']) => Promise<void> | void;

  currentUser: UserProfile;
  switchRole: (role: UserRole) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  loginUser: (nome: string, email: string, role: UserRole, senha?: string, telefone?: string) => Promise<boolean>;
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

  const isProductControlPath = (pathname: string) => {
    const clean = pathname.toLowerCase().replace(/\/+$/, '');
    return clean === '/gestao-produtos' || clean === '/controle-produtos' || clean === '/produtos-admin';
  };

  const getInitialTab = (): NavigationTab => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (isAdminPath(p)) return 'admin';
      if (isProductControlPath(p)) return 'product-control';
    }
    return 'home';
  };

  const [currentTab, setCurrentTabState] = useState<NavigationTab>(getInitialTab);

  const setCurrentTab = (tab: NavigationTab) => {
    setCurrentTabState(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'admin') {
        if (!isAdminPath(window.location.pathname)) {
          window.history.pushState(null, '', '/admin');
        }
      } else if (tab === 'product-control') {
        if (!isProductControlPath(window.location.pathname)) {
          window.history.pushState(null, '', '/gestao-produtos');
        }
      } else {
        if (isAdminPath(window.location.pathname) || isProductControlPath(window.location.pathname)) {
          window.history.pushState(null, '', '/');
        }
      }
    }
  };

  useEffect(() => {
    const handlePop = () => {
      const p = window.location.pathname;
      if (isAdminPath(p)) {
        setCurrentTabState('admin');
      } else if (isProductControlPath(p)) {
        setCurrentTabState('product-control');
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
  const [orders, setOrders] = useState<Order[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('noble_cart');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('noble_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed?.email || !parsed?.id || parsed.id <= 0) {
          localStorage.removeItem('noble_user');
          return GUEST_USER;
        }
        return parsed;
      } catch {
        return GUEST_USER;
      }
    }
    return GUEST_USER;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastConfirm, setToastConfirm] = useState<{
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('noble_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (currentUser.email && currentUser.id > 0) {
      localStorage.setItem('noble_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('noble_user');
    }
  }, [currentUser]);

  // Carregamento inicial exclusivo do backend FastAPI
  useEffect(() => {
    let active = true;

    async function loadFromBackend() {
      let loadedProducts: Product[] = [];
      try {
        const dadosProdutos = await api.obterProdutos(false);
        if (active && Array.isArray(dadosProdutos)) {
          loadedProducts = dadosProdutos;
          setProducts(dadosProdutos);
          setCart((prev) =>
            prev.filter(
              (item) =>
                item.produto.id < 0 ||
                Boolean(item.produto.externalCard) ||
                dadosProdutos.some((dp) => dp.id === item.produto.id && dp.ativo !== false)
            )
          );
        }
      } catch (err: any) {
        console.warn('Não foi possível carregar produtos do backend:', err?.message);
      }

      try {
        const dadosPedidos = await api.obterPedidos(loadedProducts);
        if (active && Array.isArray(dadosPedidos)) {
          setOrders(dadosPedidos);
        }
      } catch (err: any) {
        console.warn('Não foi possível carregar pedidos do backend:', err?.message);
      }

      try {
        const dadosMovimentacoes = await api.obterMovimentacoesEstoque(100);
        if (active && Array.isArray(dadosMovimentacoes)) {
          setStockMovements(dadosMovimentacoes);
        }
      } catch {
        // Ignora silenciosamente na carga inicial
      }
    }

    loadFromBackend();
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const showToastConfirm = (options: {
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setToastConfirm(options);
  };

  const closeToastConfirm = () => {
    setToastConfirm(null);
  };

  const addToCart = (product: Product, quantity = 1) => {
    if (!currentUser.email || currentUser.id <= 0) {
      showToast('Faça login para adicionar produtos ao carrinho!');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    if (product.estoque <= 0) {
      showToast('Produto sem estoque disponível no momento!');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.produto.id === product.id);
      if (existing) {
        const nextQty = existing.quantidade + quantity;
        if (nextQty > product.estoque) {
          showToast(`Quantidade máxima em estoque atingida (${product.estoque})`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.produto.id === product.id
            ? { ...item, quantidade: nextQty, subtotal: nextQty * product.preco }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            produto: product,
            quantidade: quantity,
            subtotal: quantity * product.preco,
          },
        ];
      }
    });

    showToast(`"${product.nome}" adicionado ao carrinho!`);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.produto.id !== productId));
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.produto.id === productId) {
          const clampedQty = Math.min(quantity, item.produto.estoque);
          return {
            ...item,
            quantidade: clampedQty,
            subtotal: clampedQty * item.produto.preco,
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

  const createOrder = async (): Promise<Order | null> => {
    if (!currentUser.email || currentUser.id <= 0) {
      showToast('Faça login para finalizar seu pedido!');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return null;
    }

    if (cart.length === 0) {
      showToast('Seu carrinho está vazio.');
      return null;
    }

    try {
      let currentCatalog = [...products];
      const resolvedItems: { produto_id: number; quantidade: number }[] = [];

      for (const item of cart) {
        // Caso o item venha diretamente de uma API pública de cartas (id < 0),
        // vincula ao produto equivalente no banco ou cadastra automaticamente antes de fechar o pedido
        if (item.produto.id < 0 || item.produto.externalCard) {
          const existingInStore = currentCatalog.find(
            (p) =>
              p.ativo !== false &&
              p.nome.toLowerCase().trim() === item.produto.nome.toLowerCase().trim() &&
              p.jogo === item.produto.jogo
          );

          if (existingInStore) {
            if (existingInStore.estoque < item.quantidade) {
              showToast(`Estoque insuficiente na loja para ${existingInStore.nome}`);
              return null;
            }
            resolvedItems.push({
              produto_id: existingInStore.id,
              quantidade: item.quantidade,
            });
          } else {
            const { id: _ignoreId, externalCard: _ignoreExt, ...prodData } = item.produto;
            const criado = await api.cadastrarProduto({
              ...prodData,
              estoque: Math.max(item.produto.estoque, item.quantidade),
            });
            currentCatalog = [criado, ...currentCatalog];
            resolvedItems.push({
              produto_id: criado.id,
              quantidade: item.quantidade,
            });
          }
        } else {
          const p = currentCatalog.find((prod) => prod.id === item.produto.id && prod.ativo !== false);
          if (!p || p.estoque < item.quantidade) {
            showToast(`Estoque insuficiente para ${item.produto.nome}`);
            return null;
          }
          resolvedItems.push({
            produto_id: p.id,
            quantidade: item.quantidade,
          });
        }
      }

      const payload = {
        cliente_id: currentUser.id > 0 ? currentUser.id : undefined,
        cliente_nome: currentUser.nome,
        cliente_email: currentUser.email,
        itens: resolvedItems,
      };

      const pedidoBackend = await api.criarPedido(payload, currentCatalog);
      setOrders((prev) => [pedidoBackend, ...prev]);

      // Recarrega o estoque real do banco após o pedido
      const produtosAtualizados = await api.obterProdutos(false).catch(() => null);
      if (produtosAtualizados) {
        setProducts(produtosAtualizados);
      } else {
        setProducts(currentCatalog);
      }

      clearCart();
      setIsCartOpen(false);
      showToast(`Pedido #${pedidoBackend.id_pedido} realizado com sucesso!`);
      return pedidoBackend;
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível finalizar o pedido no servidor.');
      return null;
    }
  };

  const updateOrderStatus = async (orderId: number, status: Order['status']) => {
    try {
      const atualizado = await api.atualizarStatusPedido(orderId, status, products);
      setOrders((prev) =>
        prev.map((o) => (o.id_pedido === orderId ? atualizado : o))
      );
      showToast(`Status do pedido #${orderId} atualizado para ${status}`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao atualizar status do pedido no servidor.');
    }
  };


  const refreshStockMovements = async () => {
    try {
      const movs = await api.obterMovimentacoesEstoque(100);
      if (Array.isArray(movs)) {
        setStockMovements(movs);
      }
    } catch {
      // Ignora erro
    }
  };

  const registerStockEntry = async (
    productId: number,
    quantity: number,
    motivo: string = 'Reposição de Estoque'
  ) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem registrar entradas!');
      return;
    }
    const prod = products.find((p) => p.id === productId);
    try {
      const resp = await api.registrarEntradaEstoque(
        productId,
        quantity,
        motivo,
        currentUser.nome || 'Administrador'
      );
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                estoque: resp.quantidade ?? p.estoque + quantity,
                estoqueMinimo: resp.estoque_minimo ?? p.estoqueMinimo,
              }
            : p
        )
      );
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
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem registrar saídas!');
      return;
    }
    const prod = products.find((p) => p.id === productId);
    try {
      const resp = await api.registrarSaidaEstoque(
        productId,
        quantity,
        motivo,
        currentUser.nome || 'Administrador'
      );
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                estoque: resp.quantidade ?? Math.max(0, p.estoque - quantity),
                estoqueMinimo: resp.estoque_minimo ?? p.estoqueMinimo,
              }
            : p
        )
      );
      await refreshStockMovements();
      showToast(`Saída de -${quantity} un. registrada para "${prod?.nome || 'Produto'}"!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao registrar saída de estoque.');
      throw err;
    }
  };

  const updateProductMinStock = async (productId: number, minStock: number) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem configurar o estoque mínimo!');
      return;
    }
    const prod = products.find((p) => p.id === productId);
    try {
      const resp = await api.definirEstoqueMinimo(productId, minStock);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, estoqueMinimo: resp.estoque_minimo ?? minStock }
            : p
        )
      );
      showToast(`Estoque mínimo de "${prod?.nome || 'Produto'}" definido para ${minStock} un.!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao atualizar estoque mínimo.');
    }
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    try {
      const criado = await api.cadastrarProduto(p);
      setProducts((prev) => [criado, ...prev]);
      await refreshStockMovements();
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
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem importar cartas para o estoque!');
      return null;
    }

    const existing = products.find(
      (p) => p.nome.toLowerCase().trim() === card.nome.toLowerCase().trim() && p.jogo === card.jogo
    );
    if (existing) {
      showToast(`"${card.nome}" já está cadastrado no estoque da loja!`);
      return existing;
    }

    try {
      const mapped = externalCardToProduct(card, estoque);
      const { id: _ignoreId, externalCard: _ignoreExt, ...payload } = mapped;
      if (preco !== undefined && preco > 0) {
        payload.preco = preco;
      }
      const criado = await api.cadastrarProduto(payload);
      setProducts((prev) => [criado, ...prev]);
      showToast(`Carta "${criado.nome}" adicionada com sucesso ao estoque!`);
      return criado;
    } catch (err: any) {
      showToast(err?.message || 'Erro ao importar carta para o estoque.');
      return null;
    }
  };

  const updateProductStock = async (productId: number, change: number) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem alterar o estoque!');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    try {
      const atualizado = await api.atualizarEstoque(productId, change, prod.estoque);
      setProducts((prev) => prev.map((p) => (p.id === productId ? atualizado : p)));
      showToast('Estoque atualizado!');
    } catch (err: any) {
      showToast(err?.message || 'Falha ao atualizar estoque no servidor.');
    }
  };

  const setProductStockExact = async (productId: number, newStock: number) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem alterar o estoque!');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const clampedStock = Math.max(0, Math.floor(newStock));

    try {
      const atualizado = await api.definirEstoque(productId, clampedStock);
      setProducts((prev) => prev.map((p) => (p.id === productId ? atualizado : p)));
      showToast(`Estoque de "${prod.nome}" atualizado para ${clampedStock} unidades!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao definir estoque no servidor.');
    }
  };

  const editProduct = async (productId: number, updatedFields: Partial<Product>) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem editar produtos!');
      return;
    }

    try {
      const atualizado = await api.atualizarProduto(productId, updatedFields);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? atualizado : p))
      );
      showToast(`Produto "${atualizado.nome}" atualizado com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao atualizar produto no servidor.');
    }
  };

  const deleteProduct = async (productId: number) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem inativar produtos!');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    try {
      const inativado = await api.inativarProduto(productId);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? inativado : p))
      );
      showToast(`Produto "${prod?.nome || ''}" inativado com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao inativar produto no servidor.');
    }
  };

  const reactivateProduct = async (productId: number) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem reativar produtos!');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    try {
      const reativado = await api.reativarProduto(productId);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? reativado : p))
      );
      showToast(`Produto "${prod?.nome || ''}" reativado com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao reativar produto no servidor.');
    }
  };

  const removeProductPermanently = async (productId: number) => {
    const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
    if (!isStaffOrAdmin) {
      showToast('Apenas funcionários ou administradores podem excluir produtos permanentemente!');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    try {
      await api.excluirProduto(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast(`Produto "${prod?.nome || ''}" excluído permanentemente!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao excluir produto no servidor.');
      throw err;
    }
  };

  const switchRole = (role: UserRole) => {
    setCurrentUser((prev) => ({
      ...prev,
      role,
      cargo:
        role === 'admin'
          ? 'Administrador Geral'
          : role === 'funcionario'
          ? 'Especialista em TCG'
          : undefined,
    }));
    if (role === 'admin') {
      setCurrentTab('admin');
    }
    showToast(`Perfil alternado para: ${role.toUpperCase()}`);
  };

  const loginUser = async (
    nome: string,
    email: string,
    role: UserRole,
    senha?: string,
    telefone?: string
  ): Promise<boolean> => {
    const emailLimpo = email.trim().toLowerCase();

    if (!senha) {
      showToast('Informe sua senha para autenticar.');
      return false;
    }

    try {
      if (authModalMode === 'register') {
        const cadastrado = await api.cadastrarUsuario(nome, emailLimpo, senha, role, telefone || '');
        setCurrentUser(cadastrado);
        setIsAuthModalOpen(false);
        showToast(`Cadastro realizado! Bem-vindo, ${cadastrado.nome}!`);
        if (cadastrado.role === 'admin') {
          setCurrentTab('admin');
        }
        return true;
      } else {
        const logado = await api.login(emailLimpo, senha);
        setCurrentUser(logado);
        setIsAuthModalOpen(false);
        showToast(`Bem-vindo de volta, ${logado.nome}!`);
        if (logado.role === 'admin') {
          setCurrentTab('admin');
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
    localStorage.removeItem('noble_user');
    showToast('Sessão encerrada.');
    setCurrentTab('home');
  };

  // Bloqueia acesso direto a painéis restritos se não estiver autenticado/autorizado
  useEffect(() => {
    if (currentTab === 'dashboard' && (!currentUser.email || currentUser.id === 0)) {
      setCurrentTab('home');
      showToast('Faça login para acessar o painel!');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
    } else if (currentTab === 'product-control') {
      const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';
      if (!isStaffOrAdmin) {
        setCurrentTab('home');
        showToast('Acesso restrito a Administradores e Funcionários!');
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
      }
    }
  }, [currentTab, currentUser.email, currentUser.id, currentUser.role]);

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
        createOrder,
        updateOrderStatus,
        currentUser,
        switchRole,
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
