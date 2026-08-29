import React, { useRef, useState, useEffect } from 'react';
import { EntityType, PriorityLevel, Question } from '../types';
import { getChap, getDB, getQ, getSub, getTopic, saveDB } from '../lib/db';
import { cap, newSchedule, uid } from '../lib/srs';
import { ingestFiles, ingestTextNote } from '../lib/backup';
import { kindOf } from '../lib/idb';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';

interface QuestionModalProps {
  id?: string | null;
  parentType?: EntityType | null;
  parentId?: string | null;
  folderId?: string | null;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
  onOpenTextNote?: () => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  id,
  parentType: initParentType,
  parentId: initParentId,
  folderId: initFolderId,
  onClose,
  onToast
}) => {
  const db = getDB();
  const existing = id ? getQ(id) : null;

  // Determine initial cascade
  let pType = existing ? existing.parentType : initParentType || 'chapter';
  let pId = existing ? existing.parentId : initParentId || '';

  let initialSubjectId = '';
  let initialChapterId = '';
  let initialTopicId = '';
  let initialSubtopicId = '';

  if (pType === 'chapter') {
    initialChapterId = pId;
    const c = getChap(pId);
    if (c) initialSubjectId = c.subjectId;
  } else if (pType === 'topic') {
    initialTopicId = pId;
    const tp = getTopic(pId);
    if (tp) {
      initialChapterId = tp.chapterId;
      const c = getChap(tp.chapterId);
      if (c) initialSubjectId = c.subjectId;
    }
  } else if (pType === 'subtopic') {
    initialSubtopicId = pId;
    const st = getSub(pId);
    if (st) {
      initialTopicId = st.topicId;
      const tp = getTopic(st.topicId);
      if (tp) {
        initialChapterId = tp.chapterId;
        const c = getChap(tp.chapterId);
        if (c) initialSubjectId = c.subjectId;
      }
    }
  }

  const [title, setTitle] = useState(existing?.title || '');
  const [prompt, setPrompt] = useState(existing?.prompt || '');
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [chapterId, setChapterId] = useState(initialChapterId);
  const [topicId, setTopicId] = useState(initialTopicId);
  const [subtopicId, setSubtopicId] = useState(initialSubtopicId);
  const [folder, setFolder] = useState(existing?.folderId || initFolderId || '');
  const [priority, setPriority] = useState<PriorityLevel>(existing?.priority || 'normal');
  const [tags, setTags] = useState((existing?.tags || []).join(', '));
  const [refType, setRefType] = useState(existing?.referenceType || '');
  const [refLoc, setRefLoc] = useState(existing?.referenceLocation || '');
  const [note, setNote] = useState(existing?.note || '');
  const [asQuestionImage, setAsQuestionImage] = useState(false);

  // Pending files to attach
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingNotes, setPendingNotes] = useState<{ name: string; text: string }[]>([]);
  const [showAddTextNote, setShowAddTextNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');

  const attInputRef = useRef<HTMLInputElement | null>(null);
  const camInputRef = useRef<HTMLInputElement | null>(null);

  // Filter cascades
  const availableChapters = db.chapters.filter(
    (c) => c.subjectId === subjectId && !c.isArchived
  );
  const availableTopics = db.topics.filter(
    (t) => t.chapterId === chapterId && !t.isArchived
  );
  const availableSubtopics = db.subtopics.filter(
    (s) => s.topicId === topicId && !s.isArchived
  );

  let currentParentType: 'chapter' | 'topic' | 'subtopic' = 'chapter';
  let currentParentId = chapterId;
  if (subtopicId) {
    currentParentType = 'subtopic';
    currentParentId = subtopicId;
  } else if (topicId) {
    currentParentType = 'topic';
    currentParentId = topicId;
  }

  const availableFolders = db.folders.filter(
    (f) =>
      f.parentType === currentParentType &&
      f.parentId === currentParentId &&
      !f.isArchived
  );

  const handleAddFiles = (filesList: FileList | null) => {
    if (filesList) {
      setPendingFiles((prev) => [...prev, ...Array.from(filesList)]);
    }
  };

  const handleSaveTextNote = () => {
    if (!noteText.trim()) return;
    setPendingNotes((prev) => [
      ...prev,
      { name: noteTitle.trim() || 'Text Note', text: noteText.trim() }
    ]);
    setNoteTitle('');
    setNoteText('');
    setShowAddTextNote(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!chapterId) {
      onToast('Pick a subject and chapter', 'alert');
      return;
    }

    let finalParentType: 'chapter' | 'topic' | 'subtopic' = 'chapter';
    let finalParentId = chapterId;
    if (subtopicId) {
      finalParentType = 'subtopic';
      finalParentId = subtopicId;
    } else if (topicId) {
      finalParentType = 'topic';
      finalParentId = topicId;
    }

    const cleanTags = tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    let qId = id;
    if (id && existing) {
      existing.title = title.trim();
      existing.prompt = prompt.trim();
      existing.parentType = finalParentType;
      existing.parentId = finalParentId;
      existing.folderId = folder || null;
      existing.priority = priority;
      existing.tags = cleanTags;
      existing.referenceType = refType || null;
      existing.referenceLocation = refLoc.trim() || null;
      existing.note = note.trim();
      existing.updatedAt = Date.now();
      saveDB();
      onToast('Question updated');
    } else {
      const newQ: Question = {
        id: uid(),
        parentType: finalParentType,
        parentId: finalParentId,
        folderId: folder || null,
        title: title.trim(),
        prompt: prompt.trim(),
        referenceType: refType || null,
        referenceLocation: refLoc.trim() || null,
        priority,
        tags: cleanTags,
        note: note.trim(),
        isArchived: false,
        isSuspended: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schedule: newSchedule(db.settings.srs.easeStart)
      };
      db.questions.push(newQ);
      qId = newQ.id;
      saveDB();
      onToast('Question added to queue');
    }

    // Attach pending files
    if (qId) {
      const role = asQuestionImage ? 'question' : 'note';
      if (pendingFiles.length) {
        await ingestFiles(pendingFiles, 'question', qId, role);
      }
      for (const n of pendingNotes) {
        await ingestTextNote(n.text, n.name, 'question', qId, 'note');
      }
    }

    onClose();
  };

  return (
    <Modal
      title={existing ? 'Edit question' : 'New question'}
      wide={true}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Title *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short name"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Revision prompt</label>
          <textarea
            className="lined-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Revise the derivation and examples from your notes."
          />
        </div>

        <div className="field">
          <label>
            Attachments{' '}
            <span style={{ textTransform: 'none', fontWeight: 600, color: 'var(--muted)' }}>
              (paste Ctrl+V · drag & drop · pick · camera)
            </span>
          </label>
          <div className="attbar" style={{ marginBottom: '6px' }}>
            <button
              type="button"
              className="btn small soft"
              onClick={() => attInputRef.current?.click()}
            >
              <Icon name="clip" size={14} /> Attach
            </button>
            <button
              type="button"
              className="btn small ghost"
              onClick={() => camInputRef.current?.click()}
            >
              <Icon name="cam" size={14} /> Camera
            </button>
            <button
              type="button"
              className="btn small ghost"
              onClick={() => setShowAddTextNote(true)}
            >
              <Icon name="edit" size={14} /> Text note
            </button>
          </div>

          <label
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              fontSize: '.8rem',
              fontWeight: 700,
              marginBottom: '6px',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={asQuestionImage}
              onChange={(e) => setAsQuestionImage(e.target.checked)}
            />
            Attached images are the question itself (image-question mode)
          </label>

          <input
            ref={attInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.txt,.md,audio/*"
            style={{ display: 'none' }}
            onChange={(e) => handleAddFiles(e.target.files)}
          />
          <input
            ref={camInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handleAddFiles(e.target.files)}
          />

          <div className="pendlist">
            {pendingFiles.map((f, i) => (
              <div key={i} className="prow">
                <Icon
                  name={kindOf(f.type, f.name) === 'image' ? 'cam' : 'file'}
                  size={14}
                />
                <span>{f.name}</span>
                <button
                  type="button"
                  className="ibtn"
                  onClick={() =>
                    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
            {pendingNotes.map((n, i) => (
              <div key={i} className="prow">
                <Icon name="edit" size={14} />
                <span>{n.name}</span>
                <button
                  type="button"
                  className="ibtn"
                  onClick={() =>
                    setPendingNotes((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {showAddTextNote && (
          <div
            className="card"
            style={{ padding: '14px', marginBottom: '14px', background: 'var(--surface2)' }}
          >
            <div className="field">
              <label>Note title</label>
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Key pointers"
              />
            </div>
            <div className="field">
              <label>Text</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type or paste note text..."
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setShowAddTextNote(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn small primary"
                onClick={handleSaveTextNote}
              >
                Add Note
              </button>
            </div>
          </div>
        )}

        <div className="frow">
          <div className="field">
            <label>Subject *</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setChapterId('');
                setTopicId('');
                setSubtopicId('');
                setFolder('');
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
            <label>Chapter *</label>
            <select
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setTopicId('');
                setSubtopicId('');
                setFolder('');
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
        </div>

        <div className="frow">
          <div className="field">
            <label>Topic (optional)</label>
            <select
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setSubtopicId('');
                setFolder('');
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
            <label>Subtopic (optional)</label>
            <select
              value={subtopicId}
              onChange={(e) => {
                setSubtopicId(e.target.value);
                setFolder('');
              }}
            >
              <option value="">None</option>
              {availableSubtopics.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Question folder (optional)</label>
          <select value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">No folder</option>
            {availableFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="frow">
          <div className="field">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            >
              {(['low', 'normal', 'high', 'exam-critical'] as PriorityLevel[]).map((p) => (
                <option key={p} value={p}>
                  {cap(p)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="formula, diagram…"
            />
          </div>
        </div>

        <div className="frow">
          <div className="field">
            <label>Reference type</label>
            <select
              value={refType}
              onChange={(e) => setRefType(e.target.value)}
            >
              <option value="">None</option>
              {['book', 'notebook', 'file', 'url', 'page'].map((r) => (
                <option key={r} value={r}>
                  {cap(r)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Reference location</label>
            <input
              value={refLoc}
              onChange={(e) => setRefLoc(e.target.value)}
              placeholder="p. 42 / note title / URL"
            />
          </div>
        </div>

        <div className="field">
          <label>Short note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Private note, not full notes"
          />
        </div>

        <div className="mrow">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">
            {existing ? 'Save changes' : 'Add question'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
