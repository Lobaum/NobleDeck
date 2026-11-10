import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface SystemModalProps {
  isOpen?: boolean;
  onClose: () => void;
  maxWidth?: string | number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SystemModal: React.FC<SystemModalProps> = ({
  isOpen = true,
  onClose,
  maxWidth = '620px',
  children,
  className = '',
  style,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="system-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`glass-panel system-modal-card ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          ...style,
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

