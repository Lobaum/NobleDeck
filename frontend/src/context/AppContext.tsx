import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  Tournament,
  CartItem,
  Order,
  UserProfile,
  UserRole,
  GameId,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_TOURNAMENTS,
  INITIAL_USER,
} from '../data/mockData';
import { api } from '../services/api';

export type NavigationTab = 'home' | 'products' | 'tournaments' | 'about' | 'dashboard';

interface AppContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  selectedGameFilter: GameId | 'all';
  setSelectedGameFilter: (game: GameId | 'all') => void;
  
  products: Product[];
  selectedProductForModal: Product | null;
  setSelectedProductForModal: (product: Product | null) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void> | void;
  updateProductStock: (productId: number, change: number) => Promise<void> | void;
  setProductStockExact: (productId: number, newStock: number) => Promise<void> | void;
  editProduct: (productId: number, updatedFields: Partial<Product>) => Promise<void> | void;
  deleteProduct: (productId: number) => Promise<void> | void;
  
  tournaments: Tournament[];
  selectedTournamentForModal: Tournament | null;
  setSelectedTournamentForModal: (tournament: Tournament | null) => void;
  registerInTournament: (tournamentId: number) => Promise<boolean> | boolean;
  createTournament: (tournament: Omit<Tournament, 'id' | 'vagasOcupadas' | 'inscritos' | 'status'>) => Promise<void> | void;
  
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [selectedGameFilter, setSelectedGameFilter] = useState<GameId | 'all'>('all');
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('noble_products');
    if (!saved) return INITIAL_PRODUCTS;
    try {
      const parsed: Product[] = JSON.parse(saved);
      const updated = parsed.map((p) => {
        const init = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
        if (init && (p.imagemUrl !== init.imagemUrl || p.imagemUrl?.includes('lh3.googleusercontent.com') || p.id <= 7 || !p.imagemUrl)) {
          return {
            ...p,
            imagemUrl: init.imagemUrl,
            nome: init.nome,
            subtitulo: init.subtitulo,
            descricao: init.descricao,
            raridade: init.raridade,
            jogo: init.jogo,
            jogoNome: init.jogoNome,
            categoria: init.categoria,
          };
        }
        return p;
      });
      const existingIds = new Set(updated.map((p) => p.id));
      const missingInitial = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id));
      return [...updated, ...missingInitial];
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('noble_tournaments');
    return saved ? JSON.parse(saved) : INITIAL_TOURNAMENTS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('noble_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('noble_orders');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id_pedido: 101,
            cliente_nome: 'Pedro Henrique',
            cliente_email: 'pedro@nobledeck.com',
            itens: [
              {
                produto: INITIAL_PRODUCTS[1],
                quantidade: 1,
                subtotal: 349.9,
              },
            ],
            valor_total: 349.9,
            data: '10/11/2026',
            status: 'Finalizado',
          },
        ];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('noble_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.email === 'pedro@nobledeck.com' && parsed?.id === 1) {
          localStorage.removeItem('noble_user');
          return INITIAL_USER;
        }
        return parsed;
      } catch {
        return INITIAL_USER;
      }
    }
    return INITIAL_USER;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [selectedTournamentForModal, setSelectedTournamentForModal] = useState<Tournament | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persistência
  useEffect(() => {
    localStorage.setItem('noble_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('noble_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem('noble_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('noble_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('noble_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Carregamento inicial da API FastAPI com suporte a banco vazio
  useEffect(() => {
    api
      .obterProdutos()
      .then((dados) => {
        if (Array.isArray(dados)) {
          setProducts(dados);
        }
      })
      .catch((err) => console.log('FastAPI offline ou carregando, mantendo dados locais de produtos:', err.message));

    api
      .obterTorneios()
      .then((dados) => {
        if (Array.isArray(dados)) {
          setTournaments(dados);
        }
      })
      .catch((err) => console.log('FastAPI offline ou carregando, mantendo dados locais de torneios:', err.message));

    api
      .obterPedidos()
      .then((dados) => {
        if (Array.isArray(dados)) {
          setOrders(dados);
        }
      })
      .catch((err) => console.log('FastAPI offline ou carregando, mantendo dados locais de pedidos:', err.message));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const addToCart = (product: Product, quantity = 1) => {
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
    if (cart.length === 0) {
      showToast('Seu carrinho está vazio.');
      return null;
    }

    for (const item of cart) {
      const p = products.find((prod) => prod.id === item.produto.id);
      if (!p || p.estoque < item.quantidade) {
        showToast(`Estoque insuficiente para ${item.produto.nome}`);
        return null;
      }
    }

    try {
      const payload = {
        cliente_id: currentUser.id > 0 ? currentUser.id : undefined,
        cliente_nome: currentUser.nome || 'Visitante',
        cliente_email: currentUser.email || 'cliente@nobledeck.com',
        itens: cart.map((it) => ({
          produto_id: it.produto.id,
          quantidade: it.quantidade,
        })),
      };

      const pedidoBackend = await api.criarPedido(payload, products);
      setOrders((prev) => [pedidoBackend, ...prev]);

      setProducts((prev) =>
        prev.map((p) => {
          const inCart = cart.find((item) => item.produto.id === p.id);
          if (inCart) {
            return { ...p, estoque: p.estoque - inCart.quantidade };
          }
          return p;
        })
      );

      clearCart();
      setIsCartOpen(false);
      showToast(`Pedido #${pedidoBackend.id_pedido} realizado com sucesso!`);
      return pedidoBackend;
    } catch (err) {
      console.warn('Fallback para finalização local do pedido:', err);
      setProducts((prev) =>
        prev.map((p) => {
          const inCart = cart.find((item) => item.produto.id === p.id);
          if (inCart) {
            return { ...p, estoque: p.estoque - inCart.quantidade };
          }
          return p;
        })
      );

      const newOrder: Order = {
        id_pedido: Math.floor(1000 + Math.random() * 9000),
        cliente_nome: currentUser.nome,
        cliente_email: currentUser.email,
        itens: [...cart],
        valor_total: cartTotal,
        data: new Date().toLocaleDateString('pt-BR'),
        status: 'Finalizado',
      };

      setOrders((prev) => [newOrder, ...prev]);
      clearCart();
      setIsCartOpen(false);
      showToast(`Pedido #${newOrder.id_pedido} realizado com sucesso!`);
      return newOrder;
    }
  };

  const updateOrderStatus = async (orderId: number, status: Order['status']) => {
    try {
      await api.atualizarStatusPedido(orderId, status, products);
    } catch (err) {
      console.warn('Falha na API ao atualizar status, aplicando localmente:', err);
    }

    setOrders((prev) =>
      prev.map((o) => (o.id_pedido === orderId ? { ...o, status } : o))
    );
    showToast(`Status do pedido #${orderId} atualizado para ${status}`);
  };

  const registerInTournament = async (tournamentId: number): Promise<boolean> => {
    const t = tournaments.find((item) => item.id === tournamentId);
    if (!t) return false;

    if (t.vagasOcupadas >= t.vagasTotais) {
      showToast('Este torneio já atingiu a lotação máxima!');
      return false;
    }

    if (currentUser.torneiosInscritos.includes(tournamentId)) {
      showToast('Você já está inscrito neste torneio.');
      return false;
    }

    try {
      const atualizado = await api.inscreverTorneio(
        tournamentId,
        currentUser.id,
        currentUser.nome
      );
      setTournaments((prev) =>
        prev.map((item) => (item.id === tournamentId ? atualizado : item))
      );
    } catch (err) {
      console.warn('Fallback para inscrição local no torneio:', err);
      setTournaments((prev) =>
        prev.map((item) => {
          if (item.id === tournamentId) {
            const nextVagas = item.vagasOcupadas + 1;
            return {
              ...item,
              vagasOcupadas: nextVagas,
              status: nextVagas >= item.vagasTotais ? 'lotado' : 'aberto',
              inscritos: [...item.inscritos, currentUser.nome],
            };
          }
          return item;
        })
      );
    }

    setCurrentUser((prev) => ({
      ...prev,
      torneiosInscritos: [...prev.torneiosInscritos, tournamentId],
    }));

    showToast(`Inscrição confirmada no torneio: ${t.titulo}!`);
    return true;
  };

  const createTournament = async (
    data: Omit<Tournament, 'id' | 'vagasOcupadas' | 'inscritos' | 'status'>
  ) => {
    try {
      const criado = await api.cadastrarTorneio(data);
      setTournaments((prev) => [criado, ...prev]);
      showToast(`Torneio "${criado.titulo}" cadastrado com sucesso!`);
    } catch (err) {
      console.warn('Fallback para cadastro local de torneio:', err);
      const newT: Tournament = {
        ...data,
        id: Math.floor(100 + Math.random() * 900),
        vagasOcupadas: 0,
        inscritos: [],
        status: 'aberto',
      };
      setTournaments((prev) => [newT, ...prev]);
      showToast(`Torneio "${newT.titulo}" cadastrado com sucesso!`);
    }
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    try {
      const criado = await api.cadastrarProduto(p);
      setProducts((prev) => [criado, ...prev]);
      showToast(`Produto "${criado.nome}" cadastrado com sucesso!`);
    } catch (err) {
      console.warn('Fallback para cadastro local de produto:', err);
      const newProduct: Product = {
        ...p,
        id: Math.floor(100 + Math.random() * 900),
      };
      setProducts((prev) => [newProduct, ...prev]);
      showToast(`Produto "${newProduct.nome}" cadastrado com sucesso!`);
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
      await api.atualizarEstoque(productId, change, prod.estoque);
    } catch (err) {
      console.warn('Falha na API ao atualizar estoque:', err);
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const nextEstoque = Math.max(0, p.estoque + change);
          return { ...p, estoque: nextEstoque };
        }
        return p;
      })
    );
    showToast('Estoque atualizado!');
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
      await api.definirEstoque(productId, clampedStock);
    } catch (err) {
      console.warn('Falha na API ao definir estoque exato:', err);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, estoque: clampedStock } : p))
    );
    showToast(`Estoque de "${prod.nome}" atualizado para ${clampedStock} unidades!`);
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
        prev.map((p) => (p.id === productId ? { ...p, ...atualizado, ...updatedFields } : p))
      );
      showToast(`Produto "${updatedFields.nome || atualizado.nome}" atualizado com sucesso!`);
    } catch (err) {
      console.warn('Falha na API ao atualizar produto, aplicando localmente:', err);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...updatedFields } : p))
      );
      showToast('Produto atualizado localmente!');
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
      await api.inativarProduto(productId);
    } catch (err) {
      console.warn('Falha na API ao inativar produto:', err);
    }

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast(`Produto "${prod?.nome || ''}" inativado com sucesso!`);
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
    showToast(`Perfil alternado para: ${role.toUpperCase()}`);
  };

  const loginUser = async (nome: string, email: string, role: UserRole, senha?: string, telefone?: string): Promise<boolean> => {
    const emailLimpo = email.trim().toLowerCase();

    if (authModalMode === 'register') {
      const savedEmails: string[] = (() => {
        try {
          const raw = localStorage.getItem('noble_registered_emails');
          return raw ? JSON.parse(raw) : ['admin@nobledeck.com', 'funcionario@nobledeck.com', 'pedro@nobledeck.com'];
        } catch {
          return ['admin@nobledeck.com', 'funcionario@nobledeck.com', 'pedro@nobledeck.com'];
        }
      })();

      if (savedEmails.some((e) => e.toLowerCase() === emailLimpo)) {
        showToast('Este e-mail já está cadastrado no sistema!');
        return false;
      }
    }

    if (senha) {
      try {
        if (authModalMode === 'register') {
          const cadastrado = await api.cadastrarUsuario(nome, emailLimpo, senha, role, telefone || '');
          setCurrentUser(cadastrado);
          setIsAuthModalOpen(false);
          showToast(`Cadastro realizado! Bem-vindo, ${cadastrado.nome}!`);

          try {
            const raw = localStorage.getItem('noble_registered_emails');
            const list: string[] = raw ? JSON.parse(raw) : ['admin@nobledeck.com', 'funcionario@nobledeck.com', 'pedro@nobledeck.com'];
            if (!list.includes(emailLimpo)) {
              list.push(emailLimpo);
              localStorage.setItem('noble_registered_emails', JSON.stringify(list));
            }
          } catch {}

          return true;
        } else {
          const logado = await api.login(emailLimpo, senha);
          setCurrentUser(logado);
          setIsAuthModalOpen(false);
          showToast(`Bem-vindo de volta, ${logado.nome}!`);
          return true;
        }
      } catch (err: any) {
        console.warn('Erro na autenticação com a API:', err);
        showToast(err.message || 'Erro na autenticação.');
        return false;
      }
    }

    // Caso não tenha senha informada (ex: troca de perfil no topo)
    setCurrentUser({
      id: Math.floor(1 + Math.random() * 999),
      nome,
      email: emailLimpo,
      role,
      cargo: role === 'funcionario' ? 'Atendente de Loja' : role === 'admin' ? 'Administrador' : undefined,
      torneiosInscritos: [1],
    });
    setIsAuthModalOpen(false);
    showToast(`Bem-vindo, ${nome}!`);
    return true;
  };

  const logoutUser = () => {
    setCurrentUser({
      id: 0,
      nome: 'Visitante',
      email: '',
      role: 'cliente',
      torneiosInscritos: [],
    });
    showToast('Sessão encerrada.');
  };

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
        updateProductStock,
        setProductStockExact,
        editProduct,
        deleteProduct,
        tournaments,
        selectedTournamentForModal,
        setSelectedTournamentForModal,
        registerInTournament,
        createTournament,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
