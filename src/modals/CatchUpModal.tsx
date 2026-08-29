import React from 'react';
import { QueueItemInfo } from '../types';
import { Modal } from '../components/Modal';

interface CatchUpModalProps {
  overdueItems: QueueItemInfo[];
  onClose: () => void;
  onSelectCount: (count: number) => void;
}

export const CatchUpModal: React.FC<CatchUpModalProps> = ({
  overdueItems,
  onClose,
  onSelectCount
}) => {
  return (
    <Modal title="Catch-up session" onClose={onClose}>
      <p style={{ fontSize: '.88rem', color: 'var(--muted)', marginBottom: '14px' }}>
        {overdueItems.length} overdue item{overdueItems.length === 1 ? '' : 's'}, sorted by priority. Limit the session to stay comfortable.
      </p>

      <div className="chiprow">
        {[
          [10, '10 items'],
          [20, '20 items'],
          [50, '50 items'],
          [9999, 'All']
        ].map(([n, label]) => (
          <button
            key={label}
            type="button"
            className="chip"
            onClick={() => onSelectCount(n as number)}
          >
            {label}
          </button>
        ))}
      </div>
    </Modal>
  );
};
