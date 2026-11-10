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
    categoria: 'Carta Avulsa',
    subtitulo: `${card.colecao} • ${card.codigoCarta}`,
    descricao:
      card.descricao ||
      `Carta oficial colecionável ${card.nome} (${card.colecao}).`,
    imagemUrl: card.imagemUrl,
    raridade: card.raridade,
    isNovo: false,
    isDestaque: false,
    idioma: 'Inglês / Oficial',
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
  async obterProdutos(apenasAtivos: boolean = false): Promise<Product[]> {
    const query = apenasAtivos ? '?apenas_ativos=true' : '?apenas_ativos=false';
    const res = await fetch(`${API_BASE}/produtos${query}`);
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

  async reativarProduto(produtoId: number): Promise<Product> {
    const res = await fetch(`${API_BASE}/produtos/${produtoId}/ativar`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Falha ao reativar produto no backend');
    const dados = await res.json();
    return adaptarProdutoDoBackend(dados);
  },

  async excluirProduto(produtoId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/produtos/${produtoId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Falha ao excluir produto' }));
      throw new Error(err.detail || 'Falha ao excluir produto');
    }
  },

  // ESTOQUE
  async registrarEntradaEstoque(
    produtoId: number,
    quantidade: number,
    motivo: string = 'Reposição de Estoque',
    responsavel: string = 'Administrador'
  ) {
    const res = await fetch(`${API_BASE}/estoque/entrada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: produtoId, quantidade, motivo, responsavel }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Falha ao registrar entrada de estoque' }));
      throw new Error(err.detail || 'Falha ao registrar entrada de estoque');
    }
    return res.json();
  },

  async registrarSaidaEstoque(
    produtoId: number,
    quantidade: number,
    motivo: string = 'Baixa Operacional',
    responsavel: string = 'Administrador'
  ) {
    const res = await fetch(`${API_BASE}/estoque/saida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: produtoId, quantidade, motivo, responsavel }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Quantidade indisponível ou erro na baixa de estoque' }));
      throw new Error(err.detail || 'Quantidade indisponível ou erro na baixa de estoque');
    }
    return res.json();
  },

  async definirEstoqueMinimo(produtoId: number, estoqueMinimo: number) {
    const res = await fetch(`${API_BASE}/estoque/${produtoId}/minimo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estoque_minimo: Math.max(0, estoqueMinimo) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao definir estoque mínimo' }));
      throw new Error(err.detail || 'Erro ao definir estoque mínimo');
    }
    return res.json();
  },

  async obterMovimentacoesEstoque(limite: number = 100): Promise<StockMovement[]> {
    const res = await fetch(`${API_BASE}/estoque/movimentacoes?limite=${limite}`);
    if (!res.ok) throw new Error('Falha ao consultar movimentações de estoque');
    return res.json();
  },

  async obterEstoqueEmFalta() {
    const res = await fetch(`${API_BASE}/estoque/falta`);
    if (!res.ok) throw new Error('Falha ao consultar estoque em falta');
    return res.json();
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
    };
  },

  async cadastrarUsuario(
    nome: string,
    email: string,
    senha: string,
    tipoUsuario: UserRole = 'cliente',
    telefone: string = '',
    cargo?: string
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
        cargo,
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
    };
  },

  async excluirUsuario(idUsuario: number): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/usuarios/${idUsuario}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Falha ao excluir usuário' }));
      throw new Error(err.detail || 'Falha ao excluir usuário');
    }
  },

  async obterUsuarios(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/auth/usuarios`);
    if (!res.ok) {
      throw new Error('Falha ao obter usuários');
    }
    const dados = await res.json();
    return dados.map((u: any) => ({
      id: u.id_usuario,
      nome: u.nome,
      email: u.email,
      role: (u.tipo_usuario === 'administrador' ? 'admin' : u.tipo_usuario === 'funcionario' ? 'funcionario' : 'cliente') as UserRole,
      cargo: u.cargo || (u.tipo_usuario === 'administrador' ? 'Administrador' : u.tipo_usuario === 'funcionario' ? 'Atendente' : 'Cliente'),
    }));
  },

  async atualizarPerfilUsuario(idUsuario: number, tipoUsuario: UserRole, cargo?: string): Promise<UserProfile> {
    const backendTipo =
      tipoUsuario === 'admin'
        ? 'administrador'
        : tipoUsuario === 'funcionario'
          ? 'funcionario'
          : 'cliente';

    const res = await fetch(`${API_BASE}/auth/usuarios/${idUsuario}/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_usuario: backendTipo,
        cargo,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Falha ao atualizar perfil' }));
      throw new Error(err.detail || 'Falha ao atualizar perfil');
    }
    const dados = await res.json();
    return {
      id: dados.id_usuario,
      nome: dados.nome,
      email: dados.email,
      role: tipoUsuario,
      cargo: dados.cargo,
    };
  },

  async alterarSenhaUsuario(idUsuario: number, novaSenha: string) {
    const res = await fetch(`${API_BASE}/auth/usuarios/${idUsuario}/senha`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nova_senha: novaSenha,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Falha ao alterar senha' }));
      throw new Error(err.detail || 'Falha ao alterar senha');
    }
    return await res.json();
  },
};
