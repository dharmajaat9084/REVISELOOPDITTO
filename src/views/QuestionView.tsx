import React from 'react';
import { Question, AppDatabase } from '../types';
import {
  crumbFor,
  getQ,
  logsForType,
  saveDB
} from '../lib/db';
import { cap, fmtShort, maturityOf, relDue, timeAgo, todayISO } from '../lib/srs';
import { Icon } from '../components/Icon';
import { QuestionImageCarousel } from '../components/QuestionImageCarousel';
import { AttachmentsSection } from '../components/AttachmentsSection';

interface QuestionViewProps {
  id: string;
  db: AppDatabase;
  onBack: () => void;
  onStartSingle: (key: string) => void;
  onReschedule: (key: string) => void;
  onMoveModal: (id: string) => void;
  onEditModal: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDeleteQuestion: (id: string) => void;
  onQMenu: (e: React.MouseEvent, id: string) => void;
  onOpenViewer: (id: string) => void;
  onShowMenu: (e: React.MouseEvent, items: any[]) => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
  onPromptPatch: (id: string, field: string, label: string, currentVal: string) => void;
  onNoteModal: (ot: string, oid: string) => void;
}

export const QuestionView: React.FC<QuestionViewProps> = ({
  id,
  db,
  onBack,
  onStartSingle,
  onReschedule,
  onMoveModal,
  onEditModal,
  onDuplicate,
  onDeleteQuestion,
  onQMenu,
  onOpenViewer,
  onShowMenu,
  onToast,
  onAskConfirm,
  onPromptPatch,
  onNoteModal
}) => {
  const q = getQ(id);
  if (!q) {
    return (
      <div className="empty card">
        <div className="eicon">❔</div>
        <h3>Question not found</h3>
        <p>It may have been moved to trash.</p>
        <button className="btn ghost" onClick={onBack}>
          Back to library
        </button>
      </div>
    );
  }

  const s = q.schedule;
  const totalReviews = s.reps + s.lapses;
  const success =
    totalReviews > 0 ? Math.round((s.reps / totalReviews) * 100) : null;
  const leit = db.settings.srs.mode === 'leitner';

  const crumb = crumbFor('question', q.id);
  const crumbText = crumb
    .slice(0, -1)
    .map((c) => c.name)
    .join(' › ');

  const logs = logsForType('question', q.id);

  const handleToggleSuspend = () => {
    q.isSuspended = !q.isSuspended;
    saveDB();
    onToast(q.isSuspended ? 'Suspended' : 'Resumed', q.isSuspended ? 'pause' : 'play');
  };

  const renderDueBadge = () => {
    if (q.isSuspended) return <span className="badge b-suspended">Suspended</span>;
    const t = todayISO();
    if (!s.lastReviewed) return <span className="badge b-new">New</span>;
    if (s.due < t) return <span className="badge b-overdue">Overdue</span>;
    if (s.due === t) return <span className="badge b-due">Due today</span>;
    return <span className="badge b-ok">{relDue(s.due)}</span>;
  };

  return (
    <div>
      <div className="pagehead">
        <div style={{ minWidth: 0 }}>
          <button
            className="btn ghost small"
            onClick={onBack}
            style={{ marginBottom: '10px' }}
          >
            <Icon name="back" size={14} /> Back
          </button>
          <h1>{q.title}</h1>
          {crumbText && (
            <div className="crumb" style={{ marginTop: '6px' }}>
              {crumbText}
            </div>
          )}
        </div>
        <div className="grow" />
        <button
          className="ibtn"
          onClick={(e) => onQMenu(e, q.id)}
          title="Options"
        >
          <Icon name="dots" />
        </button>
      </div>

      <div className="card" style={{ padding: '22px', marginBottom: '14px' }}>
        <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--muted)' }}>
          {q.prompt || 'No prompt — revise from your notes.'}
        </p>

        <QuestionImageCarousel questionId={q.id} onOpenViewer={onOpenViewer} />

        <div className="chiprow" style={{ marginTop: '14px' }}>
          {renderDueBadge()}
          <span className={`badge b-${maturityOf(s)}`}>
            {cap(maturityOf(s))}
          </span>
          {q.priority === 'exam-critical' ? (
            <span className="badge b-overdue">
              <Icon name="flag" size={11} /> Exam-critical
            </span>
          ) : q.priority === 'high' ? (
            <span className="badge b-established">
              <Icon name="flag" size={11} /> High
            </span>
          ) : null}
          {(q.tags || []).map((tg) => (
            <span key={tg} className="tag">
              #{tg}
            </span>
          ))}
        </div>

        {q.referenceLocation && (
          <div className="refbox" style={{ marginTop: '14px' }}>
            <Icon
              name={q.referenceType === 'url' ? 'external' : 'bookopen'}
              size={14}
            />
            {cap(q.referenceType || 'ref')} · {q.referenceLocation}
            {q.referenceType === 'url' && /^https?:/.test(q.referenceLocation) && (
              <a
                href={q.referenceLocation}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-2)', fontWeight: 800, marginLeft: '6px' }}
              >
                Open
              </a>
            )}
          </div>
        )}

        {q.note && (
          <div className="crumb" style={{ marginTop: '10px' }}>
            💬 {q.note}
          </div>
        )}
      </div>

      <div className="sectiontitle">Schedule</div>
      <div className="card" style={{ padding: '18px', marginBottom: '6px' }}>
        <div className="kvgrid">
          <div className="kv">
            <div className="k">Due</div>
            <div className="v">
              {fmtShort(s.due)}{' '}
              <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.75rem' }}>
                ({relDue(s.due)})
              </span>
            </div>
          </div>
          <div className="kv">
            <div className="k">Interval</div>
            <div className="v">{s.interval || 0} days</div>
          </div>
          <div className="kv">
            <div className="k">{leit ? 'Box' : 'Ease'}</div>
            <div className="v">{leit ? `#${s.box || 1}` : (s.ease || 2.5).toFixed(2)}</div>
          </div>
          <div className="kv">
            <div className="k">Reviews</div>
            <div className="v">{s.reps}</div>
          </div>
          <div className="kv">
            <div className="k">Lapses</div>
            <div className="v">{s.lapses}</div>
          </div>
          <div className="kv">
            <div className="k">Success</div>
            <div className="v">{success === null ? '—' : `${success}%`}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button
            className="btn primary small"
            onClick={() => onStartSingle(`question:${q.id}`)}
          >
            <Icon name="play" size={14} /> Revise now
          </button>
          <button
            className="btn ghost small"
            onClick={() => onReschedule(`question:${q.id}`)}
          >
            <Icon name="refresh" size={14} /> Reschedule
          </button>
          <button
            className={`btn small ${q.isSuspended ? 'soft' : 'ghost'}`}
            onClick={handleToggleSuspend}
          >
            <Icon name={q.isSuspended ? 'play' : 'pause'} size={14} />
            {q.isSuspended ? 'Resume' : 'Suspend'}
          </button>
          <button
            className="btn ghost small"
            onClick={() => onEditModal(q.id)}
          >
            <Icon name="edit" size={14} /> Edit
          </button>
          <button
            className="btn ghost small"
            onClick={() => onDuplicate(q.id)}
          >
            <Icon name="copy" size={14} /> Duplicate
          </button>
          <button
            className="btn ghost small"
            onClick={() => onMoveModal(q.id)}
          >
            <Icon name="move" size={14} /> Move
          </button>
          <button
            className="btn danger small"
            onClick={() => onDeleteQuestion(q.id)}
          >
            <Icon name="trash" size={14} /> Delete
          </button>
        </div>
      </div>

      <AttachmentsSection
        ownerType="question"
        ownerId={q.id}
        onOpenViewer={onOpenViewer}
        onShowMenu={onShowMenu}
        onToast={onToast}
        onAskConfirm={onAskConfirm}
        onPromptPatch={onPromptPatch}
        onNoteModal={onNoteModal}
      />

      <div className="sectiontitle">History ({logs.length})</div>
      <div className="card" style={{ padding: '18px' }}>
        {logs.length === 0 ? (
          <div className="crumb">No reviews yet.</div>
        ) : (
          <div className="tl">
            {logs.slice(0, 12).map((l) => (
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
                  {q.title}{' '}
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
