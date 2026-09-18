export type GameId = 'pokemon' | 'magic' | 'yugioh' | 'onepiece' | 'outros';

export type ProductCategory =
  | 'Booster Box'
  | 'Deck Commander'
  | 'Booster Pack'
  | 'Starter Deck'
  | 'Acessórios'
  | 'Carta Avulsa';

export interface Product {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
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
}

export interface Tournament {
  id: number;
  titulo: string;
  jogo: GameId;
  jogoNome: string;
  formato: string;
  data: string;
  horario: string;
  local: string;
  vagasTotais: number;
  vagasOcupadas: number;
  taxaInscricao: number;
  premiacao: string;
  isPremium?: boolean;
  status: 'aberto' | 'lotado' | 'encerrado';
  inscritos: string[];
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
  torneiosInscritos: number[];
}
