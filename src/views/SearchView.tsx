import React, { useState } from 'react';
import { AppDatabase } from '../types';
import { crumbFor } from '../lib/db';
import { maturityOf, prioW, relDue, todayISO } from '../lib/srs';
import { Icon } from '../components/Icon';

interface SearchViewProps {
  db: AppDatabase;
  initialPreset?: string | null;
  onOpenRef: (type: string, id: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  db,
  initialPreset = null,
  onOpenRef
}) => {
  const [query, setQuery] = useState('');
  const [scopeType, setScopeType] = useState<'all' | 'question' | 'node'>('all');
  const [preset, setPreset] = useState<string | null>(initialPreset);

  const t = todayISO();
  const q = query.toLowerCase().trim();

  const matchQ = (qq: any) =>
    !q ||
    qq.title.toLowerCase().includes(q) ||
    String(qq.prompt || '').toLowerCase().includes(q) ||
    String(qq.referenceLocation || '').toLowerCase().includes(q) ||
    (qq.tags || []).some((tg: string) => tg.toLowerCase().includes(q));

  const results: {
    kind: string;
    id: string;
    title: string;
    crumb: any[];
    schedule?: any;
    suspended?: boolean;
  }[] = [];

  if (scopeType !== 'question') {
    db.subjects.forEach((s) => {
      if (!q || s.name.toLowerCase().includes(q)) {
        results.push({ kind: 'subject', id: s.id, title: s.name, crumb: [] });
      }
    });
    db.chapters.forEach((c) => {
      if (!q || c.name.toLowerCase().includes(q)) {
        results.push({ kind: 'chapter', id: c.id, title: c.name, crumb: crumbFor('chapter', c.id) });
      }
    });
    db.topics.forEach((tp) => {
      if (!q || tp.name.toLowerCase().includes(q)) {
        results.push({ kind: 'topic', id: tp.id, title: tp.name, crumb: crumbFor('topic', tp.id) });
      }
    });
    db.subtopics.forEach((st) => {
      if (!q || st.name.toLowerCase().includes(q)) {
        results.push({ kind: 'subtopic', id: st.id, title: st.name, crumb: crumbFor('subtopic', st.id) });
      }
    });
    db.folders.forEach((f) => {
      if (!q || f.name.toLowerCase().includes(q)) {
        results.push({ kind: 'folder', id: f.id, title: f.name, crumb: crumbFor(f.parentType, f.parentId) });
      }
    });
  }

  if (scopeType !== 'node') {
    db.questions
      .filter((qq) => !qq.isArchived)
      .forEach((qq) => {
        if (results.length >= 80) return;
        if (preset === 'overdue' && !(qq.schedule.due < t && !qq.isSuspended)) return;
        if (preset === 'due' && !(qq.schedule.due <= t && !qq.isSuspended)) return;
        if (preset === 'high' && prioW(qq.priority) < 3) return;
        if (preset === 'new' && maturityOf(qq.schedule) !== 'new') return;
        if (preset === 'mastered' && maturityOf(qq.schedule) !== 'mastered') return;
        if (preset === 'suspended' && !qq.isSuspended) return;

        if (matchQ(qq)) {
          results.push({
            kind: 'question',
            id: qq.id,
            title: qq.title,
            crumb: crumbFor('question', qq.id),
            schedule: qq.schedule,
            suspended: qq.isSuspended
          });
        }
      });
  }

  const kindIcon: Record<string, string> = {
    subject: 'book',
    chapter: 'book',
    topic: 'bookmark',
    subtopic: 'list',
    folder: 'folder',
    question: 'help'
  };

  const renderDueBadge = (sched: any, suspended?: boolean) => {
    if (suspended) return <span className="badge b-suspended">Suspended</span>;
    if (!sched) return null;
    if (!sched.lastReviewed) return <span className="badge b-new">New</span>;
    if (sched.due < t) return <span className="badge b-overdue">Overdue</span>;
    if (sched.due === t) return <span className="badge b-due">Due today</span>;
    return <span className="badge b-ok">{relDue(sched.due)}</span>;
  };

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Search</h1>
          <div className="sub">
            Subjects, chapters, topics, questions, tags & references
          </div>
        </div>
      </div>

      <input
        placeholder="Search everything…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: '12px' }}
        autoFocus
      />

      <div className="chiprow" style={{ marginBottom: '6px' }}>
        {[
          ['all', 'All'],
          ['question', 'Questions'],
          ['node', 'Structure']
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`chip ${scopeType === k ? 'active' : ''}`}
            onClick={() => setScopeType(k as any)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chiprow" style={{ marginBottom: '16px' }}>
        {[
          ['overdue', 'Overdue'],
          ['due', 'Due today'],
          ['high', 'High priority'],
          ['new', 'New'],
          ['mastered', 'Mastered'],
          ['suspended', 'Suspended']
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`chip ${preset === k ? 'active' : ''}`}
            onClick={() => setPreset(preset === k ? null : k)}
          >
            {label}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="empty card">
          <div className="eicon">🔍</div>
          <h3>No results found</h3>
          <p>Try different spelling, clear filters, or search by tag and subject.</p>
        </div>
      ) : (
        results.map((r) => {
          const crumbText = r.crumb
            .slice(0, -1)
            .map((c) => c.name)
            .join(' › ');

          return (
            <div
              key={`${r.kind}:${r.id}`}
              className="rowcard click"
              onClick={() => onOpenRef(r.kind, r.id)}
            >
              <div
                className="ricon"
                style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
              >
                <Icon name={kindIcon[r.kind] || 'book'} size={16} />
              </div>
              <div className="rmain">
                <div className="rtitle">{r.title}</div>
                {crumbText && <div className="crumb">{crumbText}</div>}
              </div>
              {renderDueBadge(r.schedule, r.suspended)}
            </div>
          );
        })
      )}
    </div>
  );
};
