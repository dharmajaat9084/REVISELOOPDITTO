import React, { useEffect } from 'react';
import { Icon } from './Icon';

export interface MenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  fn: () => void;
}

interface ContextMenuProps {
  items: MenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.ctxmenu')) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleDown);
    return () => document.removeEventListener('pointerdown', handleDown);
  }, [onClose]);

  const posX = Math.max(8, Math.min(x, window.innerWidth - 210));
  const posY = Math.max(8, Math.min(y, window.innerHeight - items.length * 38 - 20));

  return (
    <div
      className="ctxmenu"
      style={{
        left: `${posX}px`,
        top: `${posY}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) => (
        <button
          key={i}
          className={it.danger ? 'danger' : ''}
          onClick={() => {
            onClose();
            it.fn();
          }}
        >
          <Icon name={it.icon || 'check'} size={15} />
          {it.label}
        </button>
      ))}
    </div>
  );
};
