import React, { useState } from 'react';
import { EntityType } from '../types';
import { getDB, nodeObj, saveDB } from '../lib/db';
import { cap, uid } from '../lib/srs';
import { Modal } from '../components/Modal';

interface NodeModalProps {
  kind: 'chapter' | 'topic' | 'subtopic';
  parentType: EntityType;
  parentId: string;
  id?: string | null;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
}

export const NodeModal: React.FC<NodeModalProps> = ({
  kind,
  parentType,
  parentId,
  id,
  onClose,
  onToast
}) => {
  const existing = id ? nodeObj(kind, id) : null;
  const parentNode = nodeObj(parentType, parentId);
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const db = getDB();
    const arr =
      kind === 'chapter'
        ? db.chapters
        : kind === 'topic'
        ? db.topics
        : db.subtopics;

    if (id && existing) {
      existing.name = name.trim();
      existing.description = description.trim();
      existing.updatedAt = Date.now();
      saveDB();
    } else {
      const o: any = {
        id: uid(),
        name: name.trim(),
        description: description.trim(),
        isArchived: false,
        sortOrder: arr.length,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      if (kind === 'chapter') o.subjectId = parentId;
      else if (kind === 'topic') o.chapterId = parentId;
      else o.topicId = parentId;
      arr.push(o);
      saveDB();
    }

    onToast(`${cap(kind)} saved`);
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          {existing ? 'Edit ' : 'New '}
          {kind}
          {parentNode && (
            <span style={{ color: 'var(--muted)', fontSize: '.8rem', marginLeft: '6px' }}>
              · in {parentNode.name}
            </span>
          )}
        </span>
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${cap(kind)} name`}
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
        <div className="mrow">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">
            {existing ? 'Save' : `Create ${kind}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
