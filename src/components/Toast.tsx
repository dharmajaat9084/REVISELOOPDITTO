import React from 'react';
import { Icon } from './Icon';

export interface ToastItem {
  id: string;
  msg: string;
  icon?: string;
}

interface ToastProps {
  toasts: ToastItem[];
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts }) => {
  return (
    <div id="toastRoot">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <Icon name={t.icon || 'check'} size={16} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
};
