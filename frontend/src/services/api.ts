import type {
  Product,
  Order,
  CartItem,
  UserProfile,
  UserRole,
  ExternalCard,
  StockMovement,
} from '../types';

const API_BASE = '/api';
const TOKEN_STORAGE_KEY = 'noble_token';

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function handleUnauthorizedResponse(): void {
  const hadToken = Boolean(getAuthToken());
  setAuthToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('noble_user');
  }
  if (hadToken) {
    unauthorizedHandler?.();
  }
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      const messages = data.detail
        .map((item: any) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join(' • ');
      }
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
  } catch {
    // Resposta sem JSON válido
  }
  return fallback;
}

async function fetchWithAuth(
  input: string,
  init: RequestInit = {},
  options: { handle401?: boolean } = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && options.handle401 !== false) {
    handleUnauthorizedResponse();
  }
  return res;
}

export function formatBRL(value: number | null | undefined): string {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function mapBackendRole(tipoUsuario: unknown): UserRole {
  if (tipoUsuario === 'administrador' || tipoUsuario === 'admin') return 'admin';
  if (tipoUsuario === 'funcionario') return 'funcionario';
  return 'cliente';
}

function adaptarUsuarioDoBackend(u: any): UserProfile {
  const role = mapBackendRole(u?.tipo_usuario);
  return {
    id: u.id_usuario,
    nome: u.nome,
    email: u.email,
    role,
    cargo: u.cargo ?? undefined,
    telefone: u.telefone || undefined,
    token: u.token || undefined,
  };
}

function hashCardUidToNegativeId(uid: string): number {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash) || 1;
  return -positive;
}

export function externalCardToProduct(card: ExternalCard, estoquePadrao = 5): Product {
  return {
    id: hashCardUidToNegativeId(card.uid),
    nome: card.nome,
    preco: card.precoMercadoBrl,
    estoque: estoquePadrao,
    jogo: card.jogo,
    jogoNome: card.jogoNome,
    categoria: card.categoria || 'Carta Avulsa',
    subtitulo: `${card.colecao} • ${card.codigoCarta}`,
    descricao:
      card.descricao ||
      `Carta oficial colecionável ${card.nome} (${card.colecao}).`,
    imagemUrl: card.imagemUrl,
    raridade: card.raridade,
    isNovo: false,
    isDestaque: false,
    idioma: card.idioma || (card.jogo === 'pokemon' ? 'Português' : 'Inglês / Oficial'),
    ano: card.ano || new Date().getFullYear(),
    ativo: true,
    externalCard: card,
  };
}

// Conversores de formato Backend (snake_case) <-> Frontend (camelCase)
export function adaptarProdutoDoBackend(p: any): Product {
  return {
    id: p.id_produto,
    nome: p.nome,
    preco: p.preco,
    estoque: p.quantidade,
    estoqueMinimo: p.estoque_minimo ?? 3,
    jogo: p.jogo,
    jogoNome: p.jogo_nome || p.jogo,
    categoria: p.categoria,
    subtitulo: p.subtitulo || `${p.categoria} • ${p.jogo_nome || p.jogo}`,
    descricao: p.descricao || '',
    imagemUrl: p.imagem_url?.trim() || '',
    raridade: p.raridade || 'Comum',
    isNovo: p.is_novo ?? true,
    isDestaque: p.is_destaque ?? false,
    idioma: p.idioma || 'Português',
    ano: p.ano || new Date().getFullYear(),
    ativo: p.ativo ?? true,
  };
}

export function adaptarProdutoParaBackend(p: Omit<Product, 'id'>) {
  return {
    nome: p.nome,
    preco: p.preco,
    quantidade: p.estoque,
    estoque_minimo: p.estoqueMinimo ?? 3,
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

export function adaptarPedidoDoBackend(p: any, produtosCatalogo: Product[] = []): Order {
  const itens: CartItem[] = (p.itens || []).map((item: any) => {
    const catalogProd = produtosCatalogo.find((prod) => prod.id === item.produto_id);
    const prodRef: Product = catalogProd
      ? {
          ...catalogProd,
          nome: catalogProd.nome || item.produto_nome || `Produto #${item.produto_id}`,
          jogoNome: catalogProd.jogoNome || item.jogo_nome || 'Geral',
          imagemUrl: catalogProd.imagemUrl || item.imagem_url || '',
        }
      : {
          id: item.produto_id,
          nome: item.produto_nome || `Produto #${item.produto_id}`,
          preco: item.preco_unitario,
          estoque: 0,
          jogo: 'outros',
          jogoNome: item.jogo_nome || 'Geral',
          categoria: 'Carta Avulsa',
          subtitulo: '',
          descricao: '',
          imagemUrl: item.imagem_url || '',
        };
    return {
      produto: prodRef,
      quantidade: item.quantidade,
      subtotal: item.subtotal,
    };
  });

  return {
    id_pedido: p.id_pedido,
    numero: typeof p.numero === 'number' ? p.numero : undefined,
    cliente_id: typeof p.cliente_id === 'number' ? p.cliente_id : undefined,
    cliente_nome: p.cliente_nome,
    cliente_email: p.cliente_email,
    cliente_telefone: p.cliente_telefone || undefined,
    endereco_entrega: p.endereco_entrega || undefined,
    tipo_entrega: p.tipo_entrega || 'entrega',
    cep: p.cep || undefined,
    metodo_pagamento: p.metodo_pagamento || undefined,
    status_pagamento: p.status_pagamento || undefined,
    observacoes: p.observacoes || undefined,
    codigo_rastreio: p.codigo_rastreio || undefined,
    atualizado_em: p.atualizado_em || undefined,
    itens,
    valor_total: p.valor_total,
    data: p.data,
    status: p.status as Order['status'],
  };
}

export const api = {
  // PRODUTOS
  async obterProdutos(apenasAtivos: boolean = false): Promise<Product[]> {
    const query = apenasAtivos ? '?apenas_ativos=true' : '?apenas_ativos=false';
    const res = await fetch(`${API_BASE}/produtos${query}`);
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao carregar produtos da API'));
    }
    const dados = await res.json();
    return dados.map(adaptarProdutoDoBackend);
  },

  async cadastrarProduto(produto: Omit<Product, 'id'>): Promise<Product> {
    const payload = adaptarProdutoParaBackend(produto);
    const res = await fetchWithAuth(`${API_BASE}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Erro ao cadastrar produto'));
    }
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async atualizarEstoque(produtoId: number, variacao: number, quantidadeAtual: number): Promise<Product> {
    const novaQtd = Math.max(0, quantidadeAtual + variacao);
    return this.definirEstoque(produtoId, novaQtd);
  },

  async definirEstoque(produtoId: number, novaQuantidade: number): Promise<Product> {
    const res = await fetchWithAuth(`${API_BASE}/produtos/${produtoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantidade: Math.max(0, novaQuantidade) }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao atualizar estoque no backend'));
    }
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async atualizarProduto(produtoId: number, dadosAtualizados: Partial<Product>): Promise<Product> {
    const payload: Record<string, any> = {};
    if (dadosAtualizados.nome !== undefined) payload.nome = dadosAtualizados.nome;
    if (dadosAtualizados.preco !== undefined) payload.preco = dadosAtualizados.preco;
    if (dadosAtualizados.estoque !== undefined) payload.quantidade = dadosAtualizados.estoque;
    if (dadosAtualizados.estoqueMinimo !== undefined) payload.estoque_minimo = dadosAtualizados.estoqueMinimo;
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

    const res = await fetchWithAuth(`${API_BASE}/produtos/${produtoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Erro ao atualizar produto'));
    }
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async inativarProduto(produtoId: number): Promise<Product> {
    const res = await fetchWithAuth(`${API_BASE}/produtos/${produtoId}/inativar`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao inativar produto no backend'));
    }
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async reativarProduto(produtoId: number): Promise<Product> {
    const res = await fetchWithAuth(`${API_BASE}/produtos/${produtoId}/ativar`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao reativar produto no backend'));
    }
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async excluirProduto(produtoId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/produtos/${produtoId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao excluir produto'));
    }
  },

  // ESTOQUE
  async registrarEntradaEstoque(
    produtoId: number,
    quantidade: number,
    motivo: string = 'Reposição de Estoque',
    responsavel: string = 'Administrador'
  ) {
    const res = await fetchWithAuth(`${API_BASE}/estoque/entrada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: produtoId, quantidade, motivo, responsavel }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao registrar entrada de estoque'));
    }
    return res.json();
  },

  async registrarSaidaEstoque(
    produtoId: number,
    quantidade: number,
    motivo: string = 'Baixa Operacional',
    responsavel: string = 'Administrador'
  ) {
    const res = await fetchWithAuth(`${API_BASE}/estoque/saida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: produtoId, quantidade, motivo, responsavel }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Quantidade indisponível ou erro na baixa de estoque'));
    }
    return res.json();
  },

  async definirEstoqueMinimo(produtoId: number, estoqueMinimo: number) {
    const res = await fetchWithAuth(`${API_BASE}/estoque/${produtoId}/minimo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estoque_minimo: Math.max(0, estoqueMinimo) }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Erro ao definir estoque mínimo'));
    }
    return res.json();
  },

  async obterMovimentacoesEstoque(limite: number = 100): Promise<StockMovement[]> {
    const res = await fetchWithAuth(`${API_BASE}/estoque/movimentacoes?limite=${limite}`);
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao consultar movimentações de estoque'));
    }
    return res.json();
  },

  async obterEstoqueEmFalta() {
    const res = await fetchWithAuth(`${API_BASE}/estoque/falta`);
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao consultar estoque em falta'));
    }
    return res.json();
  },

  // PEDIDOS
  async obterPedidos(produtosCatalogo: Product[] = []): Promise<Order[]> {
    const res = await fetchWithAuth(`${API_BASE}/pedidos`);
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao carregar pedidos da API'));
    }
    const dados = await res.json();
    return dados.map((p: any) => adaptarPedidoDoBackend(p, produtosCatalogo));
  },

  async criarPedido(
    dados: {
      cliente_id?: number;
      cliente_nome: string;
      cliente_email: string;
      cliente_telefone?: string;
      endereco_entrega: string;
      tipo_entrega: 'entrega' | 'retirada';
      cep: string;
      metodo_pagamento: string;
      status_pagamento: string;
      parcelas?: number;
      observacoes?: string;
      itens: { produto_id: number; quantidade: number }[];
    },
    produtosCatalogo: Product[] = []
  ): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Erro ao criar pedido'));
    }
    const pedidoCriado = await res.json();
    return adaptarPedidoDoBackend(pedidoCriado, produtosCatalogo);
  },

  async atualizarStatusPedido(
    pedidoId: number,
    status: Order['status'],
    produtosCatalogo: Product[] = [],
    codigoRastreio?: string,
    statusPagamento?: string
  ): Promise<Order> {
    const payload: Record<string, string> = { status };
    if (codigoRastreio !== undefined) {
      payload.codigo_rastreio = codigoRastreio;
    }
    if (statusPagamento !== undefined) {
      payload.status_pagamento = statusPagamento;
    }
    const res = await fetchWithAuth(`${API_BASE}/pedidos/${pedidoId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Erro ao atualizar status do pedido'));
    }
    const dados = await res.json();
    return adaptarPedidoDoBackend(dados, produtosCatalogo);
  },

  async cancelarMeuPedido(pedidoId: number, produtosCatalogo: Product[] = []): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE}/pedidos/${pedidoId}/cancelar`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Não foi possível cancelar o pedido'));
    }
    const dados = await res.json();
    return adaptarPedidoDoBackend(dados, produtosCatalogo);
  },

  // AUTENTICAÇÃO
  async login(email: string, senha: string, persistirSessao: boolean = true): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Credenciais inválidas'));
    }
    const dados = await res.json();
    if (dados.token && persistirSessao) {
      setAuthToken(dados.token);
    }
    return adaptarUsuarioDoBackend(dados);
  },

  async cadastrarUsuario(
    nome: string,
    email: string,
    senha: string,
    tipoUsuario: UserRole = 'cliente',
    telefone: string = '',
    cargo?: string,
    persistirSessao?: boolean
  ): Promise<UserProfile> {
    const backendTipo =
      tipoUsuario === 'admin'
        ? 'administrador'
        : tipoUsuario === 'funcionario'
          ? 'funcionario'
          : 'cliente';

    const existingToken = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (existingToken) {
      headers.Authorization = `Bearer ${existingToken}`;
    }

    const res = await fetch(`${API_BASE}/auth/cadastro`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nome,
        email,
        senha,
        tipo_usuario: backendTipo,
        telefone,
        cargo,
      }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Erro no cadastro'));
    }
    const dados = await res.json();
    if (
      dados.token &&
      (persistirSessao === true || (persistirSessao !== false && !existingToken))
    ) {
      setAuthToken(dados.token);
    }
    return adaptarUsuarioDoBackend(dados);
  },

  async excluirUsuario(idUsuario: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/auth/usuarios/${idUsuario}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao excluir usuário'));
    }
  },

  async obterUsuarios(): Promise<UserProfile[]> {
    const res = await fetchWithAuth(`${API_BASE}/auth/usuarios`);
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao obter usuários'));
    }
    const dados = await res.json();
    return dados.map((u: any) => {
      const adaptado = adaptarUsuarioDoBackend(u);
      return {
        ...adaptado,
        cargo:
          adaptado.cargo ||
          (adaptado.role === 'admin'
            ? 'Administrador'
            : adaptado.role === 'funcionario'
              ? 'Atendente'
              : 'Cliente'),
      };
    });
  },

  async atualizarPerfilUsuario(idUsuario: number, tipoUsuario: UserRole, cargo?: string): Promise<UserProfile> {
    const backendTipo =
      tipoUsuario === 'admin'
        ? 'administrador'
        : tipoUsuario === 'funcionario'
          ? 'funcionario'
          : 'cliente';

    const res = await fetchWithAuth(`${API_BASE}/auth/usuarios/${idUsuario}/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_usuario: backendTipo,
        cargo,
      }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Falha ao atualizar perfil'));
    }
    const dados = await res.json();
    return adaptarUsuarioDoBackend(dados);
  },

  async alterarSenhaUsuario(idUsuario: number, novaSenha: string, senhaAtual?: string) {
    const payload: { nova_senha: string; senha_atual?: string } = {
      nova_senha: novaSenha,
    };
    if (senhaAtual !== undefined) {
      payload.senha_atual = senhaAtual;
    }
    const res = await fetchWithAuth(
      `${API_BASE}/auth/usuarios/${idUsuario}/senha`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { handle401: false }
    );
    if (!res.ok) {
      const msg = await extractErrorMessage(res, 'Falha ao alterar senha');
      if (res.status === 401 && !msg.toLowerCase().includes('senha atual')) {
        handleUnauthorizedResponse();
      }
      throw new Error(msg);
    }
    return await res.json();
  },
};
