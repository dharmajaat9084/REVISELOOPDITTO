import React, { useState } from 'react';
import { QueueItemInfo, AppDatabase } from '../types';
import {
  allRefs,
  crumbFor,
  dueQueue,
  refArchived,
  refInfo,
  refKey,
  todayCount
} from '../lib/db';
import {
  addDays,
  fmtLong,
  fmtShort,
  prioW,
  relDue,
  timeAgo,
  todayISO
} from '../lib/srs';
import { Icon } from '../components/Icon';
import { ProgressRing } from '../components/ProgressRing';

interface TodayViewProps {
  db: AppDatabase;
  onStartReview: (scope: 'due' | 'overdue' | 'ahead') => void;
  onStartSingle: (key: string) => void;
  onOpenRef: (type: string, id: string) => void;
  onNav: (view: string, id?: string) => void;
  onQuestionModal: (opts?: any) => void;
  onQueueMenu: (e: React.MouseEvent, key: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  db,
  onStartReview,
  onStartSingle,
  onOpenRef,
  onNav,
  onQuestionModal,
  onQueueMenu
}) => {
  const [filter, setFilter] = useState<'all' | 'question' | 'node' | 'overdue' | 'high'>('all');
  const t = todayISO();

  const due = dueQueue('due');
  const over = due.filter((i) => i.schedule.due < t);
  const up = dueQueue('ahead');

  const goal = db.settings.dailyGoal;
  const done = todayCount();

  const h = new Date().getHours();
  const greet =
    h < 5
      ? 'Good night'
      : h < 12
      ? 'Good morning'
      : h < 17
      ? 'Good afternoon'
      : 'Good evening';

  const last = db.lastOpened
    ? refInfo({ type: db.lastOpened.type as any, id: db.lastOpened.id })
    : null;

  let list = due;
  if (filter === 'question') list = due.filter((i) => i.type === 'question');
  if (filter === 'node') list = due.filter((i) => i.type !== 'question');
  if (filter === 'overdue') list = over;
  if (filter === 'high') list = due.filter((i) => prioW(i.priority) >= 3);

  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(t, i + 1);
    return {
      iso,
      n: allRefs()
        .map(refInfo)
        .filter(
          (x) =>
            x &&
            !refArchived(x.ref) &&
            !x.suspended &&
            x.schedule.due === iso
        ).length
    };
  });
  const maxW = Math.max(1, ...weekBars.map((w) => w.n));

  const renderDueBadge = (sched: any, suspended: boolean) => {
    if (suspended) return <span className="badge b-suspended">Suspended</span>;
    if (!sched) return null;
    if (!sched.lastReviewed) return <span className="badge b-new">New</span>;
    if (sched.due < t)
      return (
        <span className="badge b-overdue">
          Overdue {Math.abs(Math.round((new Date(t).getTime() - new Date(sched.due).getTime()) / 864e5))}d
        </span>
      );
    if (sched.due === t) return <span className="badge b-due">Due today</span>;
    return <span className="badge b-ok">{relDue(sched.due)}</span>;
  };

  const renderPriorityBadge = (p: string) => {
    if (p === 'exam-critical') {
      return (
        <span className="badge b-overdue">
          <Icon name="flag" size={11} /> Exam-critical
        </span>
      );
    }
    if (p === 'high') {
      return (
        <span className="badge b-established">
          <Icon name="flag" size={11} /> High
        </span>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>{greet} ✎</h1>
          <div className="sub">{fmtLong(t)}</div>
        </div>
        <div className="grow" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ProgressRing pct={Math.min(1, done / goal)} size={52} stroke={6} />
          <div>
            <div style={{ fontWeight: 800, fontFamily: 'Fraunces' }}>
              {done} / {goal}
            </div>
            <div className="sub" style={{ fontSize: '.75rem' }}>
              daily goal
            </div>
          </div>
        </div>
        <button className="btn primary" onClick={() => onStartReview('due')}>
          <Icon name="play" size={16} />
          Start review{due.length ? ` (${due.length})` : ''}
        </button>
      </div>

      <div className="cardgrid" style={{ marginBottom: '8px' }}>
        <div className="card statcard click" onClick={() => onStartReview('due')}>
          <div className="lbl">
            <Icon name="clock" size={14} /> Due today
          </div>
          <div className="big">{due.length}</div>
          <div className="hint">{due.length ? 'Tap to start' : 'All clear'}</div>
          <div className="corner">
            <Icon name="check" size={20} />
          </div>
        </div>

        <div className="card statcard click" onClick={() => onStartReview('overdue')}>
          <div className="lbl" style={{ color: 'var(--danger)' }}>
            <Icon name="alert" size={14} /> Overdue
          </div>
          <div className="big" style={{ color: over.length ? 'var(--danger)' : 'inherit' }}>
            {over.length}
          </div>
          <div className="hint">{over.length ? 'Gentle catch-up' : 'Nothing overdue'}</div>
        </div>

        <div className="card statcard">
          <div className="lbl">
            <Icon name="calendar" size={14} /> Next 7 days
          </div>
          <div className="big">{up.length}</div>
          <div className="bars" style={{ height: '34px', gap: '4px' }}>
            {weekBars.map((w) => (
              <div key={w.iso} className="barcol">
                <div
                  className="b"
                  style={{ height: `${Math.max(8, (w.n / maxW) * 100)}%` }}
                  title={`${w.iso}: ${w.n}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className="card statcard click"
          onClick={() => {
            if (last) {
              onOpenRef(last.ref.type, last.ref.id);
            } else {
              onNav('library');
            }
          }}
        >
          <div className="lbl">
            <Icon name="zap" size={14} /> Continue
          </div>
          <div className="big" style={{ fontSize: '1.05rem', whiteSpace: 'normal' }}>
            {last ? last.title : 'Browse library'}
          </div>
          <div className="hint">
            {last
              ? last.crumb.slice(0, -1).map((c) => c.name).join(' › ')
              : 'Pick up where you left off'}
          </div>
        </div>
      </div>

      <div className="sectiontitle">
        Review queue
        <span className="grow" />
        {(
          [
            ['all', 'All'],
            ['question', 'Questions'],
            ['node', 'Revisions'],
            ['overdue', 'Overdue'],
            ['high', 'High priority']
          ] as const
        ).map(([fKey, fLbl]) => (
          <button
            key={fKey}
            type="button"
            className={`chip ${filter === fKey ? 'active' : ''}`}
            onClick={() => setFilter(fKey)}
          >
            {fLbl}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty card">
          <div className="eicon">☀️</div>
          <h3>All clear for now</h3>
          <p>
            No revisions due right now. Review ahead, add new questions, or enjoy the calm.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {db.settings.reviewAhead && up.length > 0 && (
              <button className="btn soft" onClick={() => onStartReview('ahead')}>
                <Icon name="play" size={15} /> Review ahead
              </button>
            )}
            <button className="btn ghost" onClick={() => onQuestionModal({})}>
              Add question
            </button>
            <button className="btn ghost" onClick={() => onNav('library')}>
              Browse library
            </button>
          </div>
        </div>
      ) : (
        list.map((info) => {
          const key = refKey(info.ref);
          const crumbText = info.crumb
            .slice(0, -1)
            .map((c) => c.name)
            .join(' › ');

          return (
            <div key={key} className="rowcard">
              <div
                className="ricon"
                style={{ background: 'var(--hl-soft)', color: 'var(--text)' }}
              >
                <Icon name={info.icon} size={18} />
              </div>
              <div
                className="rmain"
                onClick={() => onOpenRef(info.ref.type, info.ref.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="rtitle">{info.title}</div>
                {crumbText && <div className="crumb">{crumbText}</div>}
                <div className="rmeta">
                  {renderDueBadge(info.schedule, info.suspended)}
                  {renderPriorityBadge(info.priority)}
                  {(info.tags || []).slice(0, 2).map((tg) => (
                    <span key={tg} className="tag">
                      #{tg}
                    </span>
                  ))}
                  <span>
                    <Icon name="refresh" size={11} /> {info.schedule.interval || 0}d
                  </span>
                  {info.schedule.lastReviewed && (
                    <span>last {timeAgo(info.schedule.lastReviewed)}</span>
                  )}
                </div>
              </div>
              <div className="rside">
                <button
                  type="button"
                  className="btn small primary"
                  onClick={() => onStartSingle(key)}
                >
                  Revise
                </button>
                <button
                  type="button"
                  className="ibtn"
                  onClick={(e) => onQueueMenu(e, key)}
                  title="Options"
                >
                  <Icon name="dots" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
