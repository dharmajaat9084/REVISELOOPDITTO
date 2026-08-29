import React from 'react';
import { Icon } from './Icon';

interface ModalProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ title, children, wide = false, onClose }) => {
  return (
    <div
      className="mback"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="mhead">
          <h3>{title}</h3>
          <button className="ibtn" onClick={onClose} title="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="mbody">{children}</div>
      </div>
    </div>
  );
};
