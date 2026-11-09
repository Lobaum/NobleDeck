export type GameId = 'pokemon' | 'magic' | 'yugioh' | 'onepiece' | 'outros';

export type ActiveGameApi = 'pokemon' | 'magic' | 'yugioh' | 'onepiece';

export type ProductCategory =
  | 'Booster Box'
  | 'Deck Commander'
  | 'Booster Pack'
  | 'Starter Deck'
  | 'Acessórios'
  | 'Carta Avulsa';

export interface ExternalCard {
  uid: string;
  externalId: string;
  nome: string;
  jogo: ActiveGameApi;
  jogoNome: string;
  colecao: string;
  codigoCarta: string;
  raridade: string;
  descricao: string;
  imagemUrl: string;
  glImageUrl: string;
  precoMercadoBrl: number;
  precoOriginalUsd: number | null;
  fonteApi: 'Scryfall' | 'TCGdex' | 'YGOPRODeck' | 'OPTCG';
  ano?: number;
  atributos?: string;
}

export interface Product {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
  estoqueMinimo?: number;
  jogo: GameId;
  jogoNome: string;
  categoria: ProductCategory;
  subtitulo: string;
  descricao: string;
  imagemUrl: string;
  raridade?: string;
  isNovo?: boolean;
  isDestaque?: boolean;
  idioma?: string;
  ano?: number;
  ativo?: boolean;
  externalCard?: ExternalCard;
}

export interface StockMovement {
  id_movimentacao: number;
  produto_id: number;
  produto_nome: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  saldo_anterior: number;
  saldo_posterior: number;
  motivo: string;
  responsavel: string;
  data_hora: string;
}

export interface CartItem {
  produto: Product;
  quantidade: number;
  subtotal: number;
}

export interface Order {
  id_pedido: number;
  cliente_nome: string;
  cliente_email: string;
  itens: CartItem[];
  valor_total: number;
  data: string;
  status: 'Pendente' | 'Processando' | 'Finalizado' | 'Cancelado';
}

export type UserRole = 'cliente' | 'funcionario' | 'admin';

export interface UserProfile {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  cargo?: string;
  avatarUrl?: string;
}
