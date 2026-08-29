import React, { useState } from 'react';
import { ingestTextNote } from '../lib/backup';
import { fmtShort, todayISO } from '../lib/srs';
import { Modal } from '../components/Modal';

interface TextNoteModalProps {
  ownerType: string;
  ownerId: string;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
  onSuccess?: () => void;
}

export const TextNoteModal: React.FC<TextNoteModalProps> = ({
  ownerType,
  ownerId,
  onClose,
  onToast,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      onToast('Note is empty', 'alert');
      return;
    }

    await ingestTextNote(
      text.trim(),
      name.trim() || `Note · ${fmtShort(todayISO())}`,
      ownerType,
      ownerId,
      'note'
    );
    onToast('Note saved ✍️', 'edit');
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal title="Add text note" onClose={onClose}>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>Note name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My summary"
          />
        </div>
        <div className="field">
          <label>Text</label>
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: '140px' }}
            placeholder="Type or paste…"
            autoFocus
          />
        </div>
        <div className="mrow">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save note</button>
        </div>
      </form>
    </Modal>
  );
};
