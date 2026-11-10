import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SystemSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
}

export function SystemSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção...',
  disabled = false,
  id,
  size = 'md',
  style,
  triggerStyle,
  dropdownStyle,
}: SystemSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        zIndex: isOpen ? 9999 : undefined,
        ...style,
      }}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`system-input system-select-trigger size-${size} ${isOpen ? 'is-open' : ''}`}
        style={triggerStyle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {selectedOption?.icon}
          <span
            style={{
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              fontWeight: 500,
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className="badge badge-purple"
              style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          style={{
            color: 'var(--color-primary, #8c56d4)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        />
      </button>

      {isOpen && (
        <div className="system-select-dropdown" style={dropdownStyle}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`system-select-option ${isSelected ? 'selected' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
                  {opt.icon}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span
                      className="badge badge-muted"
                      style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check
                    size={size === 'sm' ? 13 : 15}
                    style={{ color: 'var(--color-primary, #8c56d4)', flexShrink: 0, marginLeft: '6px' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
