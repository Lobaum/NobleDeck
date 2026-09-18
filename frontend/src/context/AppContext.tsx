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

export type NavigationTab = 'home' | 'products' | 'tournaments' | 'about' | 'dashboard';

interface AppContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  selectedGameFilter: GameId | 'all';
  setSelectedGameFilter: (game: GameId | 'all') => void;
  
  products: Product[];
  selectedProductForModal: Product | null;
  setSelectedProductForModal: (product: Product | null) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProductStock: (productId: number, change: number) => void;
  
  tournaments: Tournament[];
  selectedTournamentForModal: Tournament | null;
  setSelectedTournamentForModal: (tournament: Tournament | null) => void;
  registerInTournament: (tournamentId: number) => boolean;
  createTournament: (tournament: Omit<Tournament, 'id' | 'vagasOcupadas' | 'inscritos' | 'status'>) => void;
  
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
  createOrder: () => Order | null;
  updateOrderStatus: (orderId: number, status: Order['status']) => void;
  
  currentUser: UserProfile;
  switchRole: (role: UserRole) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  loginUser: (nome: string, email: string, role: UserRole) => void;
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

  const createOrder = (): Order | null => {
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
  };

  const updateOrderStatus = (orderId: number, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id_pedido === orderId ? { ...o, status } : o))
    );
    showToast(`Status do pedido #${orderId} atualizado para ${status}`);
  };

  const registerInTournament = (tournamentId: number): boolean => {
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

    setCurrentUser((prev) => ({
      ...prev,
      torneiosInscritos: [...prev.torneiosInscritos, tournamentId],
    }));

    showToast(`Inscrição confirmada no torneio: ${t.titulo}!`);
    return true;
  };

  const createTournament = (
    data: Omit<Tournament, 'id' | 'vagasOcupadas' | 'inscritos' | 'status'>
  ) => {
    const newT: Tournament = {
      ...data,
      id: Math.floor(100 + Math.random() * 900),
      vagasOcupadas: 0,
      inscritos: [],
      status: 'aberto',
    };
    setTournaments((prev) => [newT, ...prev]);
    showToast(`Torneio "${newT.titulo}" cadastrado com sucesso!`);
  };

  const addProduct = (p: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...p,
      id: Math.floor(100 + Math.random() * 900),
    };
    setProducts((prev) => [newProduct, ...prev]);
    showToast(`Produto "${newProduct.nome}" cadastrado com sucesso!`);
  };

  const updateProductStock = (productId: number, change: number) => {
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

  const loginUser = (nome: string, email: string, role: UserRole) => {
    setCurrentUser({
      id: Math.floor(1 + Math.random() * 999),
      nome,
      email,
      role,
      cargo: role === 'funcionario' ? 'Atendente de Loja' : role === 'admin' ? 'Administrador' : undefined,
      torneiosInscritos: [1],
    });
    setIsAuthModalOpen(false);
    showToast(`Bem-vindo, ${nome}!`);
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
