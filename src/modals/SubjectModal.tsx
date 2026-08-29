import React, { useState } from 'react';
import { Subject } from '../types';
import { getDB, getSubj, saveDB } from '../lib/db';
import { uid } from '../lib/srs';
import { Modal } from '../components/Modal';

const PALETTE = [
  { n: 'indigo', c: '#4a6fa5' },
  { n: 'teal', c: '#3f7f7a' },
  { n: 'violet', c: '#8b5f8a' },
  { n: 'emerald', c: '#56795c' },
  { n: 'amber', c: '#c07a26' },
  { n: 'rose', c: '#c65460' },
  { n: 'sky', c: '#5c86ad' },
  { n: 'slate', c: '#7a7264' }
];

const EMOJIS = ['⚡', '🧪', '📐', '🧬', '🏛️', '🌍', '📖', '💻', '🎨', '🧠', '🌿', '⚙️', '📝', '⚖️', '🌌', '💡'];

interface SubjectModalProps {
  id?: string | null;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({ id, onClose, onToast }) => {
  const existing = id ? getSubj(id) : null;
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [color, setColor] = useState(existing?.color || PALETTE[0].c);
  const [icon, setIcon] = useState(existing?.icon || EMOJIS[0]);
  const [targetDate, setTargetDate] = useState(existing?.targetDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const db = getDB();

    if (id && existing) {
      existing.name = name.trim();
      existing.description = description.trim();
      existing.color = color;
      existing.icon = icon;
      existing.targetDate = targetDate || null;
      existing.updatedAt = Date.now();
      saveDB();
      onToast('Subject updated');
    } else {
      const s: Subject = {
        id: uid(),
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        targetDate: targetDate || null,
        isArchived: false,
        sortOrder: db.subjects.length,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      db.subjects.push(s);
      db.lastOpened = { type: 'subject', id: s.id, at: Date.now() };
      saveDB();
      onToast('Subject created');
    }
    onClose();
  };

  return (
    <Modal title={existing ? 'Edit subject' : 'New subject'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Physics"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
          />
        </div>
        <div className="field">
          <label>Color</label>
          <div className="swatches">
            {PALETTE.map((p) => (
              <button
                key={p.c}
                type="button"
                className={`swatch ${color === p.c ? 'sel' : ''}`}
                style={{ background: p.c }}
                onClick={() => setColor(p.c)}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label>Icon</label>
          <div className="emojigrid">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={icon === e ? 'sel' : ''}
                onClick={() => setIcon(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Target / exam date (optional)</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div className="mrow">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">
            {existing ? 'Save' : 'Create subject'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
