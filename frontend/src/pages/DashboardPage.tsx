import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, ChevronDown, Check, Pencil, Trash2, Plus, Minus, X, Save, Shield, RotateCcw, Search, Boxes } from 'lucide-react';
import type { ActiveGameApi, ExternalCard, GameId, ProductCategory, Order, Product } from '../types';
import { SystemSelect } from '../components/SystemSelect';
import { SystemModal } from '../components/SystemModal';
import { searchLiveCards } from '../services/tcgApi';
import { formatBRL } from '../services/api';

interface DashboardSemanticTones {
  successText: string;
  successBg: string;
  successBorder: string;
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;
  warningText: string;
  warningBg: string;
  warningBorder: string;
  infoText: string;
  infoBg: string;
  infoBorder: string;
  pendingText: string;
  pendingBg: string;
  pendingBorder: string;
  activeTabBg: string;
  activeTabText: string;
  activeTabBorder: string;
}

const getSemanticTones = (isLight: boolean): DashboardSemanticTones =>
  isLight
    ? {
      successText: '#166534',
      successBg: 'rgba(22, 163, 74, 0.10)',
      successBorder: 'rgba(22, 163, 74, 0.34)',
      dangerText: '#b91c1c',
      dangerBg: 'rgba(220, 38, 38, 0.09)',
      dangerBorder: 'rgba(220, 38, 38, 0.32)',
      warningText: '#92400e',
      warningBg: 'rgba(217, 119, 6, 0.11)',
      warningBorder: 'rgba(217, 119, 6, 0.36)',
      infoText: '#0369a1',
      infoBg: 'rgba(2, 132, 199, 0.10)',
      infoBorder: 'rgba(2, 132, 199, 0.32)',
      pendingText: '#9a3412',
      pendingBg: 'rgba(234, 88, 12, 0.10)',
      pendingBorder: 'rgba(234, 88, 12, 0.32)',
      activeTabBg: 'rgba(255, 196, 0, 0.22)',
      activeTabText: '#7A4B00',
      activeTabBorder: 'rgba(212, 128, 0, 0.45)',
    }
    : {
      successText: '#4ade80',
      successBg: 'rgba(34, 197, 94, 0.13)',
      successBorder: 'rgba(74, 222, 128, 0.35)',
      dangerText: '#f87171',
      dangerBg: 'rgba(239, 68, 68, 0.14)',
      dangerBorder: 'rgba(248, 113, 113, 0.38)',
      warningText: '#fbbf24',
      warningBg: 'rgba(245, 158, 11, 0.14)',
      warningBorder: 'rgba(251, 191, 36, 0.38)',
      infoText: '#38bdf8',
      infoBg: 'rgba(56, 189, 248, 0.14)',
      infoBorder: 'rgba(56, 189, 248, 0.35)',
      pendingText: '#FF9D00',
      pendingBg: 'rgba(255, 157, 0, 0.12)',
      pendingBorder: 'rgba(255, 157, 0, 0.35)',
      activeTabBg: 'rgba(255, 196, 0, 0.16)',
      activeTabText: 'var(--color-primary)',
      activeTabBorder: 'rgba(255, 210, 26, 0.4)',
    };

const getOrderAllowedStatuses = (currentStatus: Order['status']): Order['status'][] => {
  switch (currentStatus) {
    case 'Pendente':
      return ['Pendente', 'Processando', 'Enviado', 'Finalizado', 'Cancelado'];
    case 'Processando':
      return ['Processando', 'Enviado', 'Finalizado', 'Cancelado'];
    case 'Enviado':
      return ['Enviado', 'Finalizado', 'Cancelado'];
    case 'Finalizado':
      return ['Finalizado', 'Cancelado'];
    case 'Cancelado':
      return ['Cancelado'];
    default:
      return ['Pendente', 'Processando', 'Enviado', 'Finalizado', 'Cancelado'];
  }
};

const getOrderStatusStyle = (status: Order['status'], tones: DashboardSemanticTones, isLight: boolean) => {
  switch (status) {
    case 'Finalizado':
      return { dot: isLight ? '#16a34a' : '#22c55e', text: tones.successText, bg: tones.successBg, border: tones.successBorder };
    case 'Enviado':
      return { dot: isLight ? '#0284c7' : '#38bdf8', text: tones.infoText, bg: tones.infoBg, border: tones.infoBorder };
    case 'Processando':
      return { dot: isLight ? '#d97706' : '#eab308', text: tones.warningText, bg: tones.warningBg, border: tones.warningBorder };
    case 'Cancelado':
      return { dot: isLight ? '#dc2626' : '#ef4444', text: tones.dangerText, bg: tones.dangerBg, border: tones.dangerBorder };
    default:
      return { dot: isLight ? '#c2410c' : '#FF9D00', text: tones.pendingText, bg: tones.pendingBg, border: tones.pendingBorder };
  }
};

interface OrderStatusDropdownProps {
  currentStatus: Order['status'];
  onStatusChange: (newStatus: Order['status']) => void;
  tones: DashboardSemanticTones;
  isLight: boolean;
}

const OrderStatusDropdown: React.FC<OrderStatusDropdownProps> = ({ currentStatus, onStatusChange, tones, isLight }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const availableOptions = getOrderAllowedStatuses(currentStatus);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentStyle = getOrderStatusStyle(currentStatus, tones, isLight);
  const idleShadow = isLight ? '0 2px 6px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.15)';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Alterar status do pedido (atual: ${currentStatus})`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: currentStyle.bg,
          color: currentStyle.text,
          border: `1px solid ${currentStyle.border}`,
          borderRadius: '8px',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          boxShadow: idleShadow,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = isLight ? `0 2px 10px ${currentStyle.border}` : `0 0 12px ${currentStyle.border}`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = idleShadow;
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: currentStyle.dot,
            boxShadow: isLight ? 'none' : `0 0 8px ${currentStyle.dot}`,
            flexShrink: 0,
          }}
        />
        <span>{currentStatus}</span>
        <ChevronDown
          size={13}
          style={{
            color: currentStyle.text,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            minWidth: '155px',
            backgroundColor: 'var(--card-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isLight ? '1px solid rgba(180, 120, 0, 0.3)' : '1px solid rgba(255, 210, 26, 0.35)',
            borderRadius: '10px',
            padding: '4px',
            boxShadow: isLight
              ? '0 12px 28px rgba(0, 0, 0, 0.14)'
              : '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 20px rgba(255, 196, 0, 0.15)',
          }}
        >
          {availableOptions.map((opt) => {
            const isSelected = opt === currentStatus;
            const optStyle = getOrderStatusStyle(opt, tones, isLight);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  if (opt !== currentStatus) {
                    onStatusChange(opt);
                  }
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isSelected ? tones.activeTabBg : 'transparent',
                  color: isSelected ? tones.activeTabText : 'var(--color-on-surface)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = isLight
                      ? 'rgba(217, 119, 6, 0.08)'
                      : 'rgba(255, 210, 26, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: optStyle.dot,
                      boxShadow: isLight ? 'none' : `0 0 6px ${optStyle.dot}`,
                    }}
                  />
                  <span>{opt}</span>
                </div>
                {isSelected && <Check size={14} style={{ color: tones.activeTabText }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface StockItemCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onUpdateStockDelta: (productId: number, change: number) => void;
  onSetStockExact: (productId: number, exact: number) => void;
  isStaffOrAdmin: boolean;
  onPermanentDelete?: (product: Product) => void;
  tones: DashboardSemanticTones;
  isLight: boolean;
}

const StockItemCard: React.FC<StockItemCardProps> = ({
  product,
  onEdit,
  onUpdateStockDelta,
  onSetStockExact,
  isStaffOrAdmin,
  onPermanentDelete,
  tones,
  isLight,
}) => {
  const [stockInput, setStockInput] = useState<string>(String(product.estoque));
  const minStockLimit = product.estoqueMinimo ?? 3;
  const isOutOfStock = product.estoque === 0;
  const isLowStock = !isOutOfStock && product.estoque <= minStockLimit;
  const isDirty = stockInput.trim() !== '' && Number(stockInput) !== product.estoque;

  useEffect(() => {
    setStockInput(String(product.estoque));
  }, [product.estoque]);

  const handleSaveExact = () => {
    if (!isStaffOrAdmin) return;
    const num = parseInt(stockInput, 10);
    if (!isNaN(num) && num >= 0) {
      onSetStockExact(product.id, num);
    } else {
      setStockInput(String(product.estoque));
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border:
          product.ativo === false
            ? `1px dashed ${tones.dangerBorder}`
            : isOutOfStock
              ? `1px solid ${tones.dangerBorder}`
              : isLowStock
                ? `1px solid ${tones.warningBorder}`
                : undefined,
        position: 'relative',
        transition: 'all 0.2s ease',
        opacity: product.ativo === false ? 0.72 : 1,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-muted">{product.jogoNome}</span>
            {product.ativo === false ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: tones.dangerBg,
                  border: `1px solid ${tones.dangerBorder}`,
                  color: tones.dangerText,
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Inativo
              </span>
            ) : isOutOfStock ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: tones.dangerBg,
                  border: `1px solid ${tones.dangerBorder}`,
                  color: tones.dangerText,
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Esgotado!
              </span>
            ) : isLowStock ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: tones.warningText,
                  backgroundColor: tones.warningBg,
                  border: `1px solid ${tones.warningBorder}`,
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={12} /> Estoque Baixo ({product.estoque} ≤ {minStockLimit})
              </span>
            ) : null}
          </div>

          {isStaffOrAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => onEdit(product)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 9px',
                  backgroundColor: tones.activeTabBg,
                  border: `1px solid ${tones.activeTabBorder}`,
                  borderRadius: '6px',
                  color: tones.activeTabText,
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = isLight
                  ? 'rgba(255, 196, 0, 0.34)'
                  : 'rgba(255, 210, 26, 0.22)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tones.activeTabBg)}
                title="Editar dados deste produto"
              >
                <Pencil size={12} />
                Editar
              </button>
              {product.ativo === false && onPermanentDelete && (
                <button
                  type="button"
                  onClick={() => onPermanentDelete(product)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 9px',
                    backgroundColor: tones.dangerBg,
                    border: `1px solid ${tones.dangerBorder}`,
                    borderRadius: '6px',
                    color: tones.dangerText,
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = isLight
                    ? 'rgba(220, 38, 38, 0.16)'
                    : 'rgba(239, 68, 68, 0.22)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tones.dangerBg)}
                  title="Excluir produto inativo definitivamente"
                >
                  <Trash2 size={12} />
                  Excluir
                </button>
              )}
            </div>
          )}
        </div>

        <h4 style={{ fontSize: '17px', marginBottom: '4px', color: 'var(--color-headline)' }}>{product.nome}</h4>
        <p style={{ fontFamily: 'var(--font-mono)', color: tones.activeTabText, fontWeight: 700 }}>
          {product.preco > 0 ? `R$ ${formatBRL(product.preco)}` : 'Sob consulta'}
        </p>
      </div>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', display: 'block' }}>
              Disponível em Estoque
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
              Mínimo: {minStockLimit} un.
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '15px',
              fontWeight: 700,
              color: isOutOfStock ? tones.dangerText : isLowStock ? tones.warningText : 'var(--color-headline)',
            }}
          >
            {product.estoque} unidades
          </span>
        </div>

        {isStaffOrAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onUpdateStockDelta(product.id, -1)}
              disabled={product.estoque <= 0}
              style={{
                width: '32px',
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-surface-container-high)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-on-surface)',
                cursor: product.estoque <= 0 ? 'not-allowed' : 'pointer',
                opacity: product.estoque <= 0 ? 0.5 : 1,
              }}
              title="Reduzir 1 unidade"
              aria-label={`Reduzir 1 unidade de ${product.nome}`}
            >
              <Minus size={13} />
            </button>

            <input
              type="number"
              min="0"
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveExact();
              }}
              style={{
                width: '64px',
                height: '32px',
                textAlign: 'center',
                backgroundColor: 'var(--input-bg)',
                border: isDirty ? '1px solid var(--color-primary)' : '1px solid var(--input-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-headline)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '13px',
                outline: 'none',
              }}
              title="Digite a quantidade exata de estoque"
              aria-label={`Quantidade em estoque de ${product.nome}`}
            />

            <button
              type="button"
              onClick={() => onUpdateStockDelta(product.id, 1)}
              style={{
                width: '32px',
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-surface-container-high)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-on-surface)',
                cursor: 'pointer',
              }}
              title="Adicionar 1 unidade"
              aria-label={`Adicionar 1 unidade de ${product.nome}`}
            >
              <Plus size={13} />
            </button>

            {isDirty ? (
              <button
                type="button"
                onClick={handleSaveExact}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isLight ? 'none' : '0 0 10px rgba(255, 210, 26, 0.4)',
                }}
                title="Salvar quantidade digitada"
              >
                <Check size={12} /> Salvar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onUpdateStockDelta(product.id, 5)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  backgroundColor: tones.activeTabBg,
                  border: `1px solid ${tones.activeTabBorder}`,
                  borderRadius: 'var(--radius-sm)',
                  color: tones.activeTabText,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
                title="Entrada rápida (+5)"
              >
                +5
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const gameOptions: { value: GameId; label: string; badge?: string }[] = [
  { value: 'pokemon', label: 'Pokémon TCG', badge: 'Pokémon' },
  { value: 'magic', label: 'Magic: The Gathering', badge: 'MTG' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!', badge: 'YGO' },
  { value: 'onepiece', label: 'One Piece Card Game', badge: 'OP' },
  { value: 'outros', label: 'Acessórios / Geral' },
];

const categoryOptions: { value: ProductCategory; label: string }[] = [
  { value: 'Booster Box', label: 'Booster Box' },
  { value: 'Deck Commander', label: 'Deck Commander' },
  { value: 'Booster Pack', label: 'Booster Pack' },
  { value: 'Starter Deck', label: 'Starter Deck' },
  { value: 'Carta Avulsa', label: 'Carta Avulsa' },
  { value: 'Acessórios', label: 'Acessórios' },
];

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: (updated: Partial<Product>) => void;
  onDelete: (productId: number) => void;
  onReactivate?: (productId: number) => void;
  onPermanentDelete?: (productId: number) => void;
}

const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const number = Number(digits) / 100;
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseMoneyToFloat = (value: string): number => {
  if (!value) return 0;
  const clean = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onSave,
  onDelete,
  onReactivate,
  onPermanentDelete,
}) => {
  const { showToast, showToastConfirm } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const tones = getSemanticTones(isLight);

  const [nome, setNome] = useState(product.nome);
  const [preco, setPreco] = useState(
    product.preco ? Number(product.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  );
  const [estoque, setEstoque] = useState(String(product.estoque));
  const [estoqueMinimo, setEstoqueMinimo] = useState(String(product.estoqueMinimo ?? 3));
  const [jogo, setJogo] = useState<GameId>(product.jogo);
  const [categoria, setCategoria] = useState<ProductCategory>(product.categoria);
  const [subtitulo, setSubtitulo] = useState(product.subtitulo || '');
  const [imagemUrl, setImagemUrl] = useState(product.imagemUrl || '');
  const [descricao, setDescricao] = useState(product.descricao || '');

  const isProductActive = product.ativo !== false;

  const gameNames: Record<GameId, string> = {
    pokemon: 'Pokémon TCG',
    magic: 'Magic: The Gathering',
    yugioh: 'Yu-Gi-Oh!',
    onepiece: 'One Piece',
    outros: 'Acessórios / Geral',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nome.trim();
    const parsedPrice = parseMoneyToFloat(preco);
    const parsedEstoque = parseInt(estoque, 10);
    const parsedMin = parseInt(estoqueMinimo, 10);

    if (!trimmedName) {
      showToast('Informe o nome do produto.');
      return;
    }
    if (parsedPrice <= 0) {
      showToast('O preço deve ser maior que R$ 0,00.');
      return;
    }
    if (Number.isNaN(parsedEstoque) || parsedEstoque < 0) {
      showToast('O estoque não pode ser negativo.');
      return;
    }
    if (Number.isNaN(parsedMin) || parsedMin < 0) {
      showToast('O estoque mínimo não pode ser negativo.');
      return;
    }

    onSave({
      nome: trimmedName,
      preco: parsedPrice,
      estoque: parsedEstoque,
      estoqueMinimo: parsedMin,
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      subtitulo: subtitulo.trim() || `${categoria} • ${gameNames[jogo]}`,
      imagemUrl: imagemUrl.trim(),
      descricao: descricao.trim(),
    });
    onClose();
  };

  const handleToggleStatus = () => {
    if (isProductActive) {
      showToastConfirm({
        message: `Deseja realmente inativar o produto "${product.nome}" do catálogo?`,
        confirmText: 'Inativar',
        cancelText: 'Cancelar',
        onConfirm: () => {
          onDelete(product.id);
          onClose();
        },
      });
    } else {
      showToastConfirm({
        message: `Deseja realmente reativar o produto "${product.nome}" no catálogo?`,
        confirmText: 'Reativar',
        cancelText: 'Cancelar',
        onConfirm: () => {
          if (onReactivate) onReactivate(product.id);
          onClose();
        },
      });
    }
  };

  return (
    <SystemModal onClose={onClose} maxWidth="640px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '6px' }}>CRUD de Produtos</span>
          <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0 }}>Editar Produto</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal de edição"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isLight
            ? 'rgba(0, 0, 0, 0.06)'
            : 'rgba(255, 255, 255, 0.08)')
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            Nome do Produto *
          </label>
          <input
            type="text"
            required
            className="system-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="system-form-grid">
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Card Game
            </label>
            <SystemSelect<GameId>
              value={jogo}
              onChange={(val) => setJogo(val)}
              options={gameOptions}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Categoria
            </label>
            <SystemSelect<ProductCategory>
              value={categoria}
              onChange={(val) => setCategoria(val)}
              options={categoryOptions}
            />
          </div>
        </div>

        <div className="system-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Preço (R$) *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-on-surface-variant)',
                  pointerEvents: 'none',
                }}
              >
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                className="system-input"
                value={preco}
                onChange={(e) => setPreco(formatMoneyInput(e.target.value))}
                placeholder="0,00"
                style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Qtd. em Estoque *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Estoque Mínimo *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
              placeholder="3"
              title="Limite para alerta de reposição"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            Subtítulo / Tagline
          </label>
          <input
            type="text"
            className="system-input"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Ex: Booster Box • Edição Especial"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            URL da Imagem do Produto
          </label>
          <input
            type="text"
            className="system-input"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            Descrição
          </label>
          <textarea
            rows={3}
            className="system-input"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="system-modal-actions">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleToggleStatus}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '11px 18px',
                backgroundColor: isProductActive ? tones.dangerBg : tones.successBg,
                border: isProductActive ? `1px solid ${tones.dangerBorder}` : `1px solid ${tones.successBorder}`,
                borderRadius: 'var(--radius-sm)',
                color: isProductActive ? tones.dangerText : tones.successText,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isProductActive
                  ? isLight
                    ? 'rgba(220, 38, 38, 0.16)'
                    : 'rgba(239, 68, 68, 0.2)'
                  : isLight
                    ? 'rgba(22, 163, 74, 0.16)'
                    : 'rgba(34, 197, 94, 0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isProductActive ? tones.dangerBg : tones.successBg;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isProductActive ? <Trash2 size={14} /> : <RotateCcw size={14} />}
              {isProductActive ? 'Inativar Produto' : 'Reativar Produto'}
            </button>

            {!isProductActive && onPermanentDelete && (
              <button
                type="button"
                onClick={() => {
                  showToastConfirm({
                    message: `Deseja realmente excluir permanentemente o produto "${product.nome}"? Esta ação removerá o produto do catálogo e não poderá ser desfeita.`,
                    confirmText: 'Excluir definitivamente',
                    cancelText: 'Cancelar',
                    onConfirm: () => {
                      onPermanentDelete(product.id);
                      onClose();
                    },
                  });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '11px 18px',
                  backgroundColor: tones.dangerBg,
                  border: `1px solid ${tones.dangerBorder}`,
                  borderRadius: 'var(--radius-sm)',
                  color: tones.dangerText,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isLight
                    ? 'rgba(220, 38, 38, 0.18)'
                    : 'rgba(239, 68, 68, 0.28)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = tones.dangerBg;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="Excluir produto inativo definitivamente"
              >
                <Trash2 size={14} />
                Excluir Definitivamente
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 18px',
                backgroundColor: 'transparent',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-on-surface)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-outline)';
                e.currentTarget.style.backgroundColor = isLight
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '11px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <Save size={14} /> Salvar Alterações
            </button>
          </div>
        </div>
      </form>
    </SystemModal>
  );
};

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (product: Omit<Product, 'id'>) => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const { showToast } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const tones = getSemanticTones(isLight);

  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('3');
  const [jogo, setJogo] = useState<GameId>('pokemon');
  const [categoria, setCategoria] = useState<ProductCategory>('Booster Pack');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [raridade, setRaridade] = useState('');

  const [apiSearchTerm, setApiSearchTerm] = useState('');
  const [apiResults, setApiResults] = useState<ExternalCard[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  if (!isOpen) return null;

  const handleSearchApiCards = async () => {
    if (!apiSearchTerm.trim()) return;
    setIsSearchingApi(true);
    try {
      const targetGame: ActiveGameApi | 'all' =
        jogo === 'outros' ? 'all' : (jogo as ActiveGameApi);
      const { cards } = await searchLiveCards(targetGame, apiSearchTerm.trim(), 1);
      setApiResults(cards.slice(0, 6));
    } catch {
      setApiResults([]);
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleSelectApiCard = (card: ExternalCard) => {
    setNome(card.nome);
    setJogo(card.jogo);
    setCategoria('Carta Avulsa');
    setSubtitulo(`${card.colecao} • ${card.codigoCarta}`);
    setPreco(card.precoMercadoBrl > 0 ? formatBRL(card.precoMercadoBrl) : '');
    if (!estoque) setEstoque('5');
    setImagemUrl(card.imagemUrl);
    setDescricao(card.descricao);
    setRaridade(card.raridade);
    setApiResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nome.trim();
    const parsedPrice = parseMoneyToFloat(preco);
    const parsedEstoque = estoque.trim() === '' ? 0 : parseInt(estoque, 10);
    const parsedMin = estoqueMinimo.trim() === '' ? 3 : parseInt(estoqueMinimo, 10);

    if (!trimmedName) {
      showToast('Informe o nome do produto.');
      return;
    }
    if (parsedPrice <= 0) {
      showToast('O preço unitário deve ser maior que R$ 0,00.');
      return;
    }
    if (Number.isNaN(parsedEstoque) || parsedEstoque < 0) {
      showToast('O estoque inicial não pode ser negativo.');
      return;
    }
    if (Number.isNaN(parsedMin) || parsedMin < 0) {
      showToast('O estoque mínimo não pode ser negativo.');
      return;
    }

    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece',
      outros: 'Acessórios',
    };

    onCreate({
      nome: trimmedName,
      subtitulo: subtitulo.trim() || `${categoria} • ${gameNames[jogo]}`,
      preco: parsedPrice,
      estoque: parsedEstoque,
      estoqueMinimo: parsedMin,
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      descricao: descricao.trim() || 'Produto oficial licenciado da loja Noble Deck.',
      imagemUrl: imagemUrl.trim(),
      raridade: raridade || undefined,
      isNovo: true,
      isDestaque: false,
    });

    // Resetar formulário e fechar modal
    setNome('');
    setSubtitulo('');
    setDescricao('');
    setPreco('');
    setEstoque('');
    setEstoqueMinimo('3');
    setJogo('pokemon');
    setCategoria('Booster Pack');
    setImagemUrl('');
    setRaridade('');
    setApiSearchTerm('');
    setApiResults([]);
    onClose();
  };

  return (
    <SystemModal onClose={onClose} maxWidth="640px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Novo Item</span>
          <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0 }}>Cadastrar Novo Produto</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal de cadastro"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isLight
            ? 'rgba(0, 0, 0, 0.06)'
            : 'rgba(255, 255, 255, 0.08)')
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface-container-low)',
            border: '1px solid var(--card-border)',
          }}
        >
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: tones.activeTabText }}>
            Preencher Automaticamente com Carta Oficial (Acervo Global)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="system-input"
              value={apiSearchTerm}
              onChange={(e) => setApiSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchApiCards();
                }
              }}
              placeholder="Digite o nome da carta (ex: Charizard, Sol Ring, Blue-Eyes)..."
            />
            <button
              type="button"
              onClick={handleSearchApiCards}
              disabled={isSearchingApi}
              className="btn-outline"
              style={{ padding: '0 14px', whiteSpace: 'nowrap', fontSize: '12px' }}
            >
              <Search size={14} />
              <span>{isSearchingApi ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </div>
          {apiResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', maxHeight: '160px', overflowY: 'auto' }}>
              {apiResults.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => handleSelectApiCard(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--color-on-surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {c.nome} <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>({c.jogoNome} • {c.colecao})</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: tones.activeTabText, whiteSpace: 'nowrap', fontWeight: 700 }}>
                    {c.precoMercadoBrl > 0 ? `R$ ${formatBRL(c.precoMercadoBrl)}` : 'Sob consulta'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            Nome do Produto *
          </label>
          <input
            type="text"
            required
            className="system-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Booster Box Pokémon Escarlate e Violeta"
          />
        </div>

        <div className="system-form-grid">
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Card Game
            </label>
            <SystemSelect<GameId>
              value={jogo}
              onChange={(val) => setJogo(val)}
              options={gameOptions}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Categoria
            </label>
            <SystemSelect<ProductCategory>
              value={categoria}
              onChange={(val) => setCategoria(val)}
              options={categoryOptions}
            />
          </div>
        </div>

        <div className="system-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Preço Unitário (R$) *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-on-surface-variant)',
                  pointerEvents: 'none',
                }}
              >
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                className="system-input"
                value={preco}
                onChange={(e) => setPreco(formatMoneyInput(e.target.value))}
                placeholder="0,00"
                style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Estoque Inicial *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
              placeholder="10"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
              Estoque Mínimo *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
              placeholder="3"
              title="Limite para alerta de estoque baixo"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            Subtítulo / Tagline
          </label>
          <input
            type="text"
            className="system-input"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Ex: Booster Box • Edição Especial"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            URL da Imagem do Produto
          </label>
          <input
            type="text"
            className="system-input"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
            placeholder="https://exemplo.com/imagem.png (opcional)"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
            Descrição do Produto
          </label>
          <textarea
            rows={3}
            className="system-input"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes, conteúdo da embalagem e conservação..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="system-modal-actions" style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 18px',
                backgroundColor: 'transparent',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-on-surface)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-outline)';
                e.currentTarget.style.backgroundColor = isLight
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '11px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <Plus size={15} /> Cadastrar Produto
            </button>
          </div>
        </div>
      </form>
    </SystemModal>
  );
};

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    orders,
    products,
    updateProductStock,
    setProductStockExact,
    editProduct,
    deleteProduct,
    reactivateProduct,
    removeProductPermanently,
    showToastConfirm,
    addProduct,
    updateOrderStatus,
    setCurrentTab,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useApp();

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const tones = getSemanticTones(isLight);

  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);

  const isStaffOrAdmin = currentUser.role === 'funcionario' || currentUser.role === 'admin';
  const visibleOrders = isStaffOrAdmin
    ? orders
    : orders.filter(
      (o) => o.cliente_email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()
    );

  // Redireciona diretamente para o Portal /admin quando o usuário for administrador
  useEffect(() => {
    if (currentUser.role === 'admin') {
      setCurrentTab('admin');
    }
  }, [currentUser.role, setCurrentTab]);

  if (currentUser.role === 'admin') {
    return null;
  }

  const handlePermanentDelete = (prod: Product) => {
    showToastConfirm({
      message: `Deseja realmente excluir permanentemente o produto "${prod.nome}"? Esta ação removerá o produto do catálogo e não poderá ser desfeita.`,
      confirmText: 'Excluir definitivamente',
      cancelText: 'Cancelar',
      onConfirm: () => {
        removeProductPermanently(prod.id);
      },
    });
  };

  if (!currentUser.email || currentUser.id === 0) {
    return (
      <div style={{ paddingTop: '80px', paddingBottom: '100px' }}>
        <div className="app-container" style={{ maxWidth: '520px' }}>
          <div
            className="glass-panel"
            style={{
              padding: '48px 36px',
              textAlign: 'center',
              borderRadius: 'var(--radius-xl)',
              boxShadow: isLight ? '0 12px 28px rgba(0, 0, 0, 0.08)' : '0 20px 40px var(--shadow-color)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: tones.activeTabBg,
                border: `1px solid ${tones.activeTabBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Shield size={32} color={tones.activeTabText} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: 'var(--color-headline)' }}>
              Acesso Restrito ao Painel
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
              Você precisa estar conectado à sua conta para acessar o painel e acompanhar seus pedidos ou administrar o estoque.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="btn-primary"
                style={{ padding: '12px 28px' }}
              >
                Fazer Login
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                className="btn-outline"
                style={{ padding: '12px 24px' }}
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="app-container">
        {/* Cabeçalho */}
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentUser.role === 'funcionario'
                      ? isLight ? '#c2410c' : '#FF9D00'
                      : isLight ? '#8F5A00' : '#FFC400',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: tones.activeTabText,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Perfil Ativo: {currentUser.role}
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-headline)' }}>
              Olá, {currentUser.nome}
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginTop: '4px' }}>
              {currentUser.email} • {currentUser.cargo || 'Membro Colecionador'}
            </p>
          </div>
        </div>

        {/* Abas */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '32px',
            borderBottom: '1px solid var(--nav-border)',
            paddingBottom: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'orders' ? `1px solid ${tones.activeTabBorder}` : '1px solid transparent',
              backgroundColor: activeTab === 'orders' ? tones.activeTabBg : 'transparent',
              color: activeTab === 'orders' ? tones.activeTabText : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {isStaffOrAdmin ? 'Todos os Pedidos' : 'Meus Pedidos'} ({visibleOrders.length})
          </button>

          {isStaffOrAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: activeTab === 'inventory' ? `1px solid ${tones.activeTabBorder}` : '1px solid transparent',
                  backgroundColor: activeTab === 'inventory' ? tones.activeTabBg : 'transparent',
                  color: activeTab === 'inventory' ? tones.activeTabText : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Gerenciar Estoque ({products.length})
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('product-control')}
                className="btn-primary"
                style={{
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Boxes size={14} /> Abrir Controle 2.0
              </button>
            </>
          )}
        </div>

        {/* Pedidos */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {visibleOrders.length === 0 ? (
              <div
                style={{
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-surface-container)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <p style={{ color: 'var(--color-on-surface-variant)' }}>
                  Nenhum pedido realizado ainda.
                </p>
              </div>
            ) : (
              visibleOrders.map((order) => {
                const customerBadgeStyle = getOrderStatusStyle(order.status, tones, isLight);
                const orderLabel = order.numero || order.id_pedido;
                return (
                  <div
                    key={order.id_pedido}
                    className="glass-panel"
                    style={{
                      padding: '24px',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        borderBottom: '1px solid var(--card-border)',
                        paddingBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--color-headline)',
                            marginRight: '4px',
                          }}
                        >
                          Pedido #{orderLabel}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                          {order.data} • Cliente: {order.cliente_nome}
                        </span>
                        {order.codigo_rastreio && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: tones.infoBg,
                              border: `1px solid ${tones.infoBorder}`,
                              color: tones.infoText,
                              fontWeight: 600,
                            }}
                          >
                            Rastreio: {order.codigo_rastreio}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isStaffOrAdmin ? (
                          <OrderStatusDropdown
                            currentStatus={order.status}
                            tones={tones}
                            isLight={isLight}
                            onStatusChange={(newStatus) => {
                              if (newStatus === 'Cancelado') {
                                showToastConfirm({
                                  message: `Deseja realmente cancelar o pedido #${orderLabel}?`,
                                  confirmText: 'Cancelar Pedido',
                                  cancelText: 'Manter',
                                  onConfirm: () => updateOrderStatus(order.id_pedido, 'Cancelado'),
                                });
                                return;
                              }
                              updateOrderStatus(order.id_pedido, newStatus);
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: customerBadgeStyle.bg,
                              color: customerBadgeStyle.text,
                              border: `1px solid ${customerBadgeStyle.border}`,
                              textTransform: 'uppercase',
                            }}
                          >
                            {order.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {order.itens.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: tones.activeTabText, fontWeight: 700 }}>
                              {item.quantidade}x
                            </span>
                            <span>{item.produto.nome}</span>
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--color-on-surface-variant)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              ({item.produto.jogoNome})
                            </span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', color: tones.activeTabText, fontWeight: 600 }}>
                            R$ {formatBRL(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'baseline',
                        gap: '12px',
                        borderTop: '1px dashed var(--card-border)',
                        paddingTop: '12px',
                      }}
                    >
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>
                        Valor Total:
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '20px',
                          fontWeight: 700,
                          color: tones.activeTabText,
                        }}
                      >
                        R$ {formatBRL(order.valor_total)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Estoque */}
        {isStaffOrAdmin && activeTab === 'inventory' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', marginBottom: '4px' }}>
                  Gerenciamento de Estoque & Produtos
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                  Ajuste quantidades livremente, controle níveis de estoque e edite produtos do catálogo.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '190px' }}>
                  <SystemSelect<'all' | 'active' | 'inactive'>
                    value={productStatusFilter}
                    onChange={(val) => setProductStatusFilter(val)}
                    options={[
                      { value: 'all', label: `Todos (${products.length})` },
                      { value: 'active', label: `Ativos (${products.filter((p) => p.ativo !== false).length})` },
                      { value: 'inactive', label: `Inativos (${products.filter((p) => p.ativo === false).length})` },
                    ]}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsCreateProductModalOpen(true)}
                  style={{
                    padding: '8px 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={15} /> Cadastrar Novo Produto
                </button>
              </div>
            </div>

            {(() => {
              const displayedProducts = products.filter((p) => {
                if (productStatusFilter === 'active') return p.ativo !== false;
                if (productStatusFilter === 'inactive') return p.ativo === false;
                return true;
              });

              if (displayedProducts.length === 0) {
                return (
                  <div
                    className="glass-panel"
                    style={{
                      padding: '48px 24px',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    <p style={{ fontSize: '15px', margin: 0 }}>
                      Nenhum produto encontrado para o filtro "{productStatusFilter === 'inactive' ? 'Inativos' : productStatusFilter === 'active' ? 'Ativos' : 'Todos'}".
                    </p>
                  </div>
                );
              }

              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {displayedProducts.map((p) => (
                    <StockItemCard
                      key={p.id}
                      product={p}
                      isStaffOrAdmin={isStaffOrAdmin}
                      onEdit={(prod) => setEditingProduct(prod)}
                      onUpdateStockDelta={(id, delta) => updateProductStock(id, delta)}
                      onSetStockExact={(id, exact) => setProductStockExact(id, exact)}
                      onPermanentDelete={handlePermanentDelete}
                      tones={tones}
                      isLight={isLight}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}


        {/* Modal de Cadastro de Produto */}
        <CreateProductModal
          isOpen={isCreateProductModalOpen}
          onClose={() => setIsCreateProductModalOpen(false)}
          onCreate={addProduct}
        />

        {/* Modal de Edição de Produto (CRUD) */}
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={(updated) => editProduct(editingProduct.id, updated)}
            onDelete={(id) => deleteProduct(id)}
            onReactivate={(id) => reactivateProduct(id)}
            onPermanentDelete={(id) => removeProductPermanently(id)}
          />
        )}
      </div>
    </div>
  );
};
