import type { StaffPermission, UserProfile } from '../types';

export interface StaffPermissionDefinition {
  key: StaffPermission;
  label: string;
  shortLabel: string;
  description: string;
  restrictionNote: string;
}

export const STAFF_PERMISSIONS_CATALOG: StaffPermissionDefinition[] = [
  {
    key: 'pedidos',
    label: 'Pedidos & Expedição',
    shortLabel: 'Pedidos',
    description:
      'Visualizar pedidos da loja, avançar status de preparo/envio, registrar código de rastreio e confirmar pagamentos na retirada.',
    restrictionNote: 'Sem acesso para visualizar pedidos de clientes sem esta permissão.',
  },
  {
    key: 'estoque',
    label: 'Estoque & Movimentações',
    shortLabel: 'Estoque',
    description:
      'Consultar alertas de reposição, registrar entradas e baixas operacionais, ajustar saldos e auditar movimentações.',
    restrictionNote: 'Ajustes quantitativos e registros de movimentação ficam bloqueados.',
  },
  {
    key: 'produtos',
    label: 'Produtos & Preços',
    shortLabel: 'Produtos',
    description:
      'Cadastrar produtos manuais, editar descrições e preços, aplicar reajustes e inativar ou reativar itens do catálogo.',
    restrictionNote: 'Exclusão definitiva do banco permanece exclusiva do Administrador.',
  },
  {
    key: 'catalogo_api',
    label: 'Catálogo Oficial (API)',
    shortLabel: 'Catálogo API',
    description:
      'Consultar o acervo oficial de Pokémon, Magic, Yu-Gi-Oh! e One Piece e importar novas cartas diretamente para a loja.',
    restrictionNote: 'Importação direta do acervo externo fica desabilitada.',
  },
];

export const ALL_STAFF_PERMISSIONS: StaffPermission[] = STAFF_PERMISSIONS_CATALOG.map((p) => p.key);

export interface CargoPreset {
  cargo: string;
  permissoes: StaffPermission[];
  resumo: string;
}

export const STAFF_CARGO_PRESETS: CargoPreset[] = [
  {
    cargo: 'Atendente de Loja',
    permissoes: ['pedidos', 'estoque'],
    resumo: 'Atendimento de pedidos, retiradas e movimentações básicas de estoque.',
  },
  {
    cargo: 'Estoquista',
    permissoes: ['estoque', 'produtos', 'catalogo_api'],
    resumo: 'Gestão completa de inventário, cadastro de itens e importação de cartas.',
  },
  {
    cargo: 'Catalogador TCG',
    permissoes: ['produtos', 'catalogo_api'],
    resumo: 'Cadastro, precificação e importação via catálogo oficial.',
  },
  {
    cargo: 'Gerente Operacional',
    permissoes: ['pedidos', 'estoque', 'produtos', 'catalogo_api'],
    resumo: 'Todos os módulos operacionais (sem gestão de equipe ou faturamento).',
  },
];

export function resolveUserPermissions(user: Pick<UserProfile, 'role' | 'permissoes'>): StaffPermission[] {
  if (user.role === 'admin') {
    return [...ALL_STAFF_PERMISSIONS];
  }
  if (user.role !== 'funcionario') {
    return [];
  }
  if (!Array.isArray(user.permissoes)) {
    return [];
  }
  const set = new Set(user.permissoes);
  return ALL_STAFF_PERMISSIONS.filter((p) => set.has(p));
}

export function userHasPermission(
  user: Pick<UserProfile, 'role' | 'permissoes'>,
  permission: StaffPermission
): boolean {
  if (user.role === 'admin') return true;
  if (user.role !== 'funcionario') return false;
  return resolveUserPermissions(user).includes(permission);
}

export function userHasAnyProductControlPermission(
  user: Pick<UserProfile, 'role' | 'permissoes'>
): boolean {
  if (user.role === 'admin') return true;
  if (user.role !== 'funcionario') return false;
  const perms = resolveUserPermissions(user);
  return perms.includes('produtos') || perms.includes('estoque') || perms.includes('catalogo_api');
}

export function getRoleDisplayLabel(role: UserProfile['role']): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'funcionario':
      return 'Funcionário';
    default:
      return 'Cliente';
  }
}
