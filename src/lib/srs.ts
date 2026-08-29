import { Schedule, SrsRating, SrsSettings, MaturityLevel } from '../types';

export const uid = (): string => {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
};

export const toISO = (d: Date): string => {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};

export const parseISO = (s: string): Date => {
  const p = String(s).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
};

export const todayISO = (): string => toISO(new Date());

export const addDays = (iso: string, n: number): string => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const daysBetween = (a: string, b: string): number => {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 864e5);
};

export const fmtShort = (iso: string): string => {
  return parseISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const fmtMed = (iso: string): string => {
  return parseISO(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

export const fmtLong = (iso: string): string => {
  return parseISO(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
};

export const timeAgo = (ts: number): string => {
  const s = (Date.now() - ts) / 1e3;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : d + 'd ago';
};

export const relDue = (iso: string): string => {
  const df = daysBetween(todayISO(), iso);
  if (df < 0) return 'Overdue ' + -df + 'd';
  if (df === 0) return 'Due today';
  if (df === 1) return 'Tomorrow';
  return 'In ' + df + 'd';
};

export const cap = (s: string): string => {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const clamp = (v: number, a: number, b: number): number => {
  return Math.min(b, Math.max(a, v));
};

export const prioW = (p: string): number => {
  return ({ low: 1, normal: 2, high: 3, 'exam-critical': 4 } as Record<string, number>)[p] || 2;
};

export function newSchedule(easeStart = 2.5): Schedule {
  return {
    due: todayISO(),
    interval: 0,
    ease: easeStart,
    reps: 0,
    lapses: 0,
    lastReviewed: null,
    box: 1
  };
}

export function srsNext(s: Schedule, rating: SrsRating, srsSettings: SrsSettings): Schedule {
  const st = srsSettings;
  const t = todayISO();
  const base = {
    ease: s.ease != null ? s.ease : st.easeStart,
    interval: s.interval || 0,
    reps: s.reps || 0,
    lapses: s.lapses || 0,
    box: s.box || 1
  };

  if (st.mode === 'leitner') {
    const boxes = [1, 3, 7, 14, 30, 60, 120];
    let box = base.box;
    if (rating === 'again') {
      box = Math.max(1, box - 2);
      base.lapses++;
    } else if (rating === 'good') {
      box = Math.min(7, box + 1);
    } else if (rating === 'easy') {
      box = Math.min(7, box + 2);
    }
    if (rating !== 'again') base.reps++;
    base.box = box;
    const interval = boxes[box - 1];
    return {
      due: addDays(t, interval),
      interval,
      ease: base.ease,
      reps: base.reps,
      lapses: base.lapses,
      lastReviewed: Date.now(),
      box
    };
  }

  let ease = base.ease;
  let iv = base.interval;
  let reps = base.reps;
  let lapses = base.lapses;

  if (rating === 'again') {
    iv = st.first.again;
    ease = Math.max(st.easeMin, ease - 0.2);
    lapses++;
  } else if (reps === 0) {
    iv = st.first[rating];
    if (rating === 'easy') ease = Math.min(st.easeMax, ease + 0.1);
  } else if (rating === 'hard') {
    iv = Math.max(iv + 1, Math.round(iv * st.hardMult));
    ease = Math.max(st.easeMin, ease - 0.15);
  } else if (rating === 'good') {
    iv = Math.max(iv + 1, Math.round(iv * ease));
  } else {
    iv = Math.max(iv + 2, Math.round(iv * ease * st.easyBonus));
    ease = Math.min(st.easeMax, ease + 0.15);
  }

  iv = clamp(iv, 1, st.maxInterval);
  if (rating !== 'again') reps++;

  return {
    due: addDays(t, iv),
    interval: iv,
    ease,
    reps,
    lapses,
    lastReviewed: Date.now(),
    box: base.box
  };
}

export function maturityOf(s?: Schedule | null): MaturityLevel {
  if (!s || !s.lastReviewed) return 'new';
  const iv = s.interval || 0;
  if (iv < 7) return 'learning';
  if (iv < 30) return 'established';
  if (iv < 90) return 'mature';
  return 'mastered';
}

export const MAT_W: Record<MaturityLevel, number> = {
  new: 0,
  learning: 0.25,
  established: 0.5,
  mature: 0.75,
  mastered: 1
};

export const MAT_C: Record<MaturityLevel, string> = {
  new: '#4a6fa5',
  learning: '#4d7c5f',
  established: '#c07a26',
  mature: '#56795c',
  mastered: '#8b5f8a'
};

export const TAG_COLORS = ['#4a6fa5', '#4d7c5f', '#c07a26', '#c65460', '#8b5f8a', '#56795c', '#a5713c', '#3f6b8f'];

export function tagColor(tg: string): string {
  let h = 0;
  for (const ch of tg) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return TAG_COLORS[h % TAG_COLORS.length];
}
