import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Package,
  Plus,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
  Edit,
  Eye,
  Download,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  LayoutGrid,
  List,
  Globe,
  History,
  Percent,
} from 'lucide-react';
import type {
  Product,
  GameId,
  ProductCategory,
  ExternalCard,
  ActiveGameApi,
} from '../types';
import { SystemSelect } from '../components/SystemSelect';
import { SystemModal } from '../components/SystemModal';
import { searchLiveCards, getPokemonSets, type PokemonSetOption } from '../services/tcgApi';

const GAME_OPTIONS: { value: GameId; label: string; badge: string; color: string }[] = [
  { value: 'pokemon', label: 'Pokémon TCG', badge: 'POKÉMON', color: '#ffcb05' },
  { value: 'magic', label: 'Magic: The Gathering', badge: 'MTG', color: '#f97316' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!', badge: 'YGO', color: '#a855f7' },
  { value: 'onepiece', label: 'One Piece Card Game', badge: 'OP', color: '#ef4444' },
  { value: 'outros', label: 'Acessórios / Geral', badge: 'GERAL', color: '#38bdf8' },
];

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'Carta Avulsa', label: 'Carta Avulsa' },
  { value: 'Booster Box', label: 'Booster Box' },
  { value: 'Booster Pack', label: 'Booster Pack' },
  { value: 'Deck Commander', label: 'Deck Commander' },
  { value: 'Starter Deck', label: 'Starter Deck' },
  { value: 'Acessórios', label: 'Acessórios & Sleeves' },
];

export const formatBRL = (value: number | null | undefined): string => {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatMoneyInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const number = Number(digits) / 100;
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parseMoneyToFloat = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  if (!value) return 0;
  const clean = String(value).replace(/\./g, '').replace(',', '.');
  return Math.round((parseFloat(clean) || 0) * 100) / 100;
};

// ============================================================================
// COMPONENTE: CARD HOLOGRÁFICO 3D (INTERAÇÃO PURA CSS 3D + REFLEXO FOIL)
// ============================================================================
interface HolographicTiltCardProps {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onInspect: () => void;
  onEdit: () => void;
  onStockChange: (delta: number, e: React.MouseEvent) => void;
  isStaffOrAdmin: boolean;
}

const HolographicTiltCard: React.FC<HolographicTiltCardProps> = ({
  product,
  isSelected,
  onToggleSelect,
  onInspect,
  onEdit,
  onStockChange,
  isStaffOrAdmin,
}) => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number; gx: number; gy: number; active: boolean }>({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 50,
    active: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (y - 0.5) * -14;
    const ry = (x - 0.5) * 14;
    setTilt({
      rx,
      ry,
      gx: x * 100,
      gy: y * 100,
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  };

  const isOutOfStock = product.estoque <= 0;
  const isCriticalStock = product.estoque > 0 && product.estoque <= (product.estoqueMinimo ?? 3);
  const isInactive = product.ativo === false;
  const isSealedBox = product.categoria === 'Booster Box';

  const gameOption = GAME_OPTIONS.find((g) => g.value === product.jogo);
  const gameBadgeColor = gameOption?.color || '#a855f7';

  return (
    <div
      className={`holo-3d-card ${isSelected ? 'selected' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onInspect}
      style={{
        transform: tilt.active
          ? `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(1.025, 1.025, 1.025)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: tilt.active ? 'transform 0.08s ease-out' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isInactive ? 0.6 : 1,
        filter: isInactive ? 'grayscale(0.65)' : 'none',
        cursor: 'pointer',
        backgroundColor: 'var(--card-bg, #13101c)',
        border: isSelected
          ? '2px solid var(--color-primary)'
          : isCriticalStock
            ? '1px solid rgba(251, 191, 36, 0.5)'
            : isOutOfStock
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : '1px solid var(--card-border)',
        borderRadius: '16px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        maxWidth: isSealedBox ? '280px' : '230px',
        width: '100%',
        margin: '0 auto',
        boxShadow: tilt.active
          ? '0 18px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(168, 85, 247, 0.2)'
          : '0 4px 14px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Glare foil overlay */}
      <div
        className="holo-glare-overlay"
        style={{
          opacity: tilt.active ? 1 : 0,
          background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 35%, transparent 70%), linear-gradient(${tilt.ry * 8 + 135}deg, rgba(255,0,128,0.25) 0%, rgba(0,255,255,0.2) 50%, rgba(255,215,0,0.25) 100%)`,
        }}
      />

      {/* Top Header do Card: Checkbox + Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', zIndex: 6 }}>
        <button
          type="button"
          onClick={onToggleSelect}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: isSelected ? 'var(--color-primary)' : 'var(--color-outline)',
            display: 'flex',
            alignItems: 'center',
          }}
          title={isSelected ? 'Desmarcar' : 'Selecionar'}
        >
          {isSelected ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
        </button>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: `${gameBadgeColor}20`,
              color: gameBadgeColor,
              border: `1px solid ${gameBadgeColor}40`,
            }}
          >
            {gameOption?.badge || product.jogo}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-surface-container-high)',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            {product.categoria || 'Carta Avulsa'}
          </span>
        </div>
      </div>

      {/* Arte Centralizada com Reflexo */}
      <div
        style={{
          width: '100%',
          height: isSealedBox ? '180px' : '245px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          marginBottom: '12px',
          borderRadius: '12px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(0,0,0,0.25) 100%)',
          overflow: 'hidden',
          zIndex: 6,
          padding: '4px',
        }}
      >
        <img
          src={product.imagemUrl}
          alt={product.nome}
          style={{
            height: '100%',
            maxHeight: isSealedBox ? '165px' : '235px',
            maxWidth: '100%',
            width: 'auto',
            objectFit: 'contain',
            borderRadius: '6px',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
            transform: tilt.active ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 0.2s ease-out',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&auto=format&fit=crop&q=60';
          }}
        />

        {/* Badge de Raridade */}
        {product.raridade && (
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              fontSize: '9.5px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#facc15',
              backdropFilter: 'blur(4px)',
            }}
          >
            ★ {product.raridade}
          </span>
        )}
      </div>

      {/* Info do Produto */}
      <div style={{ flex: 1, zIndex: 6 }}>
        <h3
          style={{
            margin: '0 0 4px',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-headline)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={product.nome}
        >
          {product.nome}
        </h3>
        <p
          style={{
            margin: '0 0 12px',
            fontSize: '11px',
            color: 'var(--color-outline)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {product.subtitulo || 'Coleção Regular'}
        </p>

        {/* Preço e Estoque */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-surface-container-low)',
            marginBottom: '12px',
          }}
        >
          <div>
            <span style={{ fontSize: '10px', color: 'var(--color-outline)', display: 'block', textTransform: 'uppercase' }}>
              Preço
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              R$ {formatBRL(product.preco)}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-outline)', display: 'block', textTransform: 'uppercase' }}>
              Estoque
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: isOutOfStock ? '#f87171' : isCriticalStock ? '#fbbf24' : '#4ade80',
              }}
            >
              {product.estoque} un.
            </span>
          </div>
        </div>

        {/* Quick Stepper + Ações */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          {isStaffOrAdmin && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--color-surface-container-high)',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid var(--card-border)',
              }}
            >
              <button
                type="button"
                onClick={(e) => onStockChange(-1, e)}
                disabled={product.estoque <= 0}
                style={{
                  width: '26px',
                  height: '26px',
                  border: 'none',
                  background: 'none',
                  cursor: product.estoque <= 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: 'var(--color-on-surface-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                }}
                title="Diminuir 1 un."
              >
                -
              </button>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '0 6px' }}>
                {product.estoque}
              </span>
              <button
                type="button"
                onClick={(e) => onStockChange(1, e)}
                style={{
                  width: '26px',
                  height: '26px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: 'var(--color-on-surface-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                }}
                title="Aumentar 1 un."
              >
                +
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onInspect}
            className="btn-outline"
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              borderRadius: '8px',
            }}
          >
            <Eye size={12} /> Ficha
          </button>

          {isStaffOrAdmin && (
            <button
              type="button"
              onClick={onEdit}
              className="btn-primary"
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
              }}
              title="Editar Produto"
            >
              <Edit size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: DRAWER LATERAL DE INSPEÇÃO RÁPIDA (SLIDE-OVER MASTER-DETAIL)
// ============================================================================
interface SideInspectorDrawerProps {
  product: Product | null;
  onClose: () => void;
  onOpenFullEdit: (product: Product) => void;
  onOpenFullDetail: (product: Product) => void;
  onStockChange: (product: Product, delta: number) => Promise<void>;
  onPriceChange: (product: Product, newPrice: number) => Promise<void>;
  onToggleActive: (product: Product) => Promise<void>;
  stockMovements: any[];
  isStaffOrAdmin: boolean;
}

const SideInspectorDrawer: React.FC<SideInspectorDrawerProps> = ({
  product,
  onClose,
  onOpenFullEdit,
  onOpenFullDetail,
  onStockChange,
  onPriceChange,
  onToggleActive,
  stockMovements,
  isStaffOrAdmin,
}) => {
  if (!product) return null;

  const [priceInput, setPriceInput] = useState(formatMoneyInput(product.preco));

  // Sincroniza o preço digitado caso o produto selecionado mude
  React.useEffect(() => {
    setPriceInput(formatMoneyInput(product.preco));
  }, [product.id, product.preco]);

  const currentDraftPrice = parseMoneyToFloat(priceInput);
  const hasPriceChange = currentDraftPrice > 0 && Math.abs(currentDraftPrice - product.preco) > 0.009;
  const percentDiff = product.preco > 0
    ? Math.round(((currentDraftPrice - product.preco) / product.preco) * 100)
    : 0;

  const isOutOfStock = product.estoque <= 0;
  const isCriticalStock = product.estoque > 0 && product.estoque <= (product.estoqueMinimo ?? 3);
  const isInactive = product.ativo === false;
  const isSealedBox = product.categoria === 'Booster Box';
  const gameOption = GAME_OPTIONS.find((g) => g.value === product.jogo);

  const productMovements = useMemo(() => {
    return stockMovements
      .filter((m) => m.produto_id === product.id)
      .slice(0, 5);
  }, [stockMovements, product.id]);

  const handleApplyPrice = async () => {
    const val = parseMoneyToFloat(priceInput);
    if (val > 0 && val !== product.preco) {
      await onPriceChange(product, val);
    }
  };

  const handleQuickPercent = (pct: number) => {
    const factor = 1 + pct / 100;
    const newPrice = Math.max(0.1, Math.round(product.preco * factor * 100) / 100);
    // Apenas calcula o valor no input de rascunho sem salvar imediatamente
    setPriceInput(formatMoneyInput(newPrice));
  };

  return (
    <div className="side-inspector-overlay" onClick={onClose}>
      <div className="side-inspector-pane" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'inherit',
            backdropFilter: 'blur(16px)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                color: 'var(--color-primary)',
              }}
            >
              #{product.id}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: isInactive
                  ? 'rgba(148, 163, 184, 0.2)'
                  : isOutOfStock
                    ? 'rgba(239, 68, 68, 0.15)'
                    : isCriticalStock
                      ? 'rgba(251, 191, 36, 0.15)'
                      : 'rgba(34, 197, 94, 0.15)',
                color: isInactive
                  ? '#94a3b8'
                  : isOutOfStock
                    ? '#f87171'
                    : isCriticalStock
                      ? '#fbbf24'
                      : '#4ade80',
              }}
            >
              {isInactive ? 'Inativo' : isOutOfStock ? 'Zerado' : isCriticalStock ? 'Estoque Crítico' : 'Ativo & Disponível'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-outline)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Showcase Proporcional Colecionável TCG (Slab / Toploader) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '4px 0',
            }}
          >
            {/* Moldura Proporcional do Card / Produto (sem faixas vazias nas laterais) */}
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                borderRadius: '16px',
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0,0,0,0.35) 100%)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 16px 36px -10px rgba(0,0,0,0.55), 0 0 20px rgba(168, 85, 247, 0.15)',
                maxWidth: isSealedBox ? '340px' : '230px',
                width: 'fit-content',
                margin: '0 auto',
              }}
            >
              <img
                src={product.imagemUrl}
                alt={product.nome}
                style={{
                  height: isSealedBox ? '190px' : '290px',
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
                  borderRadius: isSealedBox ? '8px' : '10px',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&auto=format&fit=crop&q=60';
                }}
              />
            </div>

            {/* Identificação Abaixo do Card */}
            <div style={{ marginTop: '14px', textAlign: 'center', width: '100%' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--color-headline)' }}>
                {product.nome}
              </h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-outline)' }}>
                {product.subtitulo || 'Coleção Regular'}
              </p>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--color-surface-container-low)', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>Jogo TCG</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: gameOption?.color || 'var(--color-headline)' }}>
                {gameOption?.label || product.jogo}
              </span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--color-surface-container-low)', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>Categoria</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-headline)' }}>
                {product.categoria || 'Carta Avulsa'}
              </span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--color-surface-container-low)', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>Raridade</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#facc15' }}>
                {product.raridade || 'Comum'}
              </span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--color-surface-container-low)', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>Estoque Mínimo</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-headline)', fontFamily: 'var(--font-mono)' }}>
                {product.estoqueMinimo ?? 3} un.
              </span>
            </div>
          </div>

          {/* Controle Rápido de Estoque (Stepper -5, -1, +1, +5) */}
          {isStaffOrAdmin && (
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: 'var(--color-surface-container-low)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-headline)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={14} color="var(--color-primary)" /> Estoque em Tempo Real
                </span>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: isOutOfStock ? '#f87171' : isCriticalStock ? '#fbbf24' : '#4ade80',
                  }}
                >
                  {product.estoque} un.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => onStockChange(product, -5)}
                  disabled={product.estoque < 5}
                  className="btn-outline"
                  style={{ padding: '8px 0', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => onStockChange(product, -1)}
                  disabled={product.estoque <= 0}
                  className="btn-outline"
                  style={{ padding: '8px 0', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => onStockChange(product, 1)}
                  className="btn-outline"
                  style={{ padding: '8px 0', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => onStockChange(product, 5)}
                  className="btn-outline"
                  style={{ padding: '8px 0', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                >
                  +5
                </button>
              </div>
            </div>
          )}

          {/* Controle Rápido de Preço & Ajustes Percentuais */}
          {isStaffOrAdmin && (
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: 'var(--color-surface-container-low)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-headline)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color="var(--color-primary)" /> Precificação Rápida
                </span>

                <div style={{ textAlign: 'right' }}>
                  {hasPriceChange ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                        R$ {formatBRL(product.preco)}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>➔</span>
                      <span style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: percentDiff < 0 ? '#4ade80' : 'var(--color-primary)' }}>
                        R$ {formatBRL(currentDraftPrice)}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                      R$ {formatBRL(product.preco)}
                    </span>
                  )}
                </div>
              </div>

              {/* Botões de Percentual Rápido */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickPercent(-10)}
                  className="btn-outline"
                  style={{
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: percentDiff === -10 ? 'rgba(74, 222, 128, 0.15)' : undefined,
                    borderColor: percentDiff === -10 ? '#4ade80' : undefined,
                    color: percentDiff === -10 ? '#4ade80' : undefined,
                  }}
                  title="Calcular desconto de 10%"
                >
                  -10%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPercent(-5)}
                  className="btn-outline"
                  style={{
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: percentDiff === -5 ? 'rgba(74, 222, 128, 0.15)' : undefined,
                    borderColor: percentDiff === -5 ? '#4ade80' : undefined,
                    color: percentDiff === -5 ? '#4ade80' : undefined,
                  }}
                  title="Calcular desconto de 5%"
                >
                  -5%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPercent(5)}
                  className="btn-outline"
                  style={{
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: percentDiff === 5 ? 'rgba(168, 85, 247, 0.15)' : undefined,
                    borderColor: percentDiff === 5 ? 'var(--color-primary)' : undefined,
                    color: percentDiff === 5 ? 'var(--color-primary)' : undefined,
                  }}
                  title="Calcular aumento de 5%"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPercent(10)}
                  className="btn-outline"
                  style={{
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: percentDiff === 10 ? 'rgba(168, 85, 247, 0.15)' : undefined,
                    borderColor: percentDiff === 10 ? 'var(--color-primary)' : undefined,
                    color: percentDiff === 10 ? 'var(--color-primary)' : undefined,
                  }}
                  title="Calcular aumento de 10%"
                >
                  +10%
                </button>
              </div>

              {/* Banner Avisando Promoção / Alteração Pendente */}
              {hasPriceChange && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: percentDiff < 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                    border: percentDiff < 0 ? '1px solid rgba(74, 222, 128, 0.35)' : '1px solid rgba(168, 85, 247, 0.35)',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: percentDiff < 0 ? '#4ade80' : 'var(--color-primary)',
                        color: percentDiff < 0 ? '#000' : '#fff',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {percentDiff < 0 ? `🔥 PROMOÇÃO ${Math.abs(percentDiff)}% OFF` : `📈 REAJUSTE +${percentDiff}%`}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-headline)', fontWeight: 600 }}>
                      (Aguardando Salvar)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPriceInput(formatMoneyInput(product.preco))}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: 'var(--color-outline)',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                    title="Descartar alteração e voltar ao preço original"
                  >
                    Desfazer
                  </button>
                </div>
              )}

              {/* Edição Manual de Preço e Botão Salvar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--color-outline)' }}>
                    R$
                  </span>
                  <input
                    type="text"
                    value={priceInput}
                    onChange={(e) => setPriceInput(formatMoneyInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyPrice();
                    }}
                    className="system-input"
                    style={{ paddingLeft: '32px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                    placeholder="0,00"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPrice}
                  className="btn-primary"
                  disabled={!hasPriceChange}
                  style={{
                    padding: '0 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    opacity: hasPriceChange ? 1 : 0.6,
                    cursor: hasPriceChange ? 'pointer' : 'default',
                  }}
                  title={hasPriceChange ? 'Clique para confirmar e salvar o novo preço' : 'Nenhuma alteração de preço'}
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          {/* Ativação / Inativação Rápida */}
          {isStaffOrAdmin && (
            <button
              type="button"
              onClick={() => onToggleActive(product)}
              className={isInactive ? 'btn-primary' : 'btn-outline'}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderColor: isInactive ? undefined : 'rgba(239, 68, 68, 0.4)',
                color: isInactive ? undefined : '#f87171',
              }}
            >
              <RotateCcw size={14} />
              {isInactive ? 'Reativar Produto para Loja' : 'Inativar Produto (Ocultar da Loja)'}
            </button>
          )}

          {/* Histórico Recente de Estoque */}
          {productMovements.length > 0 && (
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-outline)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <History size={13} /> Últimas Movimentações
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {productMovements.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-surface-container-low)',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--color-headline)' }}>
                        {m.tipo === 'entrada' ? '+' : '-'}{Math.abs(m.quantidade)} un.
                      </span>
                      <span style={{ color: 'var(--color-outline)', marginLeft: '8px' }}>
                        {m.motivo || 'Ajuste manual'}
                      </span>
                    </div>
                    <span style={{ color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(m.created_at || Date.now()).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            gap: '10px',
            position: 'sticky',
            bottom: 0,
            background: 'inherit',
            backdropFilter: 'blur(16px)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullDetail(product);
            }}
            className="btn-outline"
            style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Eye size={14} /> Ficha Completa
          </button>

          {isStaffOrAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullEdit(product);
              }}
              className="btn-primary"
              style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Edit size={14} /> Editar Tudo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProductControlPage: React.FC = () => {
  const {
    products,
    addProduct,
    editProduct,
    deleteProduct,
    reactivateProduct,
    removeProductPermanently,
    updateProductStock,
    stockMovements,
    showToast,
    showToastConfirm,
    currentUser,
  } = useApp();

  // Permissões
  const isStaffOrAdmin = currentUser.role === 'admin' || currentUser.role === 'funcionario';

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<GameId | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'critical' | 'out-of-stock' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'id-desc'>('id-desc');

  // Modo de exibição: Tabela ERP ou Grid de Cards HD
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Seleção múltipla para ações em lote
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  // Edição inline rápida (ID do produto em edição de preço)
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>('');

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLiveImportModalOpen, setIsLiveImportModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Derivações e Contadores
  const activeProducts = useMemo(() => products.filter((p) => p.ativo !== false), [products]);
  const inactiveProducts = useMemo(() => products.filter((p) => p.ativo === false), [products]);
  const produtosCriticos = useMemo(() => activeProducts.filter((p) => p.estoque > 0 && p.estoque <= (p.estoqueMinimo ?? 3)), [activeProducts]);
  const produtosEsgotados = useMemo(() => activeProducts.filter((p) => p.estoque <= 0), [activeProducts]);
  const valorTotalEstoque = useMemo(() => activeProducts.reduce((sum, p) => sum + (p.estoque * p.preco), 0), [activeProducts]);
  const totalUnidadesEstoque = useMemo(() => activeProducts.reduce((sum, p) => sum + (p.estoque || 0), 0), [activeProducts]);

  // Lista Filtrada e Ordenada
  const filteredProducts = useMemo(() => {
    let list = products;

    if (statusFilter === 'active') {
      list = activeProducts;
    } else if (statusFilter === 'critical') {
      list = produtosCriticos;
    } else if (statusFilter === 'out-of-stock') {
      list = produtosEsgotados;
    } else if (statusFilter === 'inactive') {
      list = inactiveProducts;
    }

    if (gameFilter !== 'all') {
      list = list.filter((p) => p.jogo === gameFilter);
    }

    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.categoria === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.id.toString().includes(q) ||
          (p.subtitulo && p.subtitulo.toLowerCase().includes(q)) ||
          (p.categoria && p.categoria.toLowerCase().includes(q)) ||
          (p.raridade && p.raridade.toLowerCase().includes(q))
      );
    }

    // Ordenação
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.nome.localeCompare(b.nome);
        case 'name-desc':
          return b.nome.localeCompare(a.nome);
        case 'price-asc':
          return a.preco - b.preco;
        case 'price-desc':
          return b.preco - a.preco;
        case 'stock-asc':
          return a.estoque - b.estoque;
        case 'stock-desc':
          return b.estoque - a.estoque;
        case 'id-desc':
        default:
          return b.id - a.id;
      }
    });
  }, [
    products,
    activeProducts,
    inactiveProducts,
    produtosCriticos,
    produtosEsgotados,
    statusFilter,
    gameFilter,
    categoryFilter,
    searchQuery,
    sortBy,
  ]);

  // Controle de Seleção em Lote
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Ações em Lote
  const handleBulkInactivate = () => {
    if (selectedProductIds.length === 0) return;
    showToastConfirm({
      message: `Deseja inativar ${selectedProductIds.length} produto(s) selecionado(s)? Eles serão ocultados da loja pública.`,
      confirmText: 'Inativar Selecionados',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        for (const id of selectedProductIds) {
          await deleteProduct(id);
        }
        setSelectedProductIds([]);
        showToast(`${selectedProductIds.length} produtos foram inativados.`);
      },
    });
  };

  const handleBulkReactivate = () => {
    if (selectedProductIds.length === 0) return;
    showToastConfirm({
      message: `Deseja reativar ${selectedProductIds.length} produto(s) selecionado(s)? Eles voltarão a ficar disponíveis na loja.`,
      confirmText: 'Reativar Selecionados',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        for (const id of selectedProductIds) {
          await reactivateProduct(id);
        }
        setSelectedProductIds([]);
        showToast(`${selectedProductIds.length} produtos foram reativados.`);
      },
    });
  };

  const handleExportCSV = () => {
    const itemsToExport = selectedProductIds.length > 0
      ? products.filter((p) => selectedProductIds.includes(p.id))
      : filteredProducts;

    if (itemsToExport.length === 0) {
      showToast('Nenhum produto para exportar.');
      return;
    }

    const headers = ['ID', 'Nome', 'Jogo', 'Categoria', 'Subtítulo', 'Preço (R$)', 'Estoque', 'Estoque Mínimo', 'Status', 'Raridade'];
    const rows = itemsToExport.map((p) => [
      p.id,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${p.jogoNome || p.jogo}"`,
      `"${p.categoria || ''}"`,
      `"${(p.subtitulo || '').replace(/"/g, '""')}"`,
      p.preco.toFixed(2),
      p.estoque,
      p.estoqueMinimo ?? 3,
      p.ativo === false ? 'INATIVO' : 'ATIVO',
      `"${p.raridade || 'Comum'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_nobledeck_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Relatório CSV com ${itemsToExport.length} produto(s) exportado com sucesso!`);
  };

  // Inspector Lateral Master-Detail
  const [inspectorProduct, setInspectorProduct] = useState<Product | null>(null);

  // Contagem dinâmica por jogo TCG
  const gameCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
      pokemon: 0,
      magic: 0,
      yugioh: 0,
      onepiece: 0,
      outros: 0,
    };
    products.forEach((p) => {
      if (counts[p.jogo] !== undefined) {
        counts[p.jogo]++;
      } else {
        counts.outros++;
      }
    });
    return counts;
  }, [products]);

  // Edição rápida de estoque (+1, -1 ou delta customizado)
  const handleQuickStock = async (product: Product, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStock = Math.max(0, product.estoque + delta);
    if (newStock === product.estoque) return;
    await updateProductStock(product.id, delta);
    if (inspectorProduct && inspectorProduct.id === product.id) {
      setInspectorProduct({ ...inspectorProduct, estoque: newStock });
    }
    showToast(`Estoque de "${product.nome}" atualizado: ${newStock} un.`);
  };

  // Edição rápida de preço
  const handleQuickPriceChange = async (product: Product, newPrice: number) => {
    await editProduct(product.id, { preco: newPrice });
    if (inspectorProduct && inspectorProduct.id === product.id) {
      setInspectorProduct({ ...inspectorProduct, preco: newPrice });
    }
    showToast(`Preço de "${product.nome}" atualizado: R$ ${formatBRL(newPrice)}`);
  };

  // Ativação / Inativação rápida
  const handleToggleActive = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product.ativo === false) {
      await reactivateProduct(product.id);
      if (inspectorProduct && inspectorProduct.id === product.id) {
        setInspectorProduct({ ...inspectorProduct, ativo: true });
      }
      showToast(`Produto "${product.nome}" reativado na loja.`);
    } else {
      await deleteProduct(product.id);
      if (inspectorProduct && inspectorProduct.id === product.id) {
        setInspectorProduct({ ...inspectorProduct, ativo: false });
      }
      showToast(`Produto "${product.nome}" inativado.`);
    }
  };

  // Edição rápida de preço inline na tabela
  const handleStartEditPrice = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPriceId(product.id);
    setInlinePriceInput(formatMoneyInput(product.preco));
  };

  const handleSaveInlinePrice = async (productId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newPrice = parseMoneyToFloat(inlinePriceInput);
    if (newPrice > 0) {
      await editProduct(productId, { preco: newPrice });
      if (inspectorProduct && inspectorProduct.id === productId) {
        setInspectorProduct({ ...inspectorProduct, preco: newPrice });
      }
      showToast(`Preço atualizado para R$ ${formatBRL(newPrice)}`);
    }
    setEditingPriceId(null);
  };

  return (
    <div className="workstation-canvas">
      {/* =========================================================================
          BARRA DE COMANDO DA WORKSTATION 2.0 (FULL WIDTH GLASS COMMAND BAR)
         ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 28px',
          borderRadius: '20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Linha Superior: Título + Ações Primárias */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>
                {currentUser.role === 'admin' ? 'Painel de Administrador' : 'Painel de Funcionário'}
              </span>
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--color-headline)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Controle Avançado de Produtos & Estoque
            </h1>
          </div>

          {/* Botões de Ação Primária */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setIsLiveImportModalOpen(true)}
              className="btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                borderRadius: '10px',
              }}
              title="Buscar e importar cards diretamente das bases mundiais oficiais"
            >
              <Globe size={15} color="var(--color-primary)" /> Catálogo Live
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                borderRadius: '10px',
              }}
              title="Exportar inventário filtrado em CSV"
            >
              <Download size={15} /> Exportar CSV
            </button>

            {isStaffOrAdmin && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  borderRadius: '10px',
                }}
              >
                <Plus size={16} /> Novo Produto Manual
              </button>
            )}
          </div>
        </div>

        {/* Linha Inferior: Telemetria Integrada Compacta (Elimina caixas desconexas) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            paddingTop: '14px',
            borderTop: '1px solid var(--card-border)',
          }}
        >
          {/* Ticker 1: Total */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-surface-container-low)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '10.5px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block' }}>
                Catálogo Total
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-headline)' }}>
                {products.length}{' '}
                <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>({activeProducts.length} ativos)</span>
              </span>
            </div>
            <Package size={20} color="var(--color-primary)" opacity={0.8} />
          </div>

          {/* Ticker 2: Patrimônio */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-surface-container-low)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '10.5px', color: 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block' }}>
                Patrimônio em Estoque
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                R$ {formatBRL(valorTotalEstoque)}{' '}
                <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontWeight: 600 }}>({totalUnidadesEstoque} un.)</span>
              </span>
            </div>
            <TrendingUp size={20} color="var(--color-primary)" opacity={0.8} />
          </div>

          {/* Ticker 3: Reposição Crítica */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: produtosCriticos.length > 0 ? 'rgba(251, 191, 36, 0.1)' : 'var(--color-surface-container-low)',
              border: produtosCriticos.length > 0 ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <span style={{ fontSize: '10.5px', color: produtosCriticos.length > 0 ? '#fbbf24' : 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block' }}>
                Reposição Crítica
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: produtosCriticos.length > 0 ? '#fbbf24' : 'var(--color-headline)' }}>
                {produtosCriticos.length} itens
              </span>
            </div>
            <AlertTriangle size={20} color={produtosCriticos.length > 0 ? '#fbbf24' : 'var(--color-outline)'} opacity={0.8} />
          </div>

          {/* Ticker 4: Zerados */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'out-of-stock' ? 'all' : 'out-of-stock')}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: produtosEsgotados.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface-container-low)',
              border: produtosEsgotados.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <span style={{ fontSize: '10.5px', color: produtosEsgotados.length > 0 ? '#f87171' : 'var(--color-outline)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block' }}>
                Produtos Zerados
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: produtosEsgotados.length > 0 ? '#f87171' : 'var(--color-headline)' }}>
                {produtosEsgotados.length} itens
              </span>
            </div>
            <X size={20} color={produtosEsgotados.length > 0 ? '#f87171' : 'var(--color-outline)'} opacity={0.8} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          TCG GAME HUB TABS (SELEÇÃO RÁPIDA DE CARD GAMES)
         ========================================================================= */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '6px',
          marginBottom: '16px',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => setGameFilter('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: gameFilter === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
            backgroundColor: gameFilter === 'all' ? 'rgba(168, 85, 247, 0.18)' : 'var(--card-bg, #13101c)',
            color: gameFilter === 'all' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Todos os TCGs</span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', opacity: 0.8 }}>({products.length})</span>
        </button>

        {GAME_OPTIONS.map((g) => {
          const isSelected = gameFilter === g.value;
          const count = gameCounts[g.value] || 0;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => setGameFilter(g.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: isSelected ? `1px solid ${g.color}` : '1px solid var(--card-border)',
                backgroundColor: isSelected ? `${g.color}25` : 'var(--card-bg, #13101c)',
                color: isSelected ? g.color : 'var(--color-on-surface-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: g.color }} />
              <span>{g.label}</span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', opacity: 0.8 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          OMNIBAR INTEGRADA: STATUS PILLS + SEARCH + FILTERS + VIEW SWITCHER
         ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'all', label: `Todos (${products.length})` },
              { id: 'active', label: `Ativos (${activeProducts.length})` },
              { id: 'critical', label: `Estoque Baixo (${produtosCriticos.length})` },
              { id: 'out-of-stock', label: `Esgotados (${produtosEsgotados.length})` },
              { id: 'inactive', label: `Inativos (${inactiveProducts.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: statusFilter === tab.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                  backgroundColor: statusFilter === tab.id ? 'rgba(168, 85, 247, 0.16)' : 'var(--color-surface-container-low)',
                  color: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alternador de Modo de Visualização */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--color-surface-container-low)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--card-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--color-on-surface-variant)',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} /> Tabela ERP
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--color-on-surface-variant)',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={14} /> Cards 3D Foil
            </button>
          </div>
        </div>

        {/* Linha 2: Omnisearch Input + Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {/* Busca por Texto */}
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-outline)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por card, coleção, ID..."
              className="system-input"
              style={{ paddingLeft: '34px', paddingRight: searchQuery ? '30px' : '12px', height: '38px', fontSize: '12.5px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-outline)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Categoria */}
          <SystemSelect
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val as any)}
            options={[
              { value: 'all', label: 'Todas as Categorias' },
              ...CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label })),
            ]}
            placeholder="Filtrar Categoria"
          />

          {/* Ordenação */}
          <SystemSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'id-desc', label: 'Mais Recentes (ID Desc)' },
              { value: 'price-asc', label: 'Menor Preço' },
              { value: 'price-desc', label: 'Maior Preço' },
              { value: 'stock-asc', label: 'Menor Estoque' },
              { value: 'stock-desc', label: 'Maior Estoque' },
              { value: 'name-asc', label: 'Nome (A - Z)' },
              { value: 'name-desc', label: 'Nome (Z - A)' },
            ]}
            placeholder="Ordenar por"
          />
        </div>
      </div>

      {/* =========================================================================
          ÁREA PRINCIPAL DE CONTEÚDO (TABELA ERP OU CARDS 3D)
         ========================================================================= */}
      {filteredProducts.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '48px 24px',
            borderRadius: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Package size={44} color="var(--color-outline)" opacity={0.5} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-headline)' }}>
            Nenhum produto encontrado com os filtros aplicados
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-outline)', maxWidth: '440px' }}>
            Tente redefinir seus filtros de busca, categoria ou status para visualizar os itens do inventário.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setGameFilter('all');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            className="btn-outline"
            style={{ marginTop: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 700 }}
          >
            Limpar Todos os Filtros
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* -------------------------------------------------------------------------
           MODO 1: TABELA ERP DE ALTA DENSIDADE (FULL WIDTH COM STICKY HEADER)
           ------------------------------------------------------------------------- */
        <div
          className="glass-panel"
          style={{
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid var(--card-border)',
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead className="workstation-table-header">
                <tr>
                  <th style={{ width: '44px', padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: allFilteredSelected ? 'var(--color-primary)' : 'var(--color-outline)',
                      }}
                      title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    >
                      {allFilteredSelected ? <CheckSquare size={17} color="var(--color-primary)" /> : <Square size={17} />}
                    </button>
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)' }}>
                    Produto & TCG
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)' }}>
                    Jogo / Categoria
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)' }}>
                    Preço de Venda
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)' }}>
                    Estoque Atual
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)' }}>
                    Mínimo
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)', textAlign: 'right' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const isOutOfStock = p.estoque <= 0;
                  const isCriticalStock = p.estoque > 0 && p.estoque <= (p.estoqueMinimo ?? 3);
                  const isInactive = p.ativo === false;
                  const gameOpt = GAME_OPTIONS.find((g) => g.value === p.jogo);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setInspectorProduct(p)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--card-border)',
                        backgroundColor: isSelected
                          ? 'rgba(168, 85, 247, 0.08)'
                          : isInactive
                            ? 'rgba(0, 0, 0, 0.15)'
                            : 'transparent',
                        opacity: isInactive ? 0.65 : 1,
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isInactive) {
                          e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isInactive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {/* Checkbox de Seleção */}
                      <td
                        style={{ padding: '12px 16px', textAlign: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectProduct(p.id);
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? 'var(--color-primary)' : 'var(--color-outline)',
                          }}
                        >
                          {isSelected ? <CheckSquare size={17} color="var(--color-primary)" /> : <Square size={17} />}
                        </button>
                      </td>

                      {/* Info do Produto & Thumbnail */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '56px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              backgroundColor: 'rgba(0,0,0,0.3)',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            }}
                          >
                            <img
                              src={p.imagemUrl}
                              alt={p.nome}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=100&auto=format&fit=crop&q=60';
                              }}
                            />
                          </div>

                          <div style={{ minWidth: 0, maxWidth: '280px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: 'var(--color-headline)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={p.nome}
                              >
                                {p.nome}
                              </span>
                              {p.raridade && (
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(250, 204, 21, 0.15)',
                                    color: '#facc15',
                                  }}
                                >
                                  {p.raridade}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.subtitulo || `ID #${p.id}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Jogo & Categoria */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              color: gameOpt?.color || 'var(--color-headline)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: gameOpt?.color || '#a855f7' }} />
                            {gameOpt?.label || p.jogo}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                            {p.categoria || 'Carta Avulsa'}
                          </span>
                        </div>
                      </td>

                      {/* Preço de Venda (com Edição Inline Rápida) */}
                      <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        {editingPriceId === p.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="text"
                              value={inlinePriceInput}
                              onChange={(e) => setInlinePriceInput(formatMoneyInput(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInlinePrice(p.id);
                                if (e.key === 'Escape') setEditingPriceId(null);
                              }}
                              autoFocus
                              className="system-input"
                              style={{ width: '85px', height: '28px', fontSize: '12px', padding: '2px 6px', fontFamily: 'var(--font-mono)' }}
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveInlinePrice(p.id, e)}
                              style={{
                                background: 'var(--color-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPriceId(null)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-outline)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => handleStartEditPrice(p, e)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              transition: 'background-color 0.15s ease',
                            }}
                            title="Clique para editar o preço rapidamente"
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                              R$ {formatBRL(p.preco)}
                            </span>
                            <Edit size={11} color="var(--color-outline)" opacity={0.6} />
                          </div>
                        )}
                      </td>

                      {/* Estoque Atual com Stepper Rápido [-] [5 un.] [+] */}
                      <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {isStaffOrAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickStock(p, -1, e)}
                              disabled={p.estoque <= 0}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                border: '1px solid var(--card-border)',
                                backgroundColor: 'var(--color-surface-container-high)',
                                color: 'var(--color-on-surface-variant)',
                                cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Diminuir 1 un."
                            >
                              -
                            </button>
                          )}

                          <span
                            style={{
                              minWidth: '48px',
                              textAlign: 'center',
                              fontSize: '12.5px',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              color: isOutOfStock ? '#f87171' : isCriticalStock ? '#fbbf24' : 'var(--color-headline)',
                            }}
                          >
                            {p.estoque} un.
                          </span>

                          {isStaffOrAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickStock(p, 1, e)}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                border: '1px solid var(--card-border)',
                                backgroundColor: 'var(--color-surface-container-high)',
                                color: 'var(--color-on-surface-variant)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Aumentar 1 un."
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Estoque Mínimo */}
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)' }}>
                        {p.estoqueMinimo ?? 3} un.
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: isInactive
                              ? '#94a3b8'
                              : isOutOfStock
                                ? '#f87171'
                                : isCriticalStock
                                  ? '#fbbf24'
                                  : '#4ade80',
                          }}
                        >
                          {isInactive ? 'Inativo' : isOutOfStock ? 'Esgotado' : isCriticalStock ? 'Reposição' : 'Disponível'}
                        </span>
                      </td>

                      {/* Ações da Linha */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setInspectorProduct(p)}
                            className="btn-outline"
                            style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '7px' }}
                            title="Abrir painel lateral de inspeção rápida"
                          >
                            <Eye size={12} /> Ficha
                          </button>

                          {isStaffOrAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              className="btn-primary"
                              style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '7px' }}
                              title="Editar Produto Completo"
                            >
                              <Edit size={12} /> Editar
                            </button>
                          )}

                          {isStaffOrAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleActive(p, e)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--card-border)',
                                borderRadius: '7px',
                                padding: '5px 7px',
                                cursor: 'pointer',
                                color: isInactive ? '#4ade80' : 'var(--color-outline)',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title={isInactive ? 'Reativar produto' : 'Inativar produto'}
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* -------------------------------------------------------------------------
           MODO 2: GRID DE CARDS HOLOGRÁFICOS 3D FOIL
           ------------------------------------------------------------------------- */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 230px))',
            gap: '16px',
            justifyContent: 'flex-start',
          }}
        >
          {filteredProducts.map((p) => {
            const isSelected = selectedProductIds.includes(p.id);
            return (
              <HolographicTiltCard
                key={p.id}
                product={p}
                isSelected={isSelected}
                onToggleSelect={(e) => {
                  e.stopPropagation();
                  toggleSelectProduct(p.id);
                }}
                onInspect={() => setInspectorProduct(p)}
                onEdit={() => setEditingProduct(p)}
                onStockChange={(delta, e) => handleQuickStock(p, delta, e)}
                isStaffOrAdmin={isStaffOrAdmin}
              />
            );
          })}
        </div>
      )}

      {/* =========================================================================
          DOCK FLUTUANTE DE AÇÕES EM LOTE (ESTILO LINEAR / VERCEL)
         ========================================================================= */}
      {selectedProductIds.length > 0 && (
        <div className="floating-bulk-dock">
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-headline)', paddingRight: '8px', borderRight: '1px solid var(--card-border)' }}>
            {selectedProductIds.length} selecionado(s)
          </span>

          <button
            type="button"
            onClick={() => setIsBulkPriceModalOpen(true)}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
          >
            <Percent size={13} /> Reajustar Preços (%)
          </button>

          <button
            type="button"
            onClick={handleBulkInactivate}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
          >
            <RotateCcw size={13} /> Inativar
          </button>

          <button
            type="button"
            onClick={handleBulkReactivate}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', borderColor: 'rgba(74, 222, 128, 0.4)', color: '#4ade80' }}
          >
            <RotateCcw size={13} /> Reativar
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
          >
            <Download size={13} /> CSV
          </button>

          <button
            type="button"
            onClick={() => setSelectedProductIds([])}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)', padding: '4px', display: 'flex', alignItems: 'center' }}
            title="Limpar seleção"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================================================================
          DRAWER LATERAL DE INSPEÇÃO RÁPIDA (MASTER-DETAIL)
         ========================================================================= */}
      <SideInspectorDrawer
        product={inspectorProduct}
        onClose={() => setInspectorProduct(null)}
        onOpenFullEdit={(p) => setEditingProduct(p)}
        onOpenFullDetail={(p) => setDetailProduct(p)}
        onStockChange={async (p, delta) => {
          await handleQuickStock(p, delta);
        }}
        onPriceChange={async (p, newPrice) => {
          await handleQuickPriceChange(p, newPrice);
        }}
        onToggleActive={async (p) => {
          await handleToggleActive(p);
        }}
        stockMovements={stockMovements}
        isStaffOrAdmin={isStaffOrAdmin}
      />


      {/* =========================================================================
          MODAL 1: FICHA TÉCNICA DETALHADA DO PRODUTO TCG
         ========================================================================= */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={() => {
            const p = detailProduct;
            setDetailProduct(null);
            setEditingProduct(p);
          }}
          stockMovements={stockMovements.filter((m) => m.produto_id === detailProduct.id)}
        />
      )}

      {/* =========================================================================
          MODAL 2: EDIÇÃO COMPLETA DE PRODUTO
         ========================================================================= */}
      {editingProduct && (
        <EditProductModal2
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={async (updated) => {
            await editProduct(editingProduct.id, updated);
            setEditingProduct(null);
          }}
          onDelete={async (id) => {
            await deleteProduct(id);
            setEditingProduct(null);
          }}
          onReactivate={async (id) => {
            await reactivateProduct(id);
            setEditingProduct(null);
          }}
          onPermanentDelete={async (id) => {
            await removeProductPermanently(id);
            setEditingProduct(null);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 3: NOVO PRODUTO MANUAL (TCG COMPLETO)
         ========================================================================= */}
      {isCreateModalOpen && (
        <CreateProductModal2
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={async (p) => {
            await addProduct(p);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 4: REAJUSTE DE PREÇOS EM MASSA (%)
         ========================================================================= */}
      {isBulkPriceModalOpen && (
        <BulkPriceModal
          isOpen={isBulkPriceModalOpen}
          onClose={() => setIsBulkPriceModalOpen(false)}
          selectedCount={selectedProductIds.length}
          onApply={async (percentage) => {
            const factor = 1 + percentage / 100;
            for (const id of selectedProductIds) {
              const current = products.find((prod) => prod.id === id);
              if (current) {
                const updatedPrice = Math.max(0.1, Math.round(current.preco * factor * 100) / 100);
                await editProduct(id, { preco: updatedPrice });
              }
            }
            setIsBulkPriceModalOpen(false);
            setSelectedProductIds([]);
            showToast(`Preços de ${selectedProductIds.length} produtos foram reajustados em ${percentage > 0 ? `+${percentage}%` : `${percentage}%`}!`);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 5: IMPORTADOR TCG LIVE DIRETO
         ========================================================================= */}
      {isLiveImportModalOpen && (
        <LiveCardImportModal
          isOpen={isLiveImportModalOpen}
          onClose={() => setIsLiveImportModalOpen(false)}
          existingProducts={products}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-MODAL 1: FICHA TÉCNICA DETALHADA
// ============================================================================
interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  stockMovements: any[];
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onEdit,
  stockMovements,
}) => {
  const isInactive = product.ativo === false;

  return (
    <SystemModal onClose={onClose} maxWidth="680px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.18)' : 'rgba(74, 222, 128, 0.15)',
                border: isInactive ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(74, 222, 128, 0.4)',
                color: isInactive ? '#f87171' : '#4ade80',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isInactive ? '#ef4444' : '#22c55e' }} />
              ID #{product.id} • {isInactive ? 'INATIVO' : 'ATIVO'}
            </span>
            <span className="badge badge-muted">{product.jogoNome || product.jogo}</span>
          </div>
          <h2 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            {product.nome}
          </h2>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Foto */}
        <div
          style={{
            height: '220px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-surface-container-high)',
            overflow: 'hidden',
            border: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {product.imagemUrl ? (
            <img src={product.imagemUrl} alt={product.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <Package size={32} color="var(--color-outline)" />
          )}
        </div>

        {/* Metadados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--color-surface-container-low)', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', display: 'block' }}>PREÇO DE VENDA</span>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                R$ {formatBRL(product.preco)}
              </span>
            </div>

            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--color-surface-container-low)', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', display: 'block' }}>ESTOQUE ATUAL</span>
              <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-headline)' }}>
                {product.estoque} un.
              </span>
            </div>
          </div>

          <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><strong>Categoria:</strong> {product.categoria}</div>
            <div><strong>Subtítulo / Edição:</strong> {product.subtitulo || 'Não informado'}</div>
            <div><strong>Raridade:</strong> {product.raridade || 'Comum'}</div>
            <div><strong>Estoque Mínimo de Segurança:</strong> {product.estoqueMinimo ?? 3} un.</div>
            <div><strong>Idioma:</strong> {product.idioma || 'Português'}</div>
            {product.ano && <div><strong>Ano de Lançamento:</strong> {product.ano}</div>}
          </div>

          {product.descricao && (
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--color-surface-container-low)', fontSize: '12px', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
              {product.descricao}
            </div>
          )}
        </div>
      </div>

      {/* Histórico Recente de Movimentações deste Produto */}
      <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
        <h4 style={{ fontSize: '13px', color: 'var(--color-headline)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <History size={14} /> Histórico de Movimentações do Produto
        </h4>

        {stockMovements.length === 0 ? (
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-outline)' }}>
            Nenhuma movimentação registrada no log para este item ainda.
          </p>
        ) : (
          <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stockMovements.slice(0, 5).map((m, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-surface-container-low)',
                  fontSize: '11.5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: m.tipo === 'entrada' ? '#4ade80' : '#f87171', marginRight: '6px' }}>
                    {m.tipo === 'entrada' ? `+${m.quantidade} un.` : `-${m.quantidade} un.`}
                  </span>
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>{m.motivo}</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                  {m.data || 'Recente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" onClick={onClose} className="btn-outline">
          Fechar
        </button>
        <button type="button" onClick={onEdit} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Edit size={14} /> Editar Informações
        </button>
      </div>
    </SystemModal>
  );
};

// ============================================================================
// SUB-MODAL 2: EDIÇÃO COMPLETA DE PRODUTO
// ============================================================================
interface EditProductModal2Props {
  product: Product;
  onClose: () => void;
  onSave: (updated: Partial<Product>) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
  onReactivate: (id: number) => Promise<void> | void;
  onPermanentDelete: (id: number) => Promise<void> | void;
}

const EditProductModal2: React.FC<EditProductModal2Props> = ({
  product,
  onClose,
  onSave,
  onDelete,
  onReactivate,
  onPermanentDelete,
}) => {
  const { showToastConfirm } = useApp();
  const [nome, setNome] = useState(product.nome);
  const [subtitulo, setSubtitulo] = useState(product.subtitulo || '');
  const [preco, setPreco] = useState(product.preco ? formatMoneyInput(product.preco) : '');
  const [estoque, setEstoque] = useState(String(product.estoque));
  const [estoqueMinimo, setEstoqueMinimo] = useState(String(product.estoqueMinimo ?? 3));
  const [jogo, setJogo] = useState<GameId>(product.jogo);
  const [categoria, setCategoria] = useState<ProductCategory>(product.categoria);
  const [raridade, setRaridade] = useState(product.raridade || 'Comum');
  const [imagemUrl, setImagemUrl] = useState(product.imagemUrl || '');
  const [descricao, setDescricao] = useState(product.descricao || '');

  const isInactive = product.ativo === false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece Card Game',
      outros: 'Acessórios / Geral',
    };

    await onSave({
      nome: nome.trim(),
      subtitulo: subtitulo.trim(),
      preco: parseMoneyToFloat(preco),
      estoque: parseInt(estoque, 10) || 0,
      estoqueMinimo: Math.max(0, parseInt(estoqueMinimo, 10) || 3),
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      raridade: raridade.trim() || 'Comum',
      imagemUrl: imagemUrl.trim(),
      descricao: descricao.trim(),
    });
  };

  return (
    <SystemModal onClose={onClose} maxWidth="620px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.18)' : 'rgba(74, 222, 128, 0.15)',
                border: isInactive ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(74, 222, 128, 0.4)',
                color: isInactive ? '#f87171' : '#4ade80',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isInactive ? '#ef4444' : '#22c55e' }} />
              ID #{product.id} • {isInactive ? 'PRODUTO INATIVO' : 'PRODUTO ATIVO'}
            </span>
          </div>
          <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Editar Produto no Catálogo
          </h3>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Banner de Status Ativo / Inativo */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(74, 222, 128, 0.08)',
          border: isInactive ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(74, 222, 128, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} color={isInactive ? '#f87171' : '#4ade80'} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: isInactive ? '#f87171' : '#4ade80', textTransform: 'uppercase' }}>
              {isInactive ? 'Status: Inativo (Oculto da Loja)' : 'Status: Ativo (Visível na Loja)'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
              {isInactive ? 'Item indisponível para clientes comprarem.' : 'Item publicado e disponível na vitrine pública.'}
            </div>
          </div>
        </div>

        <div>
          {isInactive ? (
            <button
              type="button"
              onClick={async () => {
                await onReactivate(product.id);
                onClose();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#22c55e',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reativar Agora
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await onDelete(product.id);
                onClose();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Inativar Produto
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Jogo *
            </label>
            <SystemSelect<GameId>
              value={jogo}
              onChange={(val) => setJogo(val)}
              options={GAME_OPTIONS.map((g) => ({
                value: g.value,
                label: g.label,
                badge: g.badge,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Categoria *
            </label>
            <SystemSelect<ProductCategory>
              value={categoria}
              onChange={(val) => setCategoria(val)}
              options={CATEGORY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Subtítulo / Coleção
            </label>
            <input
              type="text"
              className="system-input"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Ex: Escarlate e Violeta 151"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Raridade
            </label>
            <input
              type="text"
              className="system-input"
              value={raridade}
              onChange={(e) => setRaridade(e.target.value)}
              placeholder="Ex: Mítica, Rara, Secreta"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Preço (R$) *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', pointerEvents: 'none' }}>
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
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Estoque Atual *
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
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Estoque Mínimo *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            URL da Imagem
          </label>
          <input
            type="url"
            className="system-input"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Descrição
          </label>
          <textarea
            className="system-input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <div>
            {isInactive && (
              <button
                type="button"
                onClick={() => {
                  showToastConfirm({
                    message: `Excluir permanentemente "${product.nome}" do banco de dados? Esta ação não pode ser desfeita.`,
                    confirmText: 'Excluir definitivamente',
                    cancelText: 'Cancelar',
                    onConfirm: async () => {
                      await onPermanentDelete(product.id);
                      onClose();
                    },
                  });
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Excluir Definitivo
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn-outline">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar Alterações
            </button>
          </div>
        </div>
      </form>
    </SystemModal>
  );
};

// ============================================================================
// SUB-MODAL 3: NOVO PRODUTO MANUAL 2.0
// ============================================================================
interface CreateProductModal2Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (p: Omit<Product, 'id'>) => Promise<void> | void;
}

const CreateProductModal2: React.FC<CreateProductModal2Props> = ({ isOpen, onClose, onCreate }) => {
  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('5');
  const [estoqueMinimo, setEstoqueMinimo] = useState('3');
  const [jogo, setJogo] = useState<GameId>('pokemon');
  const [categoria, setCategoria] = useState<ProductCategory>('Booster Pack');
  const [raridade, setRaridade] = useState('Comum');
  const [imagemUrl, setImagemUrl] = useState('');
  const [descricao, setDescricao] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece Card Game',
      outros: 'Acessórios / Geral',
    };

    await onCreate({
      nome: nome.trim(),
      subtitulo: subtitulo.trim() || `${categoria} • ${gameNames[jogo]}`,
      preco: parseMoneyToFloat(preco),
      estoque: parseInt(estoque, 10) || 0,
      estoqueMinimo: Math.max(0, parseInt(estoqueMinimo, 10) || 3),
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      raridade: raridade.trim() || 'Comum',
      descricao: descricao.trim() || 'Produto oficial licenciado da loja Noble Deck.',
      imagemUrl: imagemUrl.trim(),
      isNovo: true,
      isDestaque: false,
    });
  };

  return (
    <SystemModal onClose={onClose} maxWidth="600px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '4px' }}>Cadastro Manual 2.0</span>
          <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Adicionar Novo Produto ao Estoque
          </h3>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Nome do Produto *
          </label>
          <input
            type="text"
            required
            className="system-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Booster Box Escarlate e Violeta"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Jogo *
            </label>
            <SystemSelect<GameId>
              value={jogo}
              onChange={(val) => setJogo(val)}
              options={GAME_OPTIONS.map((g) => ({
                value: g.value,
                label: g.label,
                badge: g.badge,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Categoria *
            </label>
            <SystemSelect<ProductCategory>
              value={categoria}
              onChange={(val) => setCategoria(val)}
              options={CATEGORY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Subtítulo / Coleção
            </label>
            <input
              type="text"
              className="system-input"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Ex: Coleção Especial 151"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Raridade
            </label>
            <input
              type="text"
              className="system-input"
              value={raridade}
              onChange={(e) => setRaridade(e.target.value)}
              placeholder="Ex: Rara, Ultra Rara"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Preço (R$) *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', pointerEvents: 'none' }}>
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
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Estoque Inicial *
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
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Estoque Mínimo *
            </label>
            <input
              type="number"
              min="0"
              required
              className="system-input"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            URL da Imagem
          </label>
          <input
            type="url"
            className="system-input"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Descrição
          </label>
          <textarea
            className="system-input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes sobre a edição, estado ou conteúdo..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={onClose} className="btn-outline">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Cadastrar Produto no Estoque
          </button>
        </div>
      </form>
    </SystemModal>
  );
};

// ============================================================================
// SUB-MODAL 4: REAJUSTE DE PREÇOS EM MASSA (%)
// ============================================================================
interface BulkPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onApply: (percentage: number) => Promise<void> | void;
}

const BulkPriceModal: React.FC<BulkPriceModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  onApply,
}) => {
  const [percentInput, setPercentInput] = useState<string>('10');
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    const val = parseFloat(percentInput);
    if (!isNaN(val) && val !== 0) {
      setIsApplying(true);
      try {
        await onApply(val);
      } finally {
        setIsApplying(false);
      }
    }
  };

  return (
    <SystemModal onClose={onClose} maxWidth="460px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '4px' }}>Ação em Lote</span>
          <h3 style={{ fontSize: '18px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Reajuste de Preço em Massa
          </h3>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--color-surface-container-low)', marginBottom: '16px', fontSize: '13px', lineHeight: 1.4 }}>
        Você está aplicando um reajuste percentual simultâneo em <strong>{selectedCount} produto(s)</strong> selecionados.
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', marginBottom: '6px', textTransform: 'uppercase' }}>
          Percentual de Ajuste (%)
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            step="1"
            className="system-input"
            value={percentInput}
            onChange={(e) => setPercentInput(e.target.value)}
            placeholder="Ex: 10 para +10% ou -5 para -5%"
            style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
          />
          <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
            %
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-outline)', marginTop: '4px', display: 'block' }}>
          Dica: Use valores positivos para aumento (ex: +10) ou negativos para desconto (ex: -10).
        </span>
      </div>

      {/* Atalhos rápidos */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['+5', '+10', '+15', '+20', '-5', '-10', '-15'].map((btn) => (
          <button
            key={btn}
            type="button"
            onClick={() => setPercentInput(btn.replace('+', ''))}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--card-border)',
              backgroundColor: 'var(--color-surface-container-high)',
              color: 'var(--color-headline)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {btn}%
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button type="button" onClick={onClose} className="btn-outline">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying || !percentInput || parseFloat(percentInput) === 0}
          className="btn-primary"
        >
          {isApplying ? 'Reajustando...' : 'Aplicar Reajuste'}
        </button>
      </div>
    </SystemModal>
  );
};

// ============================================================================
// SUB-MODAL 5: IMPORTADOR TCG LIVE DIRETO
// ============================================================================
interface LiveCardImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
}

const LiveCardImportModal: React.FC<LiveCardImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
}) => {
  const { importExternalCard, showToast } = useApp();
  const [selectedGame, setSelectedGame] = useState<ActiveGameApi>('pokemon');
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<ExternalCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [importingUid, setImportingUid] = useState<string | null>(null);
  const [pokemonSets, setPokemonSets] = useState<PokemonSetOption[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'sealed' | 'singles'>('all');

  // Carrega sets de Pokémon quando a modal abre ou quando Pokémon é selecionado
  React.useEffect(() => {
    if (isOpen && selectedGame === 'pokemon') {
      getPokemonSets().then((sets) => {
        setPokemonSets(sets);
      });
    }
  }, [isOpen, selectedGame]);

  const runSearch = async (game: ActiveGameApi, query: string, setId?: string, page = 1) => {
    if (page === 1) {
      setIsLoading(true);
      setCurrentPage(1);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const results = await searchLiveCards(game, query, page, setId);
      if (page === 1) {
        setCards(results.cards || []);
      } else {
        setCards((prev) => [...prev, ...(results.cards || [])]);
      }
      setHasMore(Boolean(results.hasMore));
      setTotalCount(results.totalCount || (page === 1 ? results.cards?.length || 0 : totalCount));
      setCurrentPage(page);
    } catch {
      showToast('Erro ao consultar a API externa de cartas.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Carregamento inicial de cards ao abrir a modal
  React.useEffect(() => {
    if (isOpen && cards.length === 0) {
      runSearch(selectedGame, searchQuery, selectedSetId, 1);
    }
  }, [isOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    runSearch(selectedGame, searchQuery, selectedSetId, 1);
  };

  const handleGameChange = (game: ActiveGameApi) => {
    setSelectedGame(game);
    setSelectedSetId('');
    runSearch(game, searchQuery, '', 1);
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoading || isLoadingMore) return;
    runSearch(selectedGame, searchQuery, selectedSetId, currentPage + 1);
  };

  const handleImport = async (card: ExternalCard) => {
    setImportingUid(card.uid);
    try {
      await importExternalCard(card, 5, card.precoMercadoBrl > 0 ? card.precoMercadoBrl : 19.9);
    } finally {
      setImportingUid(null);
    }
  };

  // Contadores por tipo de item
  const sealedCardsCount = cards.filter(
    (c) => c.categoria === 'Booster Pack' || c.categoria === 'Booster Box'
  ).length;
  const singleCardsCount = cards.filter(
    (c) => !c.categoria || c.categoria === 'Carta Avulsa'
  ).length;

  const filteredCards = cards.filter((c) => {
    if (filterType === 'sealed') return c.categoria === 'Booster Pack' || c.categoria === 'Booster Box';
    if (filterType === 'singles') return !c.categoria || c.categoria === 'Carta Avulsa';
    return true;
  });

  if (!isOpen) return null;

  return (
    <SystemModal onClose={onClose} maxWidth="860px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '4px' }}>Catálogo Oficial de Cards & Boosters</span>
          <h3 style={{ fontSize: '19px', color: 'var(--color-headline)', margin: 0, fontWeight: 800 }}>
            Importar Cards & Booster Packs para a Loja
          </h3>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ width: '160px' }}>
          <SystemSelect<ActiveGameApi>
            value={selectedGame}
            onChange={handleGameChange}
            options={[
              { value: 'pokemon', label: 'Pokémon TCG' },
              { value: 'magic', label: 'Magic: The Gathering' },
              { value: 'yugioh', label: 'Yu-Gi-Oh!' },
              { value: 'onepiece', label: 'One Piece' },
            ]}
          />
        </div>

        {selectedGame === 'pokemon' && (
          <div style={{ width: '220px' }}>
            <SystemSelect<string>
              value={selectedSetId}
              onChange={(val) => {
                setSelectedSetId(val);
                runSearch(selectedGame, searchQuery, val, 1);
              }}
              options={[
                { value: '', label: 'Todas as Coleções' },
                ...pokemonSets.map((s) => ({
                  value: s.id,
                  label: s.name,
                  badge: s.id.toUpperCase(),
                })),
              ]}
              placeholder="Coleção / Set..."
            />
          </div>
        )}

        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }} />
          <input
            type="text"
            className="system-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              selectedGame === 'pokemon'
                ? 'Busque por carta, booster ou coleção (ex: Evoluções Prismáticas, Booster, Umbreon)...'
                : 'Nome da carta ou booster (ex: Black Lotus, Booster, Luffy)...'
            }
            style={{ paddingLeft: '34px' }}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Filtros Rápidos por Tipo de Produto: Todos / Booster Packs / Cards Avulsos */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase' }}>
          Filtrar Tipo:
        </span>
        <button
          type="button"
          onClick={() => setFilterType('all')}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterType === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
            backgroundColor: filterType === 'all' ? 'rgba(216, 185, 255, 0.18)' : 'transparent',
            color: filterType === 'all' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
          }}
        >
          Todos ({cards.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('sealed')}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterType === 'sealed' ? '1px solid #ec4899' : '1px solid var(--card-border)',
            backgroundColor: filterType === 'sealed' ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
            color: filterType === 'sealed' ? '#f472b6' : 'var(--color-on-surface-variant)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          📦 Booster Packs & Boxes ({sealedCardsCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('singles')}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterType === 'singles' ? '1px solid #38bdf8' : '1px solid var(--card-border)',
            backgroundColor: filterType === 'singles' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
            color: filterType === 'singles' ? '#38bdf8' : 'var(--color-on-surface-variant)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          🎴 Cards Avulsos ({singleCardsCount})
        </button>

        {totalCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
            Exibindo {cards.length} de {totalCount} itens encontrados
          </span>
        )}
      </div>

      {/* Resultados da Busca Live */}
      <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-outline)' }}>
            Consultando catálogo oficial e gerando pacotinhos...
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-outline)' }}>
            Nenhum item encontrado para o filtro selecionado. Tente buscar por outro termo ou selecionar &ldquo;Todos&rdquo;.
          </div>
        ) : (
          filteredCards.map((c) => {
            const alreadyInStock = existingProducts.some(
              (p) => p.jogo === c.jogo && p.nome.toLowerCase().trim() === c.nome.toLowerCase().trim()
            );

            const isSealedPack = c.categoria === 'Booster Pack';
            const isSealedBox = c.categoria === 'Booster Box';

            return (
              <div
                key={c.uid}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isSealedPack
                    ? 'rgba(236, 72, 153, 0.06)'
                    : isSealedBox
                      ? 'rgba(168, 85, 247, 0.08)'
                      : 'var(--color-surface-container-low)',
                  border: isSealedPack
                    ? '1px solid rgba(236, 72, 153, 0.35)'
                    : isSealedBox
                      ? '1px solid rgba(168, 85, 247, 0.35)'
                      : '1px solid var(--card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={c.imagemUrl}
                    alt={c.nome}
                    style={{
                      width: '44px',
                      height: '58px',
                      borderRadius: '4px',
                      objectFit: 'contain',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-headline)', fontSize: '13.5px' }}>
                        {c.nome}
                      </span>
                      {isSealedPack && (
                        <span
                          style={{
                            backgroundColor: 'rgba(236, 72, 153, 0.2)',
                            border: '1px solid rgba(236, 72, 153, 0.45)',
                            color: '#f472b6',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          📦 BOOSTER PACK
                        </span>
                      )}
                      {isSealedBox && (
                        <span
                          style={{
                            backgroundColor: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.45)',
                            color: '#c084fc',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          📦 BOOSTER BOX
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                      {c.colecao} {c.codigoCarta && `• #${c.codigoCarta}`} • {c.raridade}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary)', fontSize: '13.5px' }}>
                    R$ {formatBRL(c.precoMercadoBrl > 0 ? c.precoMercadoBrl : 19.9)}
                  </span>

                  {alreadyInStock ? (
                    <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(74, 222, 128, 0.12)' }}>
                      Já no Estoque
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleImport(c)}
                      disabled={importingUid === c.uid}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700 }}
                    >
                      {importingUid === c.uid
                        ? 'Importando...'
                        : isSealedPack
                          ? 'Vender Booster (+5 un.)'
                          : isSealedBox
                            ? 'Vender Box (+2 un.)'
                            : 'Importar (+5 un.)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Botão Carregar Mais Cartas da Coleção (Paginação Contínua) */}
        {hasMore && !isLoading && (
          <div style={{ textAlign: 'center', marginTop: '12px', paddingBottom: '8px' }}>
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="btn-outline"
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isLoadingMore ? (
                'Carregando mais cartas...'
              ) : (
                <>
                  <Plus size={14} /> Carregar Mais 24 Cartas da Coleção (Página {currentPage + 1})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </SystemModal>
  );
};
