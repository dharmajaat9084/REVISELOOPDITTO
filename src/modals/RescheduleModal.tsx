import React, { useState } from 'react';
import { getScheduleByRef, parseRefKey, saveDB } from '../lib/db';
import { addDays, relDue, todayISO } from '../lib/srs';
import { Modal } from '../components/Modal';

interface RescheduleModalProps {
  itemKey: string;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  itemKey,
  onClose,
  onToast
}) => {
  const [customDate, setCustomDate] = useState(todayISO());
  const ref = parseRefKey(itemKey);
  const sched = getScheduleByRef(ref);

  const applyOffset = (days: number) => {
    if (!sched) return;
    sched.due = addDays(todayISO(), days);
    saveDB();
    onToast(`Rescheduled — ${relDue(sched.due)}`, 'calendar');
    onClose();
  };

  const applyCustom = () => {
    if (!sched || !customDate) return;
    sched.due = customDate;
    saveDB();
    onToast(`Rescheduled — ${relDue(sched.due)}`, 'calendar');
    onClose();
  };

  return (
    <Modal title="Reschedule" onClose={onClose}>
      <div className="chiprow" style={{ marginBottom: '14px' }}>
        {[
          ['Today', 0],
          ['Tomorrow', 1],
          ['In 3 days', 3],
          ['Next week', 7],
          ['In 2 weeks', 14]
        ].map(([lbl, n]) => (
          <button
            key={lbl}
            type="button"
            className="chip"
            onClick={() => applyOffset(n as number)}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="field">
        <label>Custom date</label>
        <input
          type="date"
          min={todayISO()}
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
        />
      </div>

      <div className="mrow">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn primary" onClick={applyCustom}>
          Apply date
        </button>
      </div>
    </Modal>
  );
};
