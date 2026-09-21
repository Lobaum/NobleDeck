import type {
  Product,
  Tournament,
  Order,
  CartItem,
  UserProfile,
  UserRole,
} from '../types';

import { INITIAL_PRODUCTS } from '../data/mockData';

const API_BASE = '/api';

// Conversores de formato Backend (snake_case) <-> Frontend (camelCase)
export function adaptarProdutoDoBackend(p: any): Product {
  const init = INITIAL_PRODUCTS.find((ip) => ip.id === p.id_produto);
  return {
    id: p.id_produto,
    nome: p.nome,
    preco: p.preco,
    estoque: p.quantidade,
    jogo: p.jogo,
    jogoNome: p.jogo_nome || p.jogo,
    categoria: p.categoria,
    subtitulo: p.subtitulo || `${p.categoria} • ${p.jogo_nome || p.jogo}`,
    descricao: p.descricao || '',
    imagemUrl: init?.imagemUrl || p.imagem_url || '',
    raridade: p.raridade || 'Comum',
    isNovo: p.is_novo ?? true,
    isDestaque: p.is_destaque ?? false,
    idioma: p.idioma || 'Português',
    ano: p.ano || 2024,
  };
}

export function adaptarProdutoParaBackend(p: Omit<Product, 'id'>) {
  return {
    nome: p.nome,
    preco: p.preco,
    quantidade: p.estoque,
    descricao: p.descricao,
    categoria: p.categoria,
    jogo: p.jogo,
    jogo_nome: p.jogoNome,
    subtitulo: p.subtitulo,
    imagem_url: p.imagemUrl,
    raridade: p.raridade,
    is_novo: p.isNovo,
    is_destaque: p.isDestaque,
    idioma: p.idioma,
    ano: p.ano,
  };
}

export function adaptarTorneioDoBackend(t: any): Tournament {
  return {
    id: t.id_torneio,
    titulo: t.nome,
    jogo: t.jogo,
    jogoNome: t.jogo_nome || t.jogo,
    formato: t.formato || 'Suíço',
    data: t.data,
    horario: t.horario,
    local: t.local || 'Noble Deck Arena',
    vagasTotais: t.limite_participantes,
    vagasOcupadas: t.vagas_ocupadas ?? (t.inscritos ? t.inscritos.length : 0),
    taxaInscricao: t.taxa_inscricao || 0,
    premiacao: t.premiacao || '',
    isPremium: t.is_premium ?? false,
    status: t.status || 'aberto',
    inscritos: t.inscritos || [],
  };
}

export function adaptarPedidoDoBackend(p: any, produtosCatalogo: Product[] = []): Order {
  const itens: CartItem[] = (p.itens || []).map((item: any) => {
    const prodRef = produtosCatalogo.find((prod) => prod.id === item.produto_id) || {
      id: item.produto_id,
      nome: item.produto_nome || `Produto #${item.produto_id}`,
      preco: item.preco_unitario,
      estoque: 10,
      jogo: 'outros',
      jogoNome: 'Geral',
      categoria: 'Geral',
      subtitulo: '',
      descricao: '',
      imagemUrl: '',
    };
    return {
      produto: prodRef as Product,
      quantidade: item.quantidade,
      subtotal: item.subtotal,
    };
  });

  return {
    id_pedido: p.id_pedido,
    cliente_nome: p.cliente_nome,
    cliente_email: p.cliente_email,
    itens,
    valor_total: p.valor_total,
    data: p.data,
    status: p.status as Order['status'],
  };
}

export const api = {
  // PRODUTOS
  async obterProdutos(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/produtos`);
    if (!res.ok) throw new Error('Falha ao carregar produtos da API');
    const dados = await res.json();
    return dados.map(adaptarProdutoDoBackend);
  },

  async cadastrarProduto(produto: Omit<Product, 'id'>): Promise<Product> {
    const payload = adaptarProdutoParaBackend(produto);
    const res = await fetch(`${API_BASE}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao cadastrar produto' }));
      throw new Error(err.detail || 'Erro ao cadastrar produto');
    }
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async atualizarEstoque(produtoId: number, variacao: number, quantidadeAtual: number): Promise<Product> {
    const novaQtd = Math.max(0, quantidadeAtual + variacao);
    return this.definirEstoque(produtoId, novaQtd);
  },

  async definirEstoque(produtoId: number, novaQuantidade: number): Promise<Product> {
    const res = await fetch(`${API_BASE}/produtos/${produtoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantidade: Math.max(0, novaQuantidade) }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar estoque no backend');
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async atualizarProduto(produtoId: number, dadosAtualizados: Partial<Product>): Promise<Product> {
    const payload: Record<string, any> = {};
    if (dadosAtualizados.nome !== undefined) payload.nome = dadosAtualizados.nome;
    if (dadosAtualizados.preco !== undefined) payload.preco = dadosAtualizados.preco;
    if (dadosAtualizados.estoque !== undefined) payload.quantidade = dadosAtualizados.estoque;
    if (dadosAtualizados.descricao !== undefined) payload.descricao = dadosAtualizados.descricao;
    if (dadosAtualizados.categoria !== undefined) payload.categoria = dadosAtualizados.categoria;
    if (dadosAtualizados.jogo !== undefined) payload.jogo = dadosAtualizados.jogo;
    if (dadosAtualizados.jogoNome !== undefined) payload.jogo_nome = dadosAtualizados.jogoNome;
    if (dadosAtualizados.imagemUrl !== undefined) payload.imagem_url = dadosAtualizados.imagemUrl;
    if (dadosAtualizados.subtitulo !== undefined) payload.subtitulo = dadosAtualizados.subtitulo;
    if (dadosAtualizados.raridade !== undefined) payload.raridade = dadosAtualizados.raridade;
    if (dadosAtualizados.isNovo !== undefined) payload.is_novo = dadosAtualizados.isNovo;
    if (dadosAtualizados.isDestaque !== undefined) payload.is_destaque = dadosAtualizados.isDestaque;
    if (dadosAtualizados.idioma !== undefined) payload.idioma = dadosAtualizados.idioma;
    if (dadosAtualizados.ano !== undefined) payload.ano = dadosAtualizados.ano;

    const res = await fetch(`${API_BASE}/produtos/${produtoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao atualizar produto' }));
      throw new Error(err.detail || 'Erro ao atualizar produto');
    }
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async inativarProduto(produtoId: number): Promise<Product> {
    const res = await fetch(`${API_BASE}/produtos/${produtoId}/inativar`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Falha ao inativar produto no backend');
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  // ESTOQUE
  async registrarEntradaEstoque(produtoId: number, quantidade: number) {
    const res = await fetch(`${API_BASE}/estoque/entrada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: produtoId, quantidade }),
    });
    return res.json();
  },

  async registrarSaidaEstoque(produtoId: number, quantidade: number) {
    const res = await fetch(`${API_BASE}/estoque/saida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: produtoId, quantidade }),
    });
    return res.json();
  },

  async obterEstoqueEmFalta() {
    const res = await fetch(`${API_BASE}/estoque/falta`);
    if (!res.ok) throw new Error('Falha ao consultar estoque em falta');
    return res.json();
  },

  // TORNEIOS
  async obterTorneios(): Promise<Tournament[]> {
    const res = await fetch(`${API_BASE}/torneios`);
    if (!res.ok) throw new Error('Falha ao carregar torneios da API');
    const dados = await res.json();
    return dados.map(adaptarTorneioDoBackend);
  },

  async cadastrarTorneio(t: Omit<Tournament, 'id' | 'vagasOcupadas' | 'inscritos' | 'status'>): Promise<Tournament> {
    const payload = {
      nome: t.titulo,
      jogo: t.jogo,
      jogo_nome: t.jogoNome,
      data: t.data,
      horario: t.horario,
      limite_participantes: t.vagasTotais,
      formato: t.formato,
      local: t.local,
      taxa_inscricao: t.taxaInscricao,
      premiacao: t.premiacao,
      is_premium: t.isPremium,
    };
    const res = await fetch(`${API_BASE}/torneios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao cadastrar torneio' }));
      throw new Error(err.detail || 'Erro ao cadastrar torneio');
    }
    const dados = await res.json();
    return adaptarTorneioDoBackend(dados);
  },

  async inscreverTorneio(torneioId: number, clienteId: number, clienteNome: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/torneios/${torneioId}/inscricao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteId, cliente_nome: clienteNome }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao realizar inscrição' }));
      throw new Error(err.detail || 'Erro ao realizar inscrição');
    }
    const dados = await res.json();
    return adaptarTorneioDoBackend(dados);
  },

  // PEDIDOS
  async obterPedidos(produtosCatalogo: Product[] = []): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/pedidos`);
    if (!res.ok) throw new Error('Falha ao carregar pedidos da API');
    const dados = await res.json();
    return dados.map((p: any) => adaptarPedidoDoBackend(p, produtosCatalogo));
  },

  async criarPedido(dados: {
    cliente_id?: number;
    cliente_nome: string;
    cliente_email: string;
    itens: { produto_id: number; quantidade: number }[];
  }, produtosCatalogo: Product[] = []): Promise<Order> {
    const res = await fetch(`${API_BASE}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao criar pedido' }));
      throw new Error(err.detail || 'Erro ao criar pedido');
    }
    const pedidoCriado = await res.json();
    return adaptarPedidoDoBackend(pedidoCriado, produtosCatalogo);
  },

  async atualizarStatusPedido(pedidoId: number, status: Order['status'], produtosCatalogo: Product[] = []): Promise<Order> {
    const res = await fetch(`${API_BASE}/pedidos/${pedidoId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Erro ao atualizar status do pedido');
    const dados = await res.json();
    return adaptarPedidoDoBackend(dados, produtosCatalogo);
  },

  // AUTENTICAÇÃO
  async login(email: string, senha: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Credenciais inválidas' }));
      throw new Error(err.detail || 'Credenciais inválidas');
    }
    const dados = await res.json();
    const role: UserRole =
      dados.tipo_usuario === 'administrador'
        ? 'admin'
        : dados.tipo_usuario === 'funcionario'
        ? 'funcionario'
        : 'cliente';

    return {
      id: dados.id_usuario,
      nome: dados.nome,
      email: dados.email,
      role,
      cargo: dados.cargo,
      torneiosInscritos: [],
    };
  },

  async cadastrarUsuario(
    nome: string,
    email: string,
    senha: string,
    tipoUsuario: UserRole = 'cliente',
    telefone: string = ''
  ): Promise<UserProfile> {
    const backendTipo =
      tipoUsuario === 'admin'
        ? 'administrador'
        : tipoUsuario === 'funcionario'
        ? 'funcionario'
        : 'cliente';

    const res = await fetch(`${API_BASE}/auth/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        email,
        senha,
        tipo_usuario: backendTipo,
        telefone,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro no cadastro' }));
      throw new Error(err.detail || 'Erro no cadastro');
    }
    const dados = await res.json();
    return {
      id: dados.id_usuario,
      nome: dados.nome,
      email: dados.email,
      role: tipoUsuario,
      cargo: dados.cargo,
      torneiosInscritos: [],
    };
  },
};
