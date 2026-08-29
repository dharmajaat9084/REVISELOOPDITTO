import React from 'react';
import { getChap, getDB, getSub, getTopic, saveDB } from '../lib/db';
import { timeAgo, uid } from '../lib/srs';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { Subject, Chapter } from '../types';

interface TrashModalProps {
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  onClose,
  onToast,
  onAskConfirm
}) => {
  const db = getDB();

  const handleRestore = (index: number) => {
    const tr = db.trash[index];
    if (!tr) return;
    const q = tr.q;

    const parentOk =
      (q.parentType === 'chapter' && getChap(q.parentId)) ||
      (q.parentType === 'topic' && getTopic(q.parentId)) ||
      (q.parentType === 'subtopic' && getSub(q.parentId));

    if (!parentOk) {
      let s = db.subjects.find((x) => x.name === 'Recovered');
      if (!s) {
        s = {
          id: uid(),
          name: 'Recovered',
          description: 'Restored items',
          color: '#7a7264',
          icon: '📁',
          targetDate: null,
          isArchived: false,
          sortOrder: db.subjects.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        db.subjects.push(s);
      }
      let c = db.chapters.find((x) => x.subjectId === s?.id && x.name === 'Unsorted');
      if (!c && s) {
        c = {
          id: uid(),
          subjectId: s.id,
          name: 'Unsorted',
          description: '',
          isArchived: false,
          sortOrder: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        db.chapters.push(c);
      }
      if (c) {
        q.parentType = 'chapter';
        q.parentId = c.id;
        q.folderId = null;
      }
    }

    db.questions.push(q);
    db.trash.splice(index, 1);
    saveDB();
    onToast('Restored', 'inbox');
  };

  const handlePurge = (index: number) => {
    db.trash.splice(index, 1);
    saveDB();
    onToast('Deleted forever', 'trash');
  };

  const handleEmptyTrash = () => {
    onAskConfirm('Empty trash', 'Permanently delete all trashed questions?', () => {
      db.trash = [];
      saveDB();
      onToast('Trash emptied');
    });
  };

  return (
    <Modal title={`Trash (${db.trash.length})`} onClose={onClose}>
      {db.trash.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <button type="button" className="btn small danger" onClick={handleEmptyTrash}>
            Empty trash
          </button>
        </div>
      )}

      {db.trash.length === 0 ? (
        <div className="empty card" style={{ padding: '30px 10px' }}>
          <div className="eicon">🗑️</div>
          <h3>Trash is empty</h3>
          <p>Deleted questions land here for safe recovery.</p>
        </div>
      ) : (
        db.trash.map((tr, i) => (
          <div
            key={tr.q.id}
            className="rowcard"
            style={{ boxShadow: 'none', marginBottom: '8px' }}
          >
            <div className="rmain">
              <div className="rtitle">{tr.q.title}</div>
              <div className="crumb">deleted {timeAgo(tr.deletedAt)}</div>
            </div>
            <button
              type="button"
              className="btn small soft"
              onClick={() => handleRestore(i)}
            >
              Restore
            </button>
            <button
              type="button"
              className="ibtn"
              onClick={() => handlePurge(i)}
              title="Delete permanently"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))
      )}

      <div className="mrow">
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
};
