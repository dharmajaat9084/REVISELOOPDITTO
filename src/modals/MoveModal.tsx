import React, { useState } from 'react';
import { getChap, getDB, getQ, getSub, getTopic, saveDB } from '../lib/db';
import { Modal } from '../components/Modal';

interface MoveModalProps {
  questionId: string;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({ questionId, onClose, onToast }) => {
  const db = getDB();
  const q = getQ(questionId);

  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');

  const availableChapters = db.chapters.filter(
    (c) => c.subjectId === subjectId && !c.isArchived
  );
  const availableTopics = db.topics.filter(
    (t) => t.chapterId === chapterId && !t.isArchived
  );
  const availableSubtopics = db.subtopics.filter(
    (s) => s.topicId === topicId && !s.isArchived
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q) return;
    if (!chapterId) {
      onToast('Pick a chapter', 'alert');
      return;
    }

    let pType: 'chapter' | 'topic' | 'subtopic' = 'chapter';
    let pId = chapterId;
    if (subtopicId) {
      pType = 'subtopic';
      pId = subtopicId;
    } else if (topicId) {
      pType = 'topic';
      pId = topicId;
    }

    q.parentType = pType;
    q.parentId = pId;
    q.folderId = null;
    q.updatedAt = Date.now();

    saveDB();
    onToast('Question moved', 'move');
    onClose();
  };

  return (
    <Modal title="Move question" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Subject</label>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapterId('');
              setTopicId('');
              setSubtopicId('');
            }}
            required
          >
            <option value="">Select…</option>
            {db.subjects
              .filter((s) => !s.isArchived)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>

        <div className="field">
          <label>Chapter</label>
          <select
            value={chapterId}
            onChange={(e) => {
              setChapterId(e.target.value);
              setTopicId('');
              setSubtopicId('');
            }}
            required
          >
            <option value="">Select…</option>
            {availableChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Topic</label>
          <select
            value={topicId}
            onChange={(e) => {
              setTopicId(e.target.value);
              setSubtopicId('');
            }}
          >
            <option value="">None</option>
            {availableTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Subtopic</label>
          <select
            value={subtopicId}
            onChange={(e) => setSubtopicId(e.target.value)}
          >
            <option value="">None</option>
            {availableSubtopics.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mrow">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Move</button>
        </div>
      </form>
    </Modal>
  );
};
