import React from 'react';
import { AppDatabase } from '../types';
import {
  allRefs,
  computeStreak,
  containerProgress,
  dueCountOf,
  dueQueue,
  logsForType,
  refArchived,
  refInfo,
  reviewsOn,
  todayCount
} from '../lib/db';
import {
  addDays,
  cap,
  daysBetween,
  fmtShort,
  maturityOf,
  parseISO,
  timeAgo,
  todayISO,
  MAT_C
} from '../lib/srs';
import { Icon } from '../components/Icon';

interface StatsViewProps {
  db: AppDatabase;
  onNav: (view: string) => void;
  onOpenQuestion: (id: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ db, onNav, onOpenQuestion }) => {
  const t = todayISO();
  const total = db.questions.length;
  const week = db.logs.filter(
    (l) => daysBetween(l.date, t) >= 0 && daysBetween(l.date, t) < 7
  ).length;
  const streak = computeStreak();
  const over = dueQueue('overdue').length;

  const mats = {
    new: 0,
    learning: 0,
    established: 0,
    mature: 0,
    mastered: 0
  };
  db.questions.forEach((q) => {
    mats[maturityOf(q.schedule)]++;
  });

  const reviewed = db.questions.filter((q) => q.schedule.lastReviewed);
  const avgIv = reviewed.length
    ? Math.round(
        reviewed.reduce((a, q) => a + (q.schedule.interval || 0), 0) / reviewed.length
      )
    : 0;

  const daysActive = new Set(
    db.logs
      .filter((l) => daysBetween(l.date, t) >= 0 && daysBetween(l.date, t) < 30)
      .map((l) => l.date)
  ).size;

  if (db.logs.length === 0) {
    return (
      <div>
        <div className="pagehead">
          <div>
            <h1>Stats</h1>
            <div className="sub">Progress, workload and mastery</div>
          </div>
        </div>
        <div className="empty card">
          <div className="eicon">📊</div>
          <h3>No data yet</h3>
          <p>Complete your first review to see progress, streaks and charts.</p>
          <button className="btn primary" onClick={() => onNav('today')}>
            Go to Today
          </button>
        </div>
      </div>
    );
  }

  // Mastery Donut Conic Gradient
  const totQ = Math.max(1, total);
  let acc = 0;
  const segs = (Object.keys(mats) as (keyof typeof mats)[])
    .map((k) => {
      const from = acc;
      acc += (mats[k] / totQ) * 360;
      return `${MAT_C[k]} ${from}deg ${acc}deg`;
    })
    .join(', ');

  // 14-day Daily review bars
  const days14 = Array.from({ length: 14 }, (_, i) => addDays(t, -13 + i));
  const counts = days14.map((d) => reviewsOn(d));
  const mx = Math.max(1, ...counts);

  // 40-week Activity Heatmap
  const cnt: Record<string, number> = {};
  db.logs.forEach((l) => {
    cnt[l.date] = (cnt[l.date] || 0) + 1;
  });
  const s0 = addDays(t, -111);
  const startAlign = addDays(s0, -parseISO(s0).getDay());

  const heatmapWeeks: { iso: string; n: number; cls: string }[][] = [];
  for (let w = 0; w < 40; w++) {
    const daysArr = [];
    for (let d = 0; d < 7; d++) {
      const iso = addDays(startAlign, w * 7 + d);
      if (iso > t) {
        daysArr.push({ iso, n: 0, cls: 'future' });
        continue;
      }
      const n = cnt[iso] || 0;
      const cls = n === 0 ? '' : n < 3 ? 'h1' : n < 6 ? 'h2' : n < 10 ? 'h3' : 'h4';
      daysArr.push({ iso, n, cls });
    }
    heatmapWeeks.push(daysArr);
    if (addDays(startAlign, w * 7 + 6) >= t) break;
  }

  // Needs attention
  const hardCount: Record<string, number> = {};
  db.logs.forEach((l) => {
    if (l.rating === 'again' || l.rating === 'hard') {
      hardCount[l.itemId] = (hardCount[l.itemId] || 0) + 1;
    }
  });
  const weak = db.questions
    .map((q) => ({
      q,
      w: (hardCount[q.id] || 0) + (q.schedule.lapses || 0)
    }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, 6);

  // Upcoming Load
  const load = Array.from({ length: 14 }, (_, i) => {
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
  const lmx = Math.max(1, ...load.map((l) => l.n));
  const n7 = load.slice(0, 7).reduce((a, b) => a + b.n, 0);
  const n30 = allRefs()
    .map(refInfo)
    .filter(
      (x) =>
        x &&
        !refArchived(x.ref) &&
        !x.suspended &&
        x.schedule.due > t &&
        daysBetween(t, x.schedule.due) <= 30
    ).length;

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Stats</h1>
          <div className="sub">Progress, workload and mastery</div>
        </div>
      </div>

      <div className="cardgrid" style={{ marginBottom: '18px' }}>
        {[
          ['🔥', 'Current streak', `${streak} days`],
          ['✅', 'Reviews today', todayCount()],
          ['📅', 'This week', week],
          ['❔', 'Total questions', total],
          ['⭐', 'Mastered', mats.mastered],
          ['⚠️', 'Overdue backlog', over],
          ['⏳', 'Avg interval', `${avgIv}d`],
          ['📆', 'Active days /30d', daysActive]
        ].map(([emoji, lbl, val]) => (
          <div key={lbl as string} className="card statcard">
            <div className="lbl">
              {emoji} {lbl}
            </div>
            <div className="big">{val}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="sectiontitle" style={{ marginTop: 0 }}>
          Mastery distribution
        </div>
        <div style={{ display: 'flex', gap: '26px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="donut" style={{ background: `conic-gradient(${segs})` }}>
            <div className="donuthole">
              <b>{total}</b>
              <span>questions</span>
            </div>
          </div>
          <div className="legend">
            {(Object.keys(mats) as (keyof typeof mats)[]).map((k) => (
              <div key={k} className="li">
                <span className="sw" style={{ background: MAT_C[k] }} />
                {cap(k)}
                <span className="n">{mats[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="sectiontitle" style={{ marginTop: 0 }}>
          Reviews per day (14d)
        </div>
        <div className="bars">
          {days14.map((d, i) => (
            <div key={d} className="barcol">
              <div
                className="b"
                style={{ height: `${Math.max(4, (counts[i] / mx) * 100)}%` }}
                title={`${d}: ${counts[i]}`}
              />
              <div className="l">{i % 2 === 1 ? fmtShort(d) : ''}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="sectiontitle" style={{ marginTop: 0 }}>
          Activity heatmap
        </div>
        <div className="hm">
          {heatmapWeeks.map((weekDays, wIdx) => (
            <div key={wIdx} className="hmcol">
              {weekDays.map((day, dIdx) => (
                <div
                  key={dIdx}
                  className={`hmcell ${day.cls}`}
                  title={`${day.iso} · ${day.n} reviews`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="rmeta" style={{ marginTop: '8px' }}>
          Less
          <span className="hmcell" style={{ display: 'inline-block' }} />
          <span className="hmcell h1" style={{ display: 'inline-block' }} />
          <span className="hmcell h2" style={{ display: 'inline-block' }} />
          <span className="hmcell h3" style={{ display: 'inline-block' }} />
          <span className="hmcell h4" style={{ display: 'inline-block' }} />
          More
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="sectiontitle" style={{ marginTop: 0 }}>
          Subject progress
        </div>
        {db.subjects.length === 0 ? (
          <div className="crumb">No subjects.</div>
        ) : (
          db.subjects.map((s) => {
            const prog = containerProgress('subject', s.id) || 0;
            const sDue = dueCountOf('subject', s.id);
            const sLogs = logsForType('subject', s.id);

            return (
              <div key={s.id} style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px'
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '4px',
                      background: s.color
                    }}
                  />
                  <b style={{ fontSize: '.9rem' }}>{s.name}</b>
                  <span className="rmeta" style={{ margin: 0 }}>
                    {sDue} due · {sLogs.length > 0 ? `last ${timeAgo(sLogs[0].at)}` : 'never'}
                  </span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '.85rem' }}>
                    {Math.round(prog * 100)}%
                  </span>
                </div>
                <div className="bar">
                  <div
                    className="barfill"
                    style={{
                      width: `${Math.round(prog * 100)}%`,
                      background: s.color
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="sectiontitle" style={{ marginTop: 0 }}>
          Needs attention
        </div>
        {weak.length === 0 ? (
          <div className="crumb">
            No weak items — everything is going smoothly. 🎉
          </div>
        ) : (
          weak.map((x) => (
            <div key={x.q.id} className="rowcard" style={{ boxShadow: 'none' }}>
              <div
                className="rmain"
                style={{ cursor: 'pointer' }}
                onClick={() => onOpenQuestion(x.q.id)}
              >
                <div className="rtitle">{x.q.title}</div>
              </div>
              <span className="badge b-overdue">{x.w} struggles</span>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div className="sectiontitle" style={{ marginTop: 0 }}>
          Upcoming load
        </div>
        <div className="chiprow" style={{ marginBottom: '12px' }}>
          <span className="badge b-due">{n7} in 7 days</span>
          <span className="badge b-plain">{n30} in 30 days</span>
          {Math.max(...load.map((l) => l.n)) > Math.max(15, db.settings.dailyGoal * 1.5) && (
            <span className="badge b-overdue">
              <Icon name="alert" size={11} /> Heavy load expected
            </span>
          )}
        </div>
        <div className="bars">
          {load.map((l) => (
            <div key={l.iso} className="barcol">
              <div
                className="b"
                style={{
                  height: `${Math.max(4, (l.n / lmx) * 100)}%`,
                  background: 'var(--accent-2)'
                }}
                title={`${l.iso}: ${l.n}`}
              />
              <div className="l">{fmtShort(l.iso).split(' ')[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
