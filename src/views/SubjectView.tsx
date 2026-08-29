import React from 'react';
import { Subject, AppDatabase } from '../types';
import {
  containerProgress,
  dueCountOf,
  getSubj,
  logsForType,
  overdueCountOf,
  questionsIn
} from '../lib/db';
import { daysBetween, fmtMed, fmtShort, timeAgo, todayISO, cap } from '../lib/srs';
import { Icon } from '../components/Icon';
import { AttachmentsSection } from '../components/AttachmentsSection';

interface SubjectViewProps {
  id: string;
  db: AppDatabase;
  onBack: () => void;
  onOpenChapter: (id: string) => void;
  onAddChapter: () => void;
  onNodeMenu: (e: React.MouseEvent, type: string, id: string) => void;
  onOpenViewer: (id: string) => void;
  onShowMenu: (e: React.MouseEvent, items: any[]) => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
  onPromptPatch: (id: string, field: string, label: string, currentVal: string) => void;
  onNoteModal: (ot: string, oid: string) => void;
}

export const SubjectView: React.FC<SubjectViewProps> = ({
  id,
  db,
  onBack,
  onOpenChapter,
  onAddChapter,
  onNodeMenu,
  onOpenViewer,
  onShowMenu,
  onToast,
  onAskConfirm,
  onPromptPatch,
  onNoteModal
}) => {
  const s = getSubj(id);
  if (!s) {
    return (
      <div className="empty card">
        <div className="eicon">❔</div>
        <h3>Subject not found</h3>
        <p>It may have been deleted.</p>
        <button className="btn ghost" onClick={onBack}>
          Back to library
        </button>
      </div>
    );
  }

  const chs = db.chapters.filter((c) => c.subjectId === s.id);
  const due = dueCountOf('subject', s.id);
  const od = overdueCountOf('subject', s.id);
  const qs = questionsIn('subject', s.id);
  const prog = containerProgress('subject', s.id);
  const logs = logsForType('subject', s.id);

  const t = todayISO();

  return (
    <div>
      <div className="pagehead">
        <div style={{ minWidth: 0 }}>
          <button
            className="btn ghost small"
            onClick={onBack}
            style={{ marginBottom: '10px' }}
          >
            <Icon name="back" size={14} /> Library
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '5px',
                background: s.color
              }}
            />
            {s.name}
            {s.isArchived && <span className="badge b-suspended">Archived</span>}
          </h1>
          <div className="sub">{s.description || 'Subject'}</div>
        </div>
        <div className="grow" />
        <button
          className="btn small soft"
          onClick={() => onNoteModal('subject', s.id)}
        >
          <Icon name="clip" size={14} /> Attach
        </button>
        <button
          className="ibtn"
          onClick={(e) => onNodeMenu(e, 'subject', s.id)}
          title="Options"
        >
          <Icon name="dots" />
        </button>
      </div>

      <div className="chiprow" style={{ marginBottom: '6px' }}>
        <span className="badge b-due">{due} due</span>
        <span className="badge b-overdue">{od} overdue</span>
        <span className="badge b-plain">{qs.length} questions</span>
        {prog !== null && (
          <span className="badge b-mastered">{Math.round(prog * 100)}% mastery</span>
        )}
        {logs.length > 0 ? (
          <span className="badge b-ok">last review {timeAgo(logs[0].at)}</span>
        ) : (
          <span className="badge b-new">never reviewed</span>
        )}
      </div>

      {s.targetDate && s.targetDate >= t && (
        <div
          className="card"
          style={{
            padding: '12px 16px',
            margin: '12px 0',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            color: 'var(--warn)',
            fontWeight: 700,
            fontSize: '.88rem'
          }}
        >
          <Icon name="target" size={16} />
          Target exam in {daysBetween(t, s.targetDate)} days · {fmtMed(s.targetDate)}
        </div>
      )}

      <div className="sectiontitle">
        Chapters <span className="grow" />
        <button className="btn small soft" onClick={onAddChapter}>
          <Icon name="plus" size={14} /> Chapter
        </button>
      </div>

      {chs.length === 0 ? (
        <div className="empty card">
          <div className="eicon">📖</div>
          <h3>No chapters yet</h3>
          <p>Add your first chapter to start organising topics and questions.</p>
          <button className="btn primary" onClick={onAddChapter}>
            Add chapter
          </button>
        </div>
      ) : (
        chs.map((c) => {
          const cDue = dueCountOf('chapter', c.id);
          const cProg = containerProgress('chapter', c.id);
          const topN = db.topics.filter((tp) => tp.chapterId === c.id).length;
          const qN = questionsIn('chapter', c.id).length;

          return (
            <div
              key={c.id}
              className={`rowcard click ${c.isArchived ? 'dim' : ''}`}
              onClick={() => onOpenChapter(c.id)}
            >
              <div
                className="ricon"
                style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
              >
                <Icon name="book" size={18} />
              </div>
              <div className="rmain">
                <div className="rtitle">{c.name}</div>
                <div className="rmeta">
                  {topN} topics · {qN} questions
                  {cDue > 0 && <span className="badge b-due">{cDue} due</span>}
                  {c.isArchived && <span className="badge b-suspended">Archived</span>}
                </div>
                {cProg !== null && (
                  <div className="bar" style={{ marginTop: '7px', maxWidth: '220px' }}>
                    <div
                      className="barfill"
                      style={{ width: `${Math.round(cProg * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                className="ibtn"
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeMenu(e, 'chapter', c.id);
                }}
                title="Options"
              >
                <Icon name="dots" />
              </button>
              <Icon name="chev" size={16} />
            </div>
          );
        })
      )}

      <AttachmentsSection
        ownerType="subject"
        ownerId={s.id}
        onOpenViewer={onOpenViewer}
        onShowMenu={onShowMenu}
        onToast={onToast}
        onAskConfirm={onAskConfirm}
        onPromptPatch={onPromptPatch}
        onNoteModal={onNoteModal}
      />

      <div className="sectiontitle">Recent activity</div>
      <div className="card" style={{ padding: '18px' }}>
        {logs.length === 0 ? (
          <div className="crumb">No reviews yet.</div>
        ) : (
          <div className="tl">
            {logs.slice(0, 6).map((l) => (
              <div key={l.id} className="tlitem">
                <div
                  style={{
                    position: 'absolute',
                    left: '-19px',
                    top: '5px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background:
                      l.rating === 'again'
                        ? 'var(--danger)'
                        : l.rating === 'hard'
                        ? 'var(--warn)'
                        : l.rating === 'good'
                        ? 'var(--ok)'
                        : 'var(--accent-2)',
                    border: '2px solid var(--surface)'
                  }}
                />
                <div className="t">
                  {db.questions.find((x) => x.id === l.itemId)?.title ||
                    db.chapters.find((x) => x.id === l.itemId)?.name ||
                    'Review item'}{' '}
                  <span className="badge b-plain">{cap(l.rating)}</span>
                </div>
                <div className="m">
                  {timeAgo(l.at)} · interval {l.prevInterval}d → {l.newInterval}d
                  {l.reflection ? ` · “${l.reflection}”` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
