import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface CurtainThemeToggleProps {
  variant?: 'icon' | 'labeled';
  buttonSize?: number;
  className?: string;
}

export const CurtainThemeToggle: React.FC<CurtainThemeToggleProps> = ({
  variant = 'icon',
  buttonSize = 38,
  className = '',
}) => {
  const { theme, phase, toggleTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isDark = theme === 'dark';
  const isAnimating = phase !== 'idle';

  const scaleValue = isPressed ? 0.94 : isHovered ? 1.08 : 1;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={isAnimating}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-pressed={isDark}
      title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={`curtain-theme-toggle ${className}`}
      style={{
        position: 'relative',
        height: `${buttonSize}px`,
        width: variant === 'labeled' ? 'auto' : `${buttonSize}px`,
        padding: variant === 'labeled' ? '0 16px' : '0',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--nav-border)',
        background: isDark ? 'rgba(216, 185, 255, 0.08)' : 'rgba(115, 55, 189, 0.08)',
        color: 'var(--color-primary)',
        cursor: isAnimating ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        outline: 'none',
        transform: `scale(${scaleValue})`,
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered
          ? isDark
            ? '0 0 16px rgba(216, 185, 255, 0.3)'
            : '0 0 16px rgba(115, 55, 189, 0.25)'
          : 'none',
        flexShrink: 0,
        fontFamily: 'var(--font-nav)',
        fontSize: '13px',
        fontWeight: 600,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isHovered ? 'rotate(18deg)' : 'rotate(0deg)',
        }}
      >
        {isDark ? (
          <Sun size={18} strokeWidth={2.2} />
        ) : (
          <Moon size={18} strokeWidth={2.2} />
        )}
      </span>

      {variant === 'labeled' && (
        <span>{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
      )}
    </button>
  );
};
