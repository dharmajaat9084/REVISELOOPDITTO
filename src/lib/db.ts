import {
  AppDatabase,
  Chapter,
  Folder,
  Question,
  ReviewLog,
  Schedule,
  Subject,
  Subtopic,
  Topic,
  EntityType,
  RefItem,
  QueueItemInfo,
  CrumbItem,
  SrsRating
} from '../types';
import {
  addDays,
  cap,
  newSchedule,
  parseISO,
  prioW,
  srsNext,
  todayISO,
  toISO,
  uid
} from './srs';

const DB_KEY = 'reviseloop_v1';

export function defaultDB(): AppDatabase {
  return {
    v: 1,
    subjects: [],
    chapters: [],
    topics: [],
    subtopics: [],
    folders: [],
    questions: [],
    logs: [],
    trash: [],
    settings: {
      theme: 'system',
      accent: 'gold',
      dailyGoal: 20,
      reviewAhead: true,
      order: 'priority',
      srs: {
        mode: 'adaptive',
        preset: 'standard',
        first: { again: 1, hard: 1, good: 2, easy: 4 },
        easeStart: 2.5,
        easeMin: 1.3,
        easeMax: 2.8,
        hardMult: 1.2,
        easyBonus: 1.3,
        maxInterval: 180
      },
      reminder: { enabled: false, time: '19:00' }
    },
    lastOpened: null,
    onboarded: false,
    lastBackupAt: null,
    createdAt: Date.now()
  };
}

let currentDB: AppDatabase = (() => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.settings) {
        return { ...defaultDB(), ...parsed };
      }
    }
  } catch (e) {
    console.error('Error loading DB from localStorage', e);
  }
  return defaultDB();
})();

const listeners = new Set<() => void>();

export function getDB(): AppDatabase {
  return currentDB;
}

export function saveDB(db?: AppDatabase): void {
  if (db) currentDB = db;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(currentDB));
  } catch (e) {
    console.error('Error saving DB to localStorage', e);
  }
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeDB(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Entity Lookups
export const getSubj = (id: string): Subject | undefined =>
  currentDB.subjects.find((x) => x.id === id);
export const getChap = (id: string): Chapter | undefined =>
  currentDB.chapters.find((x) => x.id === id);
export const getTopic = (id: string): Topic | undefined =>
  currentDB.topics.find((x) => x.id === id);
export const getSub = (id: string): Subtopic | undefined =>
  currentDB.subtopics.find((x) => x.id === id);
export const getFolder = (id: string): Folder | undefined =>
  currentDB.folders.find((x) => x.id === id);
export const getQ = (id: string): Question | undefined =>
  currentDB.questions.find((x) => x.id === id);

export function nodeObj(type: EntityType, id: string): any {
  if (type === 'subject') return getSubj(id);
  if (type === 'chapter') return getChap(id);
  if (type === 'topic') return getTopic(id);
  if (type === 'subtopic') return getSub(id);
  if (type === 'folder') return getFolder(id);
  return getQ(id);
}

export function parentTypeOf(t: EntityType): EntityType | null {
  return t === 'chapter' ? 'subject' : t === 'topic' ? 'chapter' : t === 'subtopic' ? 'topic' : null;
}

export function pidKey(t: EntityType): string | null {
  return t === 'chapter' ? 'subjectId' : t === 'topic' ? 'chapterId' : t === 'subtopic' ? 'topicId' : null;
}

export function crumbFor(type: EntityType, id: string): CrumbItem[] {
  const out: CrumbItem[] = [];
  if (type === 'question') {
    const qq = getQ(id);
    if (!qq) return [];
    const f = qq.folderId ? getFolder(qq.folderId) : null;
    const chain = crumbFor(qq.parentType, qq.parentId);
    if (f) chain.push({ type: 'folder', id: f.id, name: f.name });
    chain.push({ type: 'question', id, name: qq.title });
    return chain;
  }
  let cur: { type: EntityType; id: string } | null = { type, id };
  while (cur) {
    const n = nodeObj(cur.type, cur.id);
    if (!n) break;
    out.unshift({ type: cur.type, id: cur.id, name: n.name });
    const pt = parentTypeOf(cur.type);
    const pKey = pidKey(cur.type);
    cur = pt && pKey ? { type: pt, id: n[pKey] } : null;
  }
  return out;
}

export function chainArchived(type: EntityType, id: string): boolean {
  let t: EntityType | null = type;
  let i = id;
  while (t) {
    const n = nodeObj(t, i);
    if (!n) return false;
    if (n.isArchived) return true;
    const pt = parentTypeOf(t);
    const pKey = pidKey(t);
    i = pKey ? n[pKey] : '';
    t = pt;
  }
  return false;
}

export function refArchived(ref: RefItem): boolean {
  if (ref.type === 'question') {
    const qq = getQ(ref.id);
    return !qq || qq.isArchived || chainArchived(qq.parentType, qq.parentId);
  }
  const n = nodeObj(ref.type, ref.id);
  const pt = parentTypeOf(ref.type);
  const pKey = pidKey(ref.type);
  return !n || n.isArchived || (pt && pKey ? chainArchived(pt, n[pKey]) : false);
}

export function questionsIn(type: EntityType, id: string): Question[] {
  const out: Question[] = [];
  if (type === 'subject') {
    currentDB.chapters
      .filter((c) => c.subjectId === id)
      .forEach((c) => out.push(...questionsIn('chapter', c.id)));
  } else if (type === 'chapter') {
    currentDB.questions.forEach((q) => {
      if (q.parentType === 'chapter' && q.parentId === id) out.push(q);
    });
    currentDB.topics
      .filter((t) => t.chapterId === id)
      .forEach((t) => out.push(...questionsIn('topic', t.id)));
  } else if (type === 'topic') {
    currentDB.questions.forEach((q) => {
      if (q.parentType === 'topic' && q.parentId === id) out.push(q);
    });
    currentDB.subtopics
      .filter((s) => s.topicId === id)
      .forEach((s) => out.push(...questionsIn('subtopic', s.id)));
  } else if (type === 'subtopic') {
    currentDB.questions.forEach((q) => {
      if (q.parentType === 'subtopic' && q.parentId === id) out.push(q);
    });
  }
  return out;
}

export function nodesIn(type: EntityType, id: string): { type: EntityType; node: any }[] {
  const out: { type: EntityType; node: any }[] = [];
  if (type === 'subject') {
    currentDB.chapters
      .filter((c) => c.subjectId === id)
      .forEach((c) => {
        out.push({ type: 'chapter', node: c });
        out.push(...nodesIn('chapter', c.id));
      });
  }
  if (type === 'chapter') {
    currentDB.topics
      .filter((t) => t.chapterId === id)
      .forEach((t) => {
        out.push({ type: 'topic', node: t });
        out.push(...nodesIn('topic', t.id));
      });
  }
  if (type === 'topic') {
    currentDB.subtopics
      .filter((s) => s.topicId === id)
      .forEach((s) => out.push({ type: 'subtopic', node: s }));
  }
  return out;
}

export function getScheduleByRef(ref: RefItem): Schedule | null {
  if (!ref) return null;
  if (ref.type === 'question') {
    const qq = getQ(ref.id);
    return qq ? qq.schedule : null;
  }
  const n = nodeObj(ref.type, ref.id);
  return n ? n.schedule || null : null;
}

export function setScheduleByRef(ref: RefItem, s: Schedule | null): void {
  if (ref.type === 'question') {
    const qq = getQ(ref.id);
    if (qq && s) qq.schedule = s;
  } else {
    const n = nodeObj(ref.type, ref.id);
    if (n) n.schedule = s;
  }
}

export function refInfo(ref: RefItem): QueueItemInfo | null {
  if (!ref) return null;
  if (ref.type === 'question') {
    const qq = getQ(ref.id);
    if (!qq || !qq.schedule) return null;
    return {
      ref,
      type: 'question',
      kindLabel: 'Question',
      icon: 'help',
      title: qq.title,
      prompt: qq.prompt || 'Revise this from your notes.',
      priority: qq.priority || 'normal',
      tags: qq.tags || [],
      refType: qq.referenceType || null,
      refLoc: qq.referenceLocation || null,
      suspended: !!qq.isSuspended,
      schedule: qq.schedule,
      crumb: crumbFor('question', qq.id)
    };
  }
  const n = nodeObj(ref.type, ref.id);
  if (!n || !n.schedule) return null;
  return {
    ref,
    type: ref.type,
    kindLabel: cap(ref.type) + ' revision',
    icon: ref.type === 'chapter' ? 'book' : ref.type === 'topic' ? 'bookmark' : 'list',
    title: n.name,
    prompt:
      'Revise your notes for this ' +
      ref.type +
      ' — key ideas, formulas, diagrams and examples.',
    priority: 'normal',
    tags: [],
    refType: null,
    refLoc: null,
    suspended: false,
    schedule: n.schedule,
    crumb: crumbFor(ref.type, n.id)
  };
}

export function allRefs(): RefItem[] {
  const refs: RefItem[] = [];
  currentDB.questions.forEach((qq) => {
    if (!qq.isArchived) refs.push({ type: 'question', id: qq.id });
  });
  (
    [
      ['chapter', currentDB.chapters],
      ['topic', currentDB.topics],
      ['subtopic', currentDB.subtopics]
    ] as [EntityType, any[]][]
  ).forEach(([type, arr]) => {
    arr.forEach((n) => {
      if (n.schedule && !n.isArchived) {
        refs.push({ type: type as any, id: n.id });
      }
    });
  });
  return refs;
}

export function sortQueue(list: QueueItemInfo[]): QueueItemInfo[] {
  const t = todayISO();
  const order = currentDB.settings.order || 'priority';

  list.sort((a, b) => {
    const ao = a.schedule.due < t;
    const bo = b.schedule.due < t;
    if (ao !== bo) return ao ? -1 : 1;

    if (order === 'priority') {
      if (prioW(a.priority) !== prioW(b.priority)) {
        return prioW(b.priority) - prioW(a.priority);
      }
    }
    return a.schedule.due < b.schedule.due ? -1 : 1;
  });
  return list;
}

export function dueQueue(scope: 'due' | 'overdue' | 'ahead'): QueueItemInfo[] {
  const t = todayISO();
  let list = allRefs()
    .map(refInfo)
    .filter((i): i is QueueItemInfo => i !== null && !refArchived(i.ref) && !i.suspended);

  if (scope === 'overdue') {
    list = list.filter((i) => i.schedule.due < t);
  } else if (scope === 'ahead') {
    const lim = addDays(t, 7);
    list = list.filter((i) => i.schedule.due > t && i.schedule.due <= lim);
  } else {
    list = list.filter((i) => i.schedule.due <= t);
  }
  return sortQueue(list);
}

export const refKey = (ref: RefItem): string => `${ref.type}:${ref.id}`;
export const parseRefKey = (k: string): RefItem => {
  const p = k.split(':');
  return { type: p[0] as any, id: p[1] };
};

export function reviewsOn(dateISO: string): number {
  return currentDB.logs.filter((l) => l.date === dateISO).length;
}

export function todayCount(): number {
  return reviewsOn(todayISO());
}

export function computeStreak(): number {
  const days = new Set(currentDB.logs.map((l) => l.date));
  let d = todayISO();
  if (!days.has(d)) {
    d = addDays(d, -1);
    if (!days.has(d)) return 0;
  }
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function dueCountOf(type: EntityType, id: string): number {
  const t = todayISO();
  let n = 0;
  questionsIn(type, id).forEach((qq) => {
    if (
      !qq.isSuspended &&
      !qq.isArchived &&
      qq.schedule &&
      qq.schedule.due <= t &&
      !chainArchived(qq.parentType, qq.parentId)
    ) {
      n++;
    }
  });
  nodesIn(type, id).forEach((o) => {
    if (o.node.schedule && !o.node.isArchived && o.node.schedule.due <= t) {
      n++;
    }
  });
  return n;
}

export function overdueCountOf(type: EntityType, id: string): number {
  const t = todayISO();
  let n = 0;
  questionsIn(type, id).forEach((qq) => {
    if (
      !qq.isSuspended &&
      !qq.isArchived &&
      qq.schedule &&
      qq.schedule.due < t &&
      !chainArchived(qq.parentType, qq.parentId)
    ) {
      n++;
    }
  });
  nodesIn(type, id).forEach((o) => {
    if (o.node.schedule && !o.node.isArchived && o.node.schedule.due < t) {
      n++;
    }
  });
  return n;
}

export function containerProgress(type: EntityType, id: string): number | null {
  const qs = questionsIn(type, id).filter((q) => !q.isArchived);
  if (!qs.length) return null;
  const weights = { new: 0, learning: 0.25, established: 0.5, mature: 0.75, mastered: 1 };
  const sum = qs.reduce((a, q) => {
    const mat = q.schedule?.lastReviewed
      ? q.schedule.interval < 7
        ? 'learning'
        : q.schedule.interval < 30
        ? 'established'
        : q.schedule.interval < 90
        ? 'mature'
        : 'mastered'
      : 'new';
    return a + weights[mat];
  }, 0);
  return sum / qs.length;
}

export function logsForType(type: EntityType, id: string): ReviewLog[] {
  if (type === 'question') {
    return currentDB.logs
      .filter((l) => l.itemType === 'question' && l.itemId === id)
      .sort((a, b) => b.at - a.at);
  }
  const ids = new Set(questionsIn(type, id).map((q) => q.id));
  const own = currentDB.logs.filter((l) => l.itemType === type && l.itemId === id);
  return own
    .concat(currentDB.logs.filter((l) => l.itemType === 'question' && ids.has(l.itemId)))
    .sort((a, b) => b.at - a.at);
}

export function commitReview(
  ref: RefItem,
  rating: SrsRating,
  reflection: string,
  sessionId: string
): Schedule | null {
  const prev = getScheduleByRef(ref);
  if (!prev) return null;
  const next = srsNext(prev, rating, currentDB.settings.srs);
  setScheduleByRef(ref, next);

  currentDB.logs.push({
    id: uid(),
    itemType: ref.type,
    itemId: ref.id,
    at: Date.now(),
    date: todayISO(),
    rating,
    prevDue: prev.due,
    newDue: next.due,
    prevInterval: prev.interval || 0,
    newInterval: next.interval,
    reflection: reflection || '',
    sessionId: sessionId || ''
  });

  saveDB();
  return next;
}

// Sample Data Loader
export function loadSampleData(): void {
  const t = todayISO();
  const keepSettings = currentDB.settings;
  const fresh = defaultDB();
  fresh.settings = keepSettings;
  fresh.onboarded = true;
  currentDB = fresh;

  const S = (name: string, color: string, icon: string, target?: string | null): Subject => {
    const s: Subject = {
      id: uid(),
      name,
      color,
      icon,
      description: '',
      targetDate: target || null,
      isArchived: false,
      sortOrder: currentDB.subjects.length,
      createdAt: Date.now() - 80 * 864e5,
      updatedAt: Date.now()
    };
    currentDB.subjects.push(s);
    return s;
  };

  const C = (s: Subject, name: string): Chapter => {
    const c: Chapter = {
      id: uid(),
      subjectId: s.id,
      name,
      description: '',
      isArchived: false,
      sortOrder: 0,
      createdAt: Date.now() - 70 * 864e5,
      updatedAt: Date.now()
    };
    currentDB.chapters.push(c);
    return c;
  };

  const T = (c: Chapter, name: string): Topic => {
    const x: Topic = {
      id: uid(),
      chapterId: c.id,
      name,
      description: '',
      isArchived: false,
      sortOrder: 0,
      createdAt: Date.now() - 60 * 864e5,
      updatedAt: Date.now()
    };
    currentDB.topics.push(x);
    return x;
  };

  const ST = (tp: Topic, name: string): Subtopic => {
    const x: Subtopic = {
      id: uid(),
      topicId: tp.id,
      name,
      description: '',
      isArchived: false,
      sortOrder: 0,
      createdAt: Date.now() - 60 * 864e5,
      updatedAt: Date.now()
    };
    currentDB.subtopics.push(x);
    return x;
  };

  const F = (pt: 'chapter' | 'topic' | 'subtopic', pid: string, name: string): Folder => {
    const f: Folder = {
      id: uid(),
      parentType: pt,
      parentId: pid,
      name,
      description: '',
      isArchived: false,
      sortOrder: 0,
      createdAt: Date.now() - 50 * 864e5,
      updatedAt: Date.now()
    };
    currentDB.folders.push(f);
    return f;
  };

  const Q = (
    pt: 'chapter' | 'topic' | 'subtopic',
    pid: string,
    o: {
      t: string;
      p?: string;
      f?: string;
      rt?: string;
      rl?: string;
      pr?: any;
      tg?: string[];
      due?: string;
      iv?: number;
      ease?: number;
      reps?: number;
      lap?: number;
      last?: number;
      box?: number;
      sus?: boolean;
    }
  ): Question => {
    const q: Question = {
      id: uid(),
      parentType: pt,
      parentId: pid,
      folderId: o.f || null,
      title: o.t,
      prompt: o.p || '',
      referenceType: o.rt || null,
      referenceLocation: o.rl || null,
      priority: o.pr || 'normal',
      tags: o.tg || [],
      description: '',
      note: '',
      isArchived: false,
      isSuspended: !!o.sus,
      createdAt: Date.now() - 45 * 864e5,
      updatedAt: Date.now(),
      schedule: {
        due: o.due || t,
        interval: o.iv || 0,
        ease: o.ease || 2.5,
        reps: o.reps || 0,
        lapses: o.lap || 0,
        lastReviewed: o.last != null ? Date.now() - o.last * 864e5 : null,
        box: o.box || 1
      }
    };
    currentDB.questions.push(q);
    return q;
  };

  const phy = S('Physics', '#4a6fa5', '⚡', addDays(t, 21));
  const chem = S('Chemistry', '#56795c', '🧪');
  const math = S('Mathematics', '#c07a26', '📐');
  const bio = S('Biology', '#c65460', '🧬');

  const mech = C(phy, 'Mechanics');
  const waves = C(phy, 'Waves & Oscillations');
  const kine = T(mech, 'Kinematics');
  const laws = T(mech, 'Laws of Motion');
  const proj = ST(kine, 'Projectile Motion');
  const numF = F('subtopic', proj.id, 'Numericals');

  Q('subtopic', proj.id, {
    f: numF.id,
    t: 'Range of a projectile',
    p: 'Derive the range formula and solve two numericals from your notebook.',
    rt: 'notebook',
    rl: 'p. 34',
    pr: 'high',
    tg: ['formula', 'numerical'],
    due: t,
    iv: 7,
    reps: 2,
    last: 7
  });

  Q('subtopic', proj.id, {
    f: numF.id,
    t: 'Time of flight — angled cases',
    p: 'Recall the three time-of-flight cases and their diagrams.',
    pr: 'exam-critical',
    tg: ['numerical'],
    due: addDays(t, -2),
    iv: 5,
    reps: 2,
    lap: 1,
    last: 7
  });

  Q('subtopic', proj.id, {
    t: 'Velocity at highest point',
    p: 'Explain in your own words why vertical velocity is zero at the apex.'
  });

  Q('topic', kine.id, {
    t: 'Equations of motion (derivations)',
    p: 'Revise the three derivations and when each applies.',
    rt: 'book',
    rl: 'Ch. 3',
    tg: ['derivation'],
    due: t,
    iv: 2,
    reps: 1,
    last: 2
  });

  Q('topic', kine.id, {
    t: 'Relative velocity examples',
    p: 'Revise the river-boat and rain-man examples.',
    due: addDays(t, 6),
    iv: 6,
    reps: 2,
    last: 6
  });

  Q('topic', laws.id, {
    t: 'Free body diagram practice',
    p: 'Redraw the 4 standard FBD setups from memory, then compare.',
    pr: 'high',
    tg: ['diagram'],
    due: t,
    iv: 4,
    reps: 2,
    last: 4
  });

  Q('topic', laws.id, {
    t: 'Friction — static vs kinetic',
    p: 'Recall the curves, coefficients and the two classic traps.',
    due: addDays(t, -1),
    iv: 6,
    reps: 2,
    last: 7
  });

  Q('topic', laws.id, {
    t: 'Pulley constraint relations',
    p: 'Revise the constraint method step by step.',
    due: addDays(t, 10),
    iv: 34,
    reps: 3,
    last: 24
  });

  const shm = T(waves, 'Simple Harmonic Motion');
  const sound = T(waves, 'Sound Waves');
  const derF = F('topic', sound.id, 'Derivations');

  Q('topic', shm.id, {
    t: 'SHM energy equations',
    p: 'Recall KE/PE expressions and the energy graph.',
    tg: ['formula'],
    due: t,
    iv: 3,
    reps: 2,
    last: 3
  });

  Q('topic', shm.id, {
    t: 'Simple pendulum — small angle',
    p: 'Revise the derivation and the small-angle justification.',
    tg: ['derivation'],
    due: addDays(t, 40),
    iv: 96,
    reps: 4,
    last: 56
  });

  Q('topic', shm.id, {
    t: 'Damped oscillation graphs',
    p: 'Sketch under/critically/over-damped from memory.',
    tg: ['diagram']
  });

  Q('topic', sound.id, {
    f: derF.id,
    t: 'Speed of sound — Laplace correction',
    p: 'Revise Newton to Laplace derivation with values.',
    pr: 'exam-critical',
    tg: ['derivation', 'exam-important'],
    due: addDays(t, -4),
    iv: 8,
    reps: 3,
    lap: 1,
    last: 12
  });

  Q('topic', sound.id, {
    f: derF.id,
    t: 'Doppler effect cases',
    p: 'Recall the four sign-convention cases.',
    due: addDays(t, 1),
    iv: 1,
    reps: 1,
    last: 1
  });

  Q('topic', sound.id, {
    f: derF.id,
    t: 'Beats and applications',
    p: 'Revise beat frequency and the tuning-fork method.',
    due: addDays(t, 9),
    iv: 9,
    reps: 2,
    last: 9
  });

  const pchem = C(chem, 'Physical Chemistry');
  const org = C(chem, 'Organic Chemistry');
  const thermo = T(pchem, 'Thermodynamics');
  const electro = T(pchem, 'Electrochemistry');
  const goc = T(org, 'GOC');

  Q('topic', thermo.id, {
    t: 'First law — sign conventions',
    p: 'Recall the IUPAC sign table and two worked examples.',
    due: t,
    iv: 5,
    reps: 2,
    last: 5
  });

  Q('topic', thermo.id, {
    t: 'Carnot cycle efficiency',
    p: 'Revise the cycle steps and efficiency derivation.',
    pr: 'high',
    tg: ['formula'],
    due: addDays(t, -3),
    iv: 7,
    reps: 2,
    last: 10
  });

  Q('topic', thermo.id, {
    t: 'Enthalpy vs internal energy',
    p: 'Explain dH = dU + dn(g)RT in your own words.',
    due: addDays(t, 5),
    iv: 5,
    reps: 1,
    last: 5
  });

  Q('topic', electro.id, {
    t: 'Nernst equation practice',
    p: 'Solve two Nernst numericals from the notebook.',
    pr: 'high',
    tg: ['numerical'],
    rt: 'notebook',
    rl: 'p. 61',
    due: t,
    iv: 4,
    reps: 2,
    last: 4
  });

  Q('topic', electro.id, {
    t: 'Conductivity terminology',
    p: 'Recall kappa, lambda-m and their dilution behaviour.',
    sus: true,
    iv: 3,
    reps: 1,
    last: 3
  });

  Q('topic', goc.id, {
    t: 'Inductive vs resonance effects',
    p: 'Compare with one example each; note the distance dependence.',
    due: t,
    iv: 6,
    reps: 2,
    last: 6
  });

  Q('topic', goc.id, {
    t: 'Carbocation stability order',
    p: 'Recall the full stability order with reasons.',
    due: addDays(t, 55),
    iv: 100,
    reps: 4,
    last: 45
  });

  const calc = C(math, 'Calculus');
  const alg = C(math, 'Algebra');
  const lim = T(calc, 'Limits & Continuity');
  const deriv = T(calc, 'Derivatives');
  const mat = T(alg, 'Matrices');
  const probF = F('topic', deriv.id, 'Problem Sets');

  Q('topic', lim.id, {
    t: 'Standard limits list',
    p: 'Recall the 8 standard limits from the formula sheet.',
    due: addDays(t, -1),
    iv: 2,
    reps: 1,
    last: 3
  });

  Q('topic', lim.id, {
    t: 'Indeterminate forms practice',
    p: 'Revise the 5 indeterminate forms with one example each.',
    tg: ['numerical'],
    due: t,
    iv: 3,
    reps: 1,
    last: 3
  });

  Q('topic', deriv.id, {
    f: probF.id,
    t: 'Chain rule mixed problems',
    p: 'Revise the mixed problem set from the problem folder.',
    due: addDays(t, 4),
    iv: 4,
    reps: 1,
    last: 4
  });

  Q('topic', deriv.id, {
    t: 'Implicit differentiation',
    p: 'Recall the workflow and the circle example.'
  });

  Q('topic', mat.id, {
    t: 'Row reduction workflow',
    p: 'Recall the RREF workflow and pivot rules.',
    due: t,
    iv: 6,
    reps: 2,
    last: 6
  });

  Q('topic', mat.id, {
    t: 'Determinant properties',
    p: 'Revise the 7 properties with mini-proofs.',
    due: addDays(t, 15),
    iv: 45,
    reps: 3,
    last: 30
  });

  const gen = C(bio, 'Genetics');
  const mend = T(gen, 'Mendelian Genetics');

  Q('topic', mend.id, {
    t: 'Monohybrid cross walkthrough',
    p: 'Recall the full cross with ratios and the test-cross check.',
    due: t,
    iv: 5,
    reps: 2,
    last: 5
  });

  Q('topic', mend.id, {
    t: 'Purpose of a test cross',
    p: 'Explain in one sentence plus one diagram.'
  });

  Q('topic', mend.id, {
    t: 'Independent assortment',
    p: 'Revise the dihybrid ratio and its meaning.',
    due: addDays(t, 8),
    iv: 8,
    reps: 2,
    last: 8
  });

  const seq: SrsRating[] = ['good', 'hard', 'good', 'easy'];
  currentDB.questions.forEach((qq) => {
    const s = qq.schedule;
    if (!s.lastReviewed) return;
    let iv = s.interval || 2;
    let d = toISO(new Date(s.lastReviewed));
    const n = Math.min(3, (s.reps || 0) + (s.lapses || 0));
    for (let i = 0; i < n; i++) {
      const prev = Math.max(1, Math.round(iv / 2.1));
      currentDB.logs.push({
        id: uid(),
        itemType: 'question',
        itemId: qq.id,
        at: parseISO(d).getTime() + 36e5 * 10,
        date: d,
        rating: seq[(i + qq.title.length) % 4],
        prevDue: addDays(d, -prev),
        newDue: d,
        prevInterval: prev,
        newInterval: iv,
        reflection: '',
        sessionId: 'seed'
      });
      iv = prev;
      d = addDays(d, -Math.max(2, iv));
      if (Math.round((parseISO(t).getTime() - parseISO(d).getTime()) / 864e5) > 40) break;
    }
  });

  const reviewedQ = currentDB.questions.filter((q) => q.schedule.lastReviewed);
  [1, 2, 3, 4].forEach((k, i) => {
    const qq = reviewedQ[i % reviewedQ.length];
    const d = addDays(t, -k);
    currentDB.logs.push({
      id: uid(),
      itemType: 'question',
      itemId: qq.id,
      at: parseISO(d).getTime() + 36e5 * 18,
      date: d,
      rating: 'good',
      prevDue: addDays(d, -5),
      newDue: addDays(d, 5),
      prevInterval: 5,
      newInterval: 5,
      reflection: i === 1 ? 'felt solid' : '',
      sessionId: 'seed'
    });
  });

  for (let k = 5; k <= 32; k++) {
    if (k % 3 === 1) continue;
    const n = 1 + (k % 3);
    for (let j = 0; j < n; j++) {
      const qq = reviewedQ[(k * 7 + j * 5) % reviewedQ.length];
      const d = addDays(t, -k);
      currentDB.logs.push({
        id: uid(),
        itemType: 'question',
        itemId: qq.id,
        at: parseISO(d).getTime() + 36e5 * (9 + j * 3),
        date: d,
        rating: seq[(k + j) % 4],
        prevDue: addDays(d, -4),
        newDue: addDays(d, 6),
        prevInterval: 4,
        newInterval: 6,
        reflection: '',
        sessionId: 'seed'
      });
    }
  }

  currentDB.lastOpened = { type: 'subject', id: phy.id, at: Date.now() };
  saveDB();
}
