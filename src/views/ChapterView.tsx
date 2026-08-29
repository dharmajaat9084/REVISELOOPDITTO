import React, { useState } from 'react';
import { Chapter, AppDatabase, Question } from '../types';
import {
  containerProgress,
  crumbFor,
  dueCountOf,
  getChap,
  logsForType,
  overdueCountOf,
  questionsIn,
  saveDB
} from '../lib/db';
import { cap, maturityOf, newSchedule, timeAgo, todayISO, relDue } from '../lib/srs';
import { Icon } from '../components/Icon';
import { AttachmentsSection } from '../components/AttachmentsSection';

interface ChapterViewProps {
  id: string;
  db: AppDatabase;
  onBack: () => void;
  onOpenTopic: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onOpenQuestion: (id: string) => void;
  onAddTopic: () => void;
  onAddFolder: () => void;
  onAddQuestion: (opts?: any) => void;
  onNodeMenu: (e: React.MouseEvent, type: string, id: string) => void;
  onQMenu: (e: React.MouseEvent, id: string) => void;
  onStartSingle: (key: string) => void;
  onReschedule: (key: string) => void;
  onOpenViewer: (id: string) => void;
  onShowMenu: (e: React.MouseEvent, items: any[]) => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
  onPromptPatch: (id: string, field: string, label: string, currentVal: string) => void;
  onNoteModal: (ot: string, oid: string) => void;
}

export const ChapterView: React.FC<ChapterViewProps> = ({
  id,
  db,
  onBack,
  onOpenTopic,
  onOpenFolder,
  onOpenQuestion,
  onAddTopic,
  onAddFolder,
  onAddQuestion,
  onNodeMenu,
  onQMenu,
  onStartSingle,
  onReschedule,
  onOpenViewer,
  onShowMenu,
  onToast,
  onAskConfirm,
  onPromptPatch,
  onNoteModal
}) => {
  const c = getChap(id);
  const [bulkOn, setBulkOn] = useState(false);
  const [bulkSel, setBulkSel] = useState<Set<string>>(new Set());

  if (!c) {
    return (
      <div className="empty card">
        <div className="eicon">❔</div>
        <h3>Chapter not found</h3>
        <button className="btn ghost" onClick={onBack}>
          Back to library
        </button>
      </div>
    );
  }

  const crumb = crumbFor('chapter', c.id);
  const parentName = crumb.length > 1 ? crumb[crumb.length - 2].name : 'Library';

  const tops = db.topics.filter((t) => t.chapterId === c.id);
  const folders = db.folders.filter((f) => f.parentType === 'chapter' && f.parentId === c.id && !f.isArchived);
  const direct = db.questions.filter((q) => q.parentType === 'chapter' && q.parentId === c.id);

  const due = dueCountOf('chapter', c.id);
  const od = overdueCountOf('chapter', c.id);
  const qs = questionsIn('chapter', c.id);
  const prog = containerProgress('chapter', c.id);
  const logs = logsForType('chapter', c.id);

  const handleToggleSchedule = () => {
    if (c.schedule) {
      onAskConfirm(
        'Remove revision schedule',
        'Stop scheduling note-revision for this chapter? History is kept.',
        () => {
          c.schedule = null;
          saveDB();
          onToast('Schedule removed');
        }
      );
    } else {
      c.schedule = newSchedule(db.settings.srs.easeStart);
      saveDB();
      onToast('Chapter revision scheduled', 'calendar');
    }
  };

  const handleToggleSel = (qId: string) => {
    setBulkSel((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleBulkSelectAll = () => {
    if (bulkSel.size === direct.length) {
      setBulkSel(new Set());
    } else {
      setBulkSel(new Set(direct.map((q) => q.id)));
    }
  };

  const handleBulkAct = (act: string) => {
    const ids = Array.from(bulkSel);
    if (!ids.length) {
      onToast('Select questions first', 'alert');
      return;
    }

    if (act === 'suspend') {
      ids.forEach((qid) => {
        const q = db.questions.find((x) => x.id === qid);
        if (q) q.isSuspended = true;
      });
      onToast('Suspended', 'pause');
    } else if (act === 'resume') {
      ids.forEach((qid) => {
        const q = db.questions.find((x) => x.id === qid);
        if (q) q.isSuspended = false;
      });
      onToast('Resumed', 'play');
    } else if (act === 'delete') {
      ids.forEach((qid) => {
        const i = db.questions.findIndex((x) => x.id === qid);
        if (i >= 0) {
          db.trash.push({ q: db.questions[i], deletedAt: Date.now() });
          db.questions.splice(i, 1);
        }
      });
      onToast('Moved to trash', 'trash');
    }

    setBulkSel(new Set());
    saveDB();
  };

  const renderDueBadge = (sched: any, suspended: boolean) => {
    if (suspended) return <span className="badge b-suspended">Suspended</span>;
    if (!sched) return null;
    const t = todayISO();
    if (!sched.lastReviewed) return <span className="badge b-new">New</span>;
    if (sched.due < t) return <span className="badge b-overdue">Overdue</span>;
    if (sched.due === t) return <span className="badge b-due">Due today</span>;
    return <span className="badge b-ok">{relDue(sched.due)}</span>;
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
            <Icon name="back" size={14} /> {parentName}
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {c.name}
            {c.isArchived && <span className="badge b-suspended">Archived</span>}
          </h1>
          <div className="sub">{c.description || 'Chapter'}</div>
        </div>
        <div className="grow" />
        <button className="btn small soft" onClick={() => onNoteModal('chapter', c.id)}>
          <Icon name="clip" size={14} /> Attach
        </button>
        <button
          className="ibtn"
          onClick={(e) => onNodeMenu(e, 'chapter', c.id)}
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

      <div className="sectiontitle">
        Topics <span className="grow" />
        <button className="btn small soft" onClick={onAddTopic}>
          <Icon name="plus" size={14} /> Topic
        </button>
      </div>

      {tops.length === 0 ? (
        <div className="crumb" style={{ marginBottom: '8px' }}>
          No topics yet.
        </div>
      ) : (
        tops.map((t) => {
          const tDue = dueCountOf('topic', t.id);
          const tProg = containerProgress('topic', t.id);
          const subN = db.subtopics.filter((s) => s.topicId === t.id).length;
          const qN = questionsIn('topic', t.id).length;

          return (
            <div
              key={t.id}
              className={`rowcard click ${t.isArchived ? 'dim' : ''}`}
              onClick={() => onOpenTopic(t.id)}
            >
              <div
                className="ricon"
                style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
              >
                <Icon name="bookmark" size={18} />
              </div>
              <div className="rmain">
                <div className="rtitle">{t.name}</div>
                <div className="rmeta">
                  {subN} subtopics · {qN} q
                  {tDue > 0 && <span className="badge b-due">{tDue} due</span>}
                  {t.isArchived && <span className="badge b-suspended">Archived</span>}
                </div>
                {tProg !== null && (
                  <div className="bar" style={{ marginTop: '7px', maxWidth: '220px' }}>
                    <div
                      className="barfill"
                      style={{ width: `${Math.round(tProg * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                className="ibtn"
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeMenu(e, 'topic', t.id);
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

      <div className="sectiontitle">
        Question folders <span className="grow" />
        <button className="btn small soft" onClick={onAddFolder}>
          <Icon name="plus" size={14} /> Folder
        </button>
      </div>

      {folders.length === 0 ? (
        <div className="crumb" style={{ marginBottom: '8px' }}>
          No folders at chapter level.
        </div>
      ) : (
        folders.map((f) => {
          const fQs = db.questions.filter((q) => q.folderId === f.id);
          const fDue = fQs.filter(
            (q) => q.schedule && q.schedule.due <= todayISO() && !q.isSuspended
          ).length;

          return (
            <div
              key={f.id}
              className="rowcard click"
              onClick={() => onOpenFolder(f.id)}
            >
              <div
                className="ricon"
                style={{
                  background: 'color-mix(in srgb, var(--warn) 16%, transparent)',
                  color: 'var(--warn)'
                }}
              >
                <Icon name="folder" size={18} />
              </div>
              <div className="rmain">
                <div className="rtitle">{f.name}</div>
                <div className="rmeta">
                  {fQs.length} questions
                  {fDue > 0 && <span className="badge b-due">{fDue} due</span>}
                </div>
              </div>
              <button
                type="button"
                className="ibtn"
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeMenu(e, 'folder', f.id);
                }}
                title="Options"
              >
                <Icon name="edit" size={15} />
              </button>
              <Icon name="chev" size={16} />
            </div>
          );
        })
      )}

      <div className="sectiontitle">
        Direct questions <span className="grow" />
        <button
          className="btn small soft"
          onClick={() => onAddQuestion({ parentType: 'chapter', parentId: c.id })}
        >
          <Icon name="plus" size={14} /> Question
        </button>
        <button
          className="btn small ghost"
          onClick={() => {
            setBulkOn(!bulkOn);
            setBulkSel(new Set());
          }}
        >
          <Icon name="check" size={14} /> Select
        </button>
      </div>

      {bulkOn && direct.length > 0 && (
        <div className="bulkbar">
          <b style={{ fontSize: '.82rem' }}>{bulkSel.size} selected</b>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={handleBulkSelectAll}>
            All
          </button>
          <button type="button" onClick={() => handleBulkAct('suspend')}>
            Suspend
          </button>
          <button type="button" onClick={() => handleBulkAct('resume')}>
            Resume
          </button>
          <button type="button" onClick={() => handleBulkAct('delete')}>
            Delete
          </button>
          <button type="button" onClick={() => setBulkOn(false)}>
            ✕
          </button>
        </div>
      )}

      {direct.length === 0 ? (
        <div className="crumb" style={{ marginBottom: '8px' }}>
          No direct questions.
        </div>
      ) : (
        direct.map((qq) => {
          const isSelected = bulkSel.has(qq.id);
          return (
            <div
              key={qq.id}
              className={`rowcard ${qq.isSuspended ? 'dim' : ''}`}
            >
              {bulkOn && (
                <div
                  className={`qcheck ${isSelected ? 'on' : ''}`}
                  onClick={() => handleToggleSel(qq.id)}
                >
                  <Icon name="check" size={12} />
                </div>
              )}
              <div
                className="ricon"
                style={{ background: 'var(--hl-soft)', color: 'var(--text)' }}
              >
                <Icon name="help" size={17} />
              </div>
              <div
                className="rmain"
                style={{ cursor: 'pointer' }}
                onClick={() => onOpenQuestion(qq.id)}
              >
                <div className="rtitle">{qq.title}</div>
                <div className="rmeta">
                  {renderDueBadge(qq.schedule, qq.isSuspended)}
                  <span className={`badge b-${maturityOf(qq.schedule)}`}>
                    {cap(maturityOf(qq.schedule))}
                  </span>
                  {(qq.tags || []).slice(0, 2).map((tg) => (
                    <span key={tg} className="tag">
                      #{tg}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rside">
                <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                  {qq.schedule.interval || 0}d
                </span>
                <button
                  type="button"
                  className="ibtn"
                  onClick={(e) => onQMenu(e, qq.id)}
                  title="Options"
                >
                  <Icon name="dots" />
                </button>
              </div>
            </div>
          );
        })
      )}

      <div className="sectiontitle">Chapter revision</div>
      {!c.schedule ? (
        <div
          className="card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            className="ricon"
            style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
          >
            <Icon name="calendar" size={17} />
          </div>
          <div className="rmain">
            <div className="rtitle" style={{ fontSize: '.9rem' }}>
              Note revision not scheduled
            </div>
            <div className="rmeta">
              Optionally schedule this chapter as a whole-notes revision item.
            </div>
          </div>
          <button className="btn small soft" onClick={handleToggleSchedule}>
            Schedule
          </button>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div
            className="ricon"
            style={{
              background: 'color-mix(in srgb, var(--accent-2) 14%, transparent)',
              color: 'var(--accent-2)'
            }}
          >
            <Icon name="calendar" size={17} />
          </div>
          <div className="rmain">
            <div className="rtitle" style={{ fontSize: '.9rem' }}>
              Chapter revision
            </div>
            <div className="rmeta">
              {renderDueBadge(c.schedule, false)}
              <span>interval {c.schedule.interval}d</span>
              {c.schedule.lastReviewed && (
                <span>last {timeAgo(c.schedule.lastReviewed)}</span>
              )}
            </div>
          </div>
          <button
            className="btn small primary"
            onClick={() => onStartSingle(`chapter:${c.id}`)}
          >
            Revise
          </button>
          <button
            className="ibtn"
            onClick={() => onReschedule(`chapter:${c.id}`)}
            title="Reschedule"
          >
            <Icon name="refresh" size={15} />
          </button>
          <button
            className="ibtn"
            onClick={handleToggleSchedule}
            title="Remove schedule"
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      )}

      <AttachmentsSection
        ownerType="chapter"
        ownerId={c.id}
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
                    db.topics.find((x) => x.id === l.itemId)?.name ||
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
