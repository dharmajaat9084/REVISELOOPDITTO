import React, { useState } from 'react';
import { Subject, AppDatabase } from '../types';
import { dueCountOf, overdueCountOf, containerProgress } from '../lib/db';
import { fmtShort } from '../lib/srs';
import { Icon } from '../components/Icon';
import { ProgressRing } from '../components/ProgressRing';

interface LibraryViewProps {
  db: AppDatabase;
  onOpenSubject: (id: string) => void;
  onNewSubject: () => void;
  onSubjectMenu: (e: React.MouseEvent, id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  db,
  onOpenSubject,
  onNewSubject,
  onSubjectMenu
}) => {
  const [filter, setFilter] = useState<'active' | 'due' | 'archived'>('active');
  const [sort, setSort] = useState<'recent' | 'name' | 'due' | 'progress'>('recent');

  let subs = db.subjects.slice();
  if (filter === 'active') subs = subs.filter((s) => !s.isArchived);
  if (filter === 'archived') subs = subs.filter((s) => s.isArchived);
  if (filter === 'due') subs = subs.filter((s) => dueCountOf('subject', s.id) > 0);

  if (sort === 'name') subs.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'due') subs.sort((a, b) => dueCountOf('subject', b.id) - dueCountOf('subject', a.id));
  if (sort === 'progress') {
    subs.sort((a, b) => (containerProgress('subject', b.id) || 0) - (containerProgress('subject', a.id) || 0));
  }
  if (sort === 'recent') subs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Library</h1>
          <div className="sub">
            {db.subjects.length} subjects · {db.questions.length} questions
          </div>
        </div>
        <div className="grow" />
        <select
          style={{ width: 'auto' }}
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
        >
          <option value="recent">Recently updated</option>
          <option value="name">Name A–Z</option>
          <option value="due">Most due</option>
          <option value="progress">Progress</option>
        </select>
        <button className="btn primary" onClick={onNewSubject}>
          <Icon name="plus" size={16} />
          Subject
        </button>
      </div>

      <div className="chiprow" style={{ marginBottom: '16px' }}>
        {[
          ['active', 'Active'],
          ['due', 'With due items'],
          ['archived', 'Archived']
        ].map(([fKey, fLbl]) => (
          <button
            key={fKey}
            type="button"
            className={`chip ${filter === fKey ? 'active' : ''}`}
            onClick={() => setFilter(fKey as any)}
          >
            {fLbl}
          </button>
        ))}
      </div>

      {subs.length === 0 ? (
        <div className="empty card">
          <div className="eicon">📚</div>
          <h3>Your library is empty</h3>
          <p>Create your first subject to start building your revision plan.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn primary" onClick={onNewSubject}>
              <Icon name="plus" size={15} /> Add subject
            </button>
            {db.subjects.length > 0 && (
              <button className="btn ghost" onClick={() => setFilter('archived')}>
                View archived
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="cardgrid">
          {subs.map((s) => {
            const due = dueCountOf('subject', s.id);
            const od = overdueCountOf('subject', s.id);
            const chN = db.chapters.filter((c) => c.subjectId === s.id).length;
            const prog = containerProgress('subject', s.id);

            return (
              <div
                key={s.id}
                className={`card subjectcard ${s.isArchived ? 'dim' : ''}`}
                onClick={() => onOpenSubject(s.id)}
              >
                <div className="sbar" style={{ background: s.color }} />
                <div className="subjhead">
                  <div
                    className="subjicon"
                    style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)` }}
                  >
                    {s.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rtitle">{s.name}</div>
                    <div className="rmeta">
                      {chN} chapter{chN === 1 ? '' : 's'}
                      {s.targetDate ? ` · ${fmtShort(s.targetDate)}` : ''}
                    </div>
                  </div>
                  {prog !== null && (
                    <ProgressRing pct={prog} size={42} stroke={5} color={s.color} />
                  )}
                </div>

                <div className="rmeta" style={{ marginTop: '6px' }}>
                  {due > 0 && <span className="badge b-due">{due} due</span>}
                  {od > 0 && <span className="badge b-overdue">{od} overdue</span>}
                  {s.isArchived && <span className="badge b-suspended">Archived</span>}
                  {!due && !od && <span className="badge b-ok">On track</span>}
                </div>

                <button
                  type="button"
                  className="ibtn"
                  style={{ position: 'absolute', top: '10px', right: '10px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubjectMenu(e, s.id);
                  }}
                  title="Options"
                >
                  <Icon name="dots" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
