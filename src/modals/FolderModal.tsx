import React, { useState } from 'react';
import { getDB, getFolder, saveDB } from '../lib/db';
import { uid } from '../lib/srs';
import { Modal } from '../components/Modal';

interface FolderModalProps {
  parentType: 'chapter' | 'topic' | 'subtopic';
  parentId: string;
  id?: string | null;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  parentType,
  parentId,
  id,
  onClose,
  onToast
}) => {
  const existing = id ? getFolder(id) : null;
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const db = getDB();

    if (id && existing) {
      existing.name = name.trim();
      existing.description = description.trim();
      existing.updatedAt = Date.now();
    } else {
      db.folders.push({
        id: uid(),
        parentType,
        parentId,
        name: name.trim(),
        description: description.trim(),
        isArchived: false,
        sortOrder: db.folders.length,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    saveDB();
    onToast('Folder saved');
    onClose();
  };

  return (
    <Modal title={existing ? 'Edit folder' : 'New question folder'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Folder name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Derivations"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Folder description"
          />
        </div>
        <div className="mrow">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save folder</button>
        </div>
      </form>
    </Modal>
  );
};
