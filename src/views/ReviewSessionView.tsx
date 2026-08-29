import React, { useEffect, useState } from 'react';
import { QueueItemInfo, SrsRating } from '../types';
import { commitReview, getDB, computeStreak } from '../lib/db';
import { cap, fmtShort, srsNext } from '../lib/srs';
import { Icon } from '../components/Icon';
import { QuestionImageCarousel } from '../components/QuestionImageCarousel';
import { NotesDrawer } from '../components/NotesDrawer';
import { IDB } from '../lib/idb';

interface ReviewSessionProps {
  queue: QueueItemInfo[];
  scope: string;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
  onOpenViewerFull: (id: string) => void;
}

export const ReviewSessionView: React.FC<ReviewSessionProps> = ({
  queue,
  scope,
  onClose,
  onToast,
  onOpenViewerFull
}) => {
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [reflection, setReflection] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [materialsCount, setMaterialsCount] = useState(0);

  const [sessionData] = useState(() => ({
    startTime: Date.now(),
    ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    skipped: 0,
    dues: [] as { title: string; due: string }[]
  }));

  const db = getDB();
  const currentItem = queue[index];

  // Load materials count for current item
  useEffect(() => {
    if (!currentItem) return;
    IDB.all().then((all) => {
      const qIds = [currentItem.ref.id];
      const count = all.filter((r) => qIds.includes(r.ownerId)).length;
      setMaterialsCount(count);
    });
  }, [currentItem]);

  // Keyboard shortcut for Notes drawer
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (document.activeElement as HTMLElement)?.tagName || ''
        )
      ) {
        e.preventDefault();
        setDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleRate = (rating: SrsRating) => {
    if (!currentItem) return;
    const nextSched = commitReview(currentItem.ref, rating, reflection, 'session');
    if (nextSched) {
      sessionData.ratings[rating]++;
      sessionData.dues.push({ title: currentItem.title, due: nextSched.due });
    }

    setReflection('');
    setReveal(false);

    if (index + 1 >= queue.length) {
      setIsDone(true);
    } else {
      setIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    sessionData.skipped++;
    setReflection('');
    setReveal(false);

    if (index + 1 >= queue.length) {
      setIsDone(true);
    } else {
      setIndex((prev) => prev + 1);
    }
  };

  if (isDone || !currentItem) {
    const total =
      sessionData.ratings.again +
      sessionData.ratings.hard +
      sessionData.ratings.good +
      sessionData.ratings.easy;
    const mins = Math.max(1, Math.round((Date.now() - sessionData.startTime) / 60000));
    const nextUp = sessionData.dues
      .slice()
      .sort((a, b) => (a.due < b.due ? -1 : 1))
      .slice(0, 3);

    const rc: Record<string, string> = {
      again: 'var(--danger)',
      hard: 'var(--warn)',
      good: 'var(--ok)',
      easy: 'var(--accent-2)'
    };

    return (
      <div className="reviewov">
        <div className="revtop">
          <b
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: 'Fraunces',
              fontSize: '1.05rem'
            }}
          >
            Session complete ✎
          </b>
          <button className="ibtn" onClick={onClose} title="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="revbody">
          <div className="revcard">
            <div
              className="card"
              style={{
                padding: '26px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}
            >
              <div className="kvgrid">
                <div className="kv">
                  <div className="k">Reviewed</div>
                  <div className="v">{total}</div>
                </div>
                <div className="kv">
                  <div className="k">Time</div>
                  <div className="v">{mins} min</div>
                </div>
                <div className="kv">
                  <div className="k">Skipped</div>
                  <div className="v">{sessionData.skipped}</div>
                </div>
                <div className="kv">
                  <div className="k">Streak</div>
                  <div className="v" style={{ color: 'var(--danger)' }}>
                    {computeStreak()} 🔥
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(['again', 'hard', 'good', 'easy'] as const).map((r) => (
                  <div
                    key={r}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span
                      style={{
                        width: '52px',
                        fontSize: '.8rem',
                        fontWeight: 700,
                        color: 'var(--muted)'
                      }}
                    >
                      {cap(r)}
                    </span>
                    <div className="bar" style={{ flex: 1 }}>
                      <div
                        className="barfill"
                        style={{
                          width: `${
                            total ? Math.round((sessionData.ratings[r] / total) * 100) : 0
                          }%`,
                          background: rc[r]
                        }}
                      />
                    </div>
                    <b style={{ fontSize: '.85rem' }}>{sessionData.ratings[r]}</b>
                  </div>
                ))}
              </div>

              {nextUp.length > 0 && (
                <div>
                  <div className="sectiontitle" style={{ margin: '0 0 8px' }}>
                    Next due
                  </div>
                  {nextUp.map((d, i) => (
                    <div key={i} className="rmeta" style={{ margin: '0 0 4px' }}>
                      <span className="badge b-plain">{fmtShort(d.due)}</span>
                      {d.title}
                    </div>
                  ))}
                </div>
              )}

              <button className="btn primary" onClick={onClose}>
                Back to Today
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const preds = (['again', 'hard', 'good', 'easy'] as const).map((r) => ({
    r,
    p: srsNext(currentItem.schedule, r, db.settings.srs)
  }));

  const crumbText = currentItem.crumb
    .slice(0, -1)
    .map((c) => c.name)
    .join(' › ');

  return (
    <div className={`reviewov ${drawerOpen ? 'hasdrawer' : ''}`}>
      <div className="revtop">
        <button className="ibtn" onClick={onClose} title="End session">
          <Icon name="x" />
        </button>
        <b style={{ fontSize: '.9rem', fontFamily: 'Fraunces' }}>
          {scope === 'overdue'
            ? 'Catch-up'
            : scope === 'ahead'
            ? 'Review ahead'
            : scope === 'single'
            ? 'Quick review'
            : 'Review'}
        </b>
        <div className="revprog">
          <div
            className="barfill"
            style={{ width: `${Math.round((index / queue.length) * 100)}%` }}
          />
        </div>
        <span style={{ fontSize: '.8rem', color: 'var(--muted)', fontWeight: 700 }}>
          {index + 1} / {queue.length}
        </span>
      </div>

      <div className="revbody">
        <div className="revcard">
          <div className="card revmain">
            {crumbText && (
              <div className="crumb" style={{ justifyContent: 'center' }}>
                {crumbText}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                marginTop: '10px',
                flexWrap: 'wrap'
              }}
            >
              <span className="badge b-plain">
                <Icon name={currentItem.icon} size={11} /> {currentItem.kindLabel}
              </span>
              {currentItem.tags.slice(0, 3).map((tg) => (
                <span key={tg} className="tag">
                  #{tg}
                </span>
              ))}
            </div>

            <div className="qtitle">{currentItem.title}</div>
            <p className="prompt">{currentItem.prompt}</p>

            {currentItem.refLoc && (
              <div className="refbox">
                <Icon
                  name={currentItem.refType === 'url' ? 'external' : 'bookopen'}
                  size={14}
                />
                {cap(currentItem.refType || 'ref')}: {currentItem.refLoc}
              </div>
            )}

            {currentItem.type === 'question' && (
              <QuestionImageCarousel questionId={currentItem.ref.id} />
            )}
          </div>

          {reveal ? (
            <div>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Add a short reflection (optional)… e.g. “confused between two cases”"
                style={{ marginBottom: '12px' }}
                autoFocus
              />
              <div className="rategrid">
                {preds.map((o) => (
                  <button
                    key={o.r}
                    type="button"
                    className={`ratebtn ${o.r}`}
                    onClick={() => handleRate(o.r)}
                  >
                    {cap(o.r)}
                    <span>
                      +{o.p.interval}d · {fmtShort(o.p.due)}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={handleSkip}
                >
                  Skip this item
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              {currentItem.refType === 'url' &&
                currentItem.refLoc &&
                /^https?:/.test(currentItem.refLoc) && (
                  <a
                    className="btn ghost"
                    href={currentItem.refLoc}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="external" size={16} /> Open reference
                  </a>
                )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDrawerOpen(!drawerOpen)}
              >
                <Icon name="clip" size={15} /> Notes
                {materialsCount > 0 ? ` (${materialsCount})` : ''}
              </button>
              <button
                type="button"
                className="btn primary"
                style={{ minWidth: '200px' }}
                onClick={() => setReveal(true)}
              >
                <Icon name="check" size={17} /> Mark revised — rate recall
              </button>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <NotesDrawer
          info={currentItem}
          onClose={() => setDrawerOpen(false)}
          onToast={onToast}
          onOpenViewerFull={onOpenViewerFull}
        />
      )}
    </div>
  );
};
