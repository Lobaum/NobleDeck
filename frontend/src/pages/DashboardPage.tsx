import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, ChevronDown, Check, Pencil, Trash2, Plus, Minus, X, Save } from 'lucide-react';
import type { GameId, ProductCategory, UserRole, Order, Product } from '../types';
import defaultProductImg from '../assets/products/pokemon-destinos-brilhantes.png';
import { SystemSelect } from '../components/SystemSelect';

interface OrderStatusDropdownProps {
  currentStatus: Order['status'];
  onStatusChange: (newStatus: Order['status']) => void;
}

const OrderStatusDropdown: React.FC<OrderStatusDropdownProps> = ({ currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const availableOptions: Order['status'][] =
    currentStatus === 'Finalizado'
      ? ['Finalizado', 'Cancelado']
      : currentStatus === 'Cancelado'
        ? ['Cancelado']
        : ['Pendente', 'Processando', 'Finalizado', 'Cancelado'];

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

  const getStatusStyle = (status: Order['status']) => {
    switch (status) {
      case 'Finalizado':
        return {
          dot: '#22c55e',
          text: '#4ade80',
          bg: 'rgba(34, 197, 94, 0.12)',
          border: 'rgba(34, 197, 94, 0.35)',
        };
      case 'Processando':
        return {
          dot: '#eab308',
          text: '#facc15',
          bg: 'rgba(234, 179, 8, 0.12)',
          border: 'rgba(234, 179, 8, 0.35)',
        };
      case 'Cancelado':
        return {
          dot: '#ef4444',
          text: '#f87171',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.35)',
        };
      default:
        return {
          dot: '#a855f7',
          text: '#c084fc',
          bg: 'rgba(168, 85, 247, 0.12)',
          border: 'rgba(168, 85, 247, 0.35)',
        };
    }
  };

  const currentStyle = getStatusStyle(currentStatus);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 12px ${currentStyle.border}`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: currentStyle.dot,
            boxShadow: `0 0 8px ${currentStyle.dot}`,
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
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            minWidth: '155px',
            backgroundColor: 'var(--card-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(140, 86, 212, 0.35)',
            borderRadius: '10px',
            padding: '4px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(140, 86, 212, 0.15)',
          }}
        >
          {availableOptions.map((opt) => {
            const isSelected = opt === currentStatus;
            const optStyle = getStatusStyle(opt);
            return (
              <button
                key={opt}
                type="button"
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
                  backgroundColor: isSelected ? 'rgba(140, 86, 212, 0.15)' : 'transparent',
                  color: isSelected ? 'var(--color-headline)' : 'var(--color-on-surface)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(140, 86, 212, 0.1)';
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
                      boxShadow: `0 0 6px ${optStyle.dot}`,
                    }}
                  />
                  <span>{opt}</span>
                </div>
                {isSelected && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
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
}

const StockItemCard: React.FC<StockItemCardProps> = ({
  product,
  onEdit,
  onUpdateStockDelta,
  onSetStockExact,
  isStaffOrAdmin,
}) => {
  const [stockInput, setStockInput] = useState<string>(String(product.estoque));
  const isLowStock = product.estoque <= 4;
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
        border: isLowStock ? '1px solid rgba(255, 180, 171, 0.4)' : undefined,
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-muted">{product.jogoNome}</span>
            {isLowStock && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-error)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={12} /> Estoque Baixo!
              </span>
            )}
          </div>

          {isStaffOrAdmin && (
            <button
              type="button"
              onClick={() => onEdit(product)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                backgroundColor: 'rgba(140, 86, 212, 0.12)',
                border: '1px solid rgba(140, 86, 212, 0.35)',
                borderRadius: '6px',
                color: 'var(--color-primary)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(140, 86, 212, 0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(140, 86, 212, 0.12)')}
              title="Editar dados deste produto"
            >
              <Pencil size={12} />
              Editar
            </button>
          )}
        </div>

        <h4 style={{ fontSize: '17px', marginBottom: '4px', color: 'var(--color-headline)' }}>{product.nome}</h4>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700 }}>
          R$ {product.preco.toFixed(2)}
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
          <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block' }}>
            Disponível em Estoque
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '15px',
              fontWeight: 700,
              color: product.estoque > 0 ? 'var(--color-headline)' : 'var(--color-error)',
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
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 0 10px rgba(140, 86, 212, 0.4)',
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
                  backgroundColor: 'rgba(140, 86, 212, 0.2)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-primary)',
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
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onSave, onDelete }) => {
  const [nome, setNome] = useState(product.nome);
  const [preco, setPreco] = useState(String(product.preco));
  const [estoque, setEstoque] = useState(String(product.estoque));
  const [jogo, setJogo] = useState<GameId>(product.jogo);
  const [categoria, setCategoria] = useState<ProductCategory>(product.categoria);
  const [subtitulo, setSubtitulo] = useState(product.subtitulo || '');
  const [imagemUrl, setImagemUrl] = useState(product.imagemUrl || '');
  const [descricao, setDescricao] = useState(product.descricao || '');

  const gameNames: Record<GameId, string> = {
    pokemon: 'Pokémon TCG',
    magic: 'Magic: The Gathering',
    yugioh: 'Yu-Gi-Oh!',
    onepiece: 'One Piece',
    outros: 'Acessórios / Geral',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nome: nome.trim(),
      preco: parseFloat(preco) || 0,
      estoque: parseInt(estoque, 10) || 0,
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      subtitulo: subtitulo.trim() || `${categoria} • ${gameNames[jogo]}`,
      imagemUrl: imagemUrl.trim(),
      descricao: descricao.trim(),
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja inativar o produto "${product.nome}" do catálogo?`)) {
      onDelete(product.id);
      onClose();
    }
  };

  return (
    <div className="system-modal-overlay" onClick={onClose}>
      <div
        className="glass-panel system-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '6px' }}>CRUD de Produtos</span>
            <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0 }}>Editar Produto</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
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

          <div className="system-form-grid">
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
                Preço (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="system-input"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
                Quantidade em Estoque *
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
            <button
              type="button"
              onClick={handleDelete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '11px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.55)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Trash2 size={14} /> Inativar Produto
            </button>

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
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
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
      </div>
    </div>
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
  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [preco, setPreco] = useState('49.90');
  const [estoque, setEstoque] = useState('10');
  const [jogo, setJogo] = useState<GameId>('pokemon');
  const [categoria, setCategoria] = useState<ProductCategory>('Booster Pack');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState(defaultProductImg);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece',
      outros: 'Acessórios',
    };

    onCreate({
      nome: nome.trim(),
      subtitulo: subtitulo.trim() || `${categoria} • ${gameNames[jogo]}`,
      preco: parseFloat(preco) || 0,
      estoque: parseInt(estoque, 10) || 0,
      jogo,
      jogoNome: gameNames[jogo] || 'Geral',
      categoria,
      descricao: descricao.trim() || 'Produto oficial licenciado da loja Noble Deck.',
      imagemUrl: imagemUrl.trim() || defaultProductImg,
      isNovo: true,
      isDestaque: false,
    });

    // Resetar formulário e fechar modal
    setNome('');
    setSubtitulo('');
    setDescricao('');
    setPreco('49.90');
    setEstoque('10');
    setJogo('pokemon');
    setCategoria('Booster Pack');
    setImagemUrl(defaultProductImg);
    onClose();
  };

  return (
    <div className="system-modal-overlay" onClick={onClose}>
      <div
        className="glass-panel system-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Novo Item</span>
            <h3 style={{ fontSize: '20px', color: 'var(--color-headline)', margin: 0 }}>Cadastrar Novo Produto</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
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

          <div className="system-form-grid">
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px', color: 'var(--color-headline)' }}>
                Preço Unitário (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="system-input"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="49.90"
              />
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
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
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
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    switchRole,
    orders,
    tournaments,
    products,
    updateProductStock,
    setProductStockExact,
    editProduct,
    deleteProduct,
    addProduct,
    createTournament,
    updateOrderStatus,
    setCurrentTab,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'new-tournament'>('orders');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);

  const [newTourTitle, setNewTourTitle] = useState('');
  const [newTourGame, setNewTourGame] = useState<GameId>('magic');
  const [newTourFormat, setNewTourFormat] = useState('Standard Suíço');
  const [newTourDate, setNewTourDate] = useState('Sáb, 15 Dez');
  const [newTourTime, setNewTourTime] = useState('14:00');
  const [newTourLocal, setNewTourLocal] = useState('Noble Deck Arena - Sala Principal');
  const [newTourSlots, setNewTourSlots] = useState('32');
  const [newTourFee, setNewTourFee] = useState('50.00');
  const [newTourPrize, setNewTourPrize] = useState('R$ 1.000 em créditos na loja + Troféu');

  const isStaffOrAdmin = currentUser.role === 'funcionario' || currentUser.role === 'admin';

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece',
      outros: 'Geral',
    };

    createTournament({
      titulo: newTourTitle,
      jogo: newTourGame,
      jogoNome: gameNames[newTourGame],
      formato: newTourFormat,
      data: newTourDate,
      horario: newTourTime,
      local: newTourLocal,
      vagasTotais: parseInt(newTourSlots) || 16,
      taxaInscricao: parseFloat(newTourFee) || 0,
      premiacao: newTourPrize,
      isPremium: true,
    });

    setNewTourTitle('');
    setCurrentTab('tournaments');
  };

  const myTournaments = tournaments.filter((t) =>
    currentUser.torneiosInscritos.includes(t.id)
  );

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
                    currentUser.role === 'admin'
                      ? '#FFBEFB'
                      : currentUser.role === 'funcionario'
                        ? '#FFF4BF'
                        : '#8C56D4',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-primary)',
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

          <div
            style={{
              backgroundColor: 'var(--color-surface-container-low)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--nav-border)',
            }}
          >
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-outline)',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Alternar Modo de Visualização:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['cliente', 'funcionario', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    backgroundColor:
                      currentUser.role === r ? 'var(--color-primary-container)' : 'transparent',
                    color: currentUser.role === r ? '#ffffff' : 'var(--color-on-surface-variant)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
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
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor:
                activeTab === 'orders' ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
              color: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {isStaffOrAdmin ? 'Todos os Pedidos' : 'Meus Pedidos'} ({orders.length})
          </button>

          {isStaffOrAdmin && (
            <>
              <button
                onClick={() => setActiveTab('inventory')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor:
                    activeTab === 'inventory' ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
                  color: activeTab === 'inventory' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
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
                onClick={() => setActiveTab('new-tournament')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor:
                    activeTab === 'new-tournament' ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
                  color: activeTab === 'new-tournament' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                + Cadastrar Torneio
              </button>
            </>
          )}
        </div>

        {/* Pedidos */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.length === 0 ? (
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
              orders.map((order) => (
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
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--color-headline)',
                          marginRight: '12px',
                        }}
                      >
                        Pedido #{order.id_pedido}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                        {order.data} • Cliente: {order.cliente_nome}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isStaffOrAdmin ? (
                        <OrderStatusDropdown
                          currentStatus={order.status}
                          onStatusChange={(newStatus) =>
                            updateOrderStatus(order.id_pedido, newStatus)
                          }
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor:
                              order.status === 'Finalizado'
                                ? 'rgba(76, 175, 80, 0.2)'
                                : order.status === 'Processando'
                                  ? 'rgba(255, 244, 191, 0.2)'
                                  : order.status === 'Cancelado'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : 'rgba(140, 86, 212, 0.2)',
                            color:
                              order.status === 'Finalizado'
                                ? '#81c784'
                                : order.status === 'Processando'
                                  ? 'var(--color-accent-yellow)'
                                  : order.status === 'Cancelado'
                                    ? '#f87171'
                                    : 'var(--color-primary)',
                            border: '1px solid var(--card-border)',
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
                          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                            {item.quantidade}x
                          </span>
                          <span>{item.produto.nome}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-outline)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            ({item.produto.jogoNome})
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                          R$ {item.subtotal.toFixed(2)}
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
                        color: 'var(--color-primary)',
                      }}
                    >
                      R$ {order.valor_total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}

            {!isStaffOrAdmin && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>
                  Torneios que você está participando
                </h3>
                {myTournaments.length === 0 ? (
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px' }}>
                    Você ainda não se inscreveu em nenhum torneio.{' '}
                    <button
                      onClick={() => setCurrentTab('tournaments')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Ver calendário
                    </button>
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {myTournaments.map((t) => (
                      <div
                        key={t.id}
                        className="glass-panel"
                        style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}
                      >
                        <span className="badge badge-purple" style={{ marginBottom: '8px' }}>
                          {t.jogoNome}
                        </span>
                        <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>{t.titulo}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                          {t.data} às {t.horario} • {t.local}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                }}
              >
                <Plus size={15} /> Cadastrar Novo Produto
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {products.map((p) => (
                <StockItemCard
                  key={p.id}
                  product={p}
                  isStaffOrAdmin={isStaffOrAdmin}
                  onEdit={(prod) => setEditingProduct(prod)}
                  onUpdateStockDelta={(id, delta) => updateProductStock(id, delta)}
                  onSetStockExact={(id, exact) => setProductStockExact(id, exact)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Novo Torneio */}
        {isStaffOrAdmin && activeTab === 'new-tournament' && (
          <div
            className="glass-panel"
            style={{
              maxWidth: '680px',
              padding: '32px',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Cadastrar Novo Torneio</h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-on-surface-variant)',
                marginBottom: '24px',
              }}
            >
              Defina as regras, jogo, premiação e número de vagas para os jogadores.
            </p>

            <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Título do Torneio
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torneio de Lançamento Regional"
                  className="system-input"
                  value={newTourTitle}
                  onChange={(e) => setNewTourTitle(e.target.value)}
                />
              </div>

              <div className="system-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Jogo
                  </label>
                  <SystemSelect<GameId>
                    value={newTourGame}
                    onChange={(val) => setNewTourGame(val)}
                    options={gameOptions.filter((g) => g.value !== 'outros')}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Formato
                  </label>
                  <input
                    type="text"
                    required
                    className="system-input"
                    value={newTourFormat}
                    onChange={(e) => setNewTourFormat(e.target.value)}
                  />
                </div>
              </div>

              <div className="system-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Data (Ex: Sáb, 15 Dez)
                  </label>
                  <input
                    type="text"
                    required
                    className="system-input"
                    value={newTourDate}
                    onChange={(e) => setNewTourDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Horário (Ex: 14:00)
                  </label>
                  <input
                    type="text"
                    required
                    className="system-input"
                    value={newTourTime}
                    onChange={(e) => setNewTourTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Local da Partida (Ex: Noble Deck Arena - Mesa Central)
                </label>
                <input
                  type="text"
                  required
                  className="system-input"
                  value={newTourLocal}
                  onChange={(e) => setNewTourLocal(e.target.value)}
                />
              </div>

              <div className="system-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Limite de Vagas
                  </label>
                  <input
                    type="number"
                    required
                    className="system-input"
                    value={newTourSlots}
                    onChange={(e) => setNewTourSlots(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Taxa de Inscrição (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="system-input"
                    value={newTourFee}
                    onChange={(e) => setNewTourFee(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Premiação Oferecida
                </label>
                <input
                  type="text"
                  required
                  className="system-input"
                  value={newTourPrize}
                  onChange={(e) => setNewTourPrize(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '16px', marginTop: '8px' }}>
                Publicar Torneio no Calendário
              </button>
            </form>
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
          />
        )}
      </div>
    </div>
  );
};
