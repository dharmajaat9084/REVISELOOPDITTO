import React, { useState } from 'react';
import { Folder, AppDatabase } from '../types';
import { crumbFor, getFolder, saveDB } from '../lib/db';
import { cap, maturityOf, todayISO, relDue } from '../lib/srs';
import { Icon } from '../components/Icon';
import { AttachmentsSection } from '../components/AttachmentsSection';

interface FolderViewProps {
  id: string;
  db: AppDatabase;
  onBack: () => void;
  onOpenQuestion: (id: string) => void;
  onAddQuestion: (opts?: any) => void;
  onQMenu: (e: React.MouseEvent, id: string) => void;
  onOpenViewer: (id: string) => void;
  onShowMenu: (e: React.MouseEvent, items: any[]) => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
  onPromptPatch: (id: string, field: string, label: string, currentVal: string) => void;
  onNoteModal: (ot: string, oid: string) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({
  id,
  db,
  onBack,
  onOpenQuestion,
  onAddQuestion,
  onQMenu,
  onOpenViewer,
  onShowMenu,
  onToast,
  onAskConfirm,
  onPromptPatch,
  onNoteModal
}) => {
  const f = getFolder(id);
  const [bulkOn, setBulkOn] = useState(false);
  const [bulkSel, setBulkSel] = useState<Set<string>>(new Set());

  if (!f) {
    return (
      <div className="empty card">
        <div className="eicon">❔</div>
        <h3>Folder not found</h3>
        <button className="btn ghost" onClick={onBack}>
          Back to library
        </button>
      </div>
    );
  }

  const qs = db.questions.filter((q) => q.folderId === f.id);
  const due = qs.filter(
    (q) => q.schedule && q.schedule.due <= todayISO() && !q.isSuspended
  ).length;

  const crumb = crumbFor(f.parentType, f.parentId);
  const parentCrumbStr = crumb.map((c) => c.name).join(' › ');

  const handleToggleSel = (qId: string) => {
    setBulkSel((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleBulkSelectAll = () => {
    if (bulkSel.size === qs.length) {
      setBulkSel(new Set());
    } else {
      setBulkSel(new Set(qs.map((q) => q.id)));
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
    const today = todayISO();
    if (!sched.lastReviewed) return <span className="badge b-new">New</span>;
    if (sched.due < today) return <span className="badge b-overdue">Overdue</span>;
    if (sched.due === today) return <span className="badge b-due">Due today</span>;
    return <span className="badge b-ok">{relDue(sched.due)}</span>;
  };

  return (
    <div>
      <div className="pagehead">
        <div>
          <button
            className="btn ghost small"
            onClick={onBack}
            style={{ marginBottom: '10px' }}
          >
            <Icon name="back" size={14} /> Back
          </button>
          <h1 style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Icon name="folder" size={22} />
            {f.name}
          </h1>
          <div className="sub">{parentCrumbStr}</div>
        </div>
        <div className="grow" />
        <button
          className="btn primary small"
          onClick={() =>
            onAddQuestion({
              parentType: f.parentType,
              parentId: f.parentId,
              folderId: f.id
            })
          }
        >
          <Icon name="plus" size={14} /> Question
        </button>
        <button
          className="btn ghost small"
          onClick={() => {
            setBulkOn(!bulkOn);
            setBulkSel(new Set());
          }}
        >
          <Icon name="check" size={14} /> Select
        </button>
      </div>

      <div className="chiprow" style={{ marginBottom: '14px' }}>
        <span className="badge b-plain">{qs.length} questions</span>
        <span className="badge b-due">{due} due</span>
      </div>

      {bulkOn && qs.length > 0 && (
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

      {qs.length === 0 ? (
        <div className="empty card">
          <div className="eicon">📁</div>
          <h3>Empty folder</h3>
          <p>No questions in this folder yet.</p>
          <button
            className="btn primary"
            onClick={() =>
              onAddQuestion({
                parentType: f.parentType,
                parentId: f.parentId,
                folderId: f.id
              })
            }
          >
            Add question
          </button>
        </div>
      ) : (
        qs.map((qq) => {
          const isSelected = bulkSel.has(qq.id);
          const qCrumb = crumbFor('question', qq.id)
            .slice(0, -1)
            .map((c) => c.name)
            .join(' › ');

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
                {qCrumb && <div className="crumb">{qCrumb}</div>}
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

      <AttachmentsSection
        ownerType="folder"
        ownerId={f.id}
        onOpenViewer={onOpenViewer}
        onShowMenu={onShowMenu}
        onToast={onToast}
        onAskConfirm={onAskConfirm}
        onPromptPatch={onPromptPatch}
        onNoteModal={onNoteModal}
      />
    </div>
  );
};
