export type EntityType = 'subject' | 'chapter' | 'topic' | 'subtopic' | 'folder' | 'question';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'exam-critical';
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsMode = 'adaptive' | 'leitner';
export type SrsPreset = 'gentle' | 'standard' | 'exam';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'gold' | 'ink' | 'redpen' | 'forest' | 'plum';
export type FileKind = 'image' | 'pdf' | 'audio' | 'text';
export type FileRole = 'note' | 'question';
export type MaturityLevel = 'new' | 'learning' | 'established' | 'mature' | 'mastered';

export interface Schedule {
  due: string; // YYYY-MM-DD
  interval: number; // days
  ease: number;
  reps: number;
  lapses: number;
  lastReviewed: number | null;
  box?: number;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  targetDate: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  schedule?: Schedule | null;
}

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
  description: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  schedule?: Schedule | null;
}

export interface Subtopic {
  id: string;
  topicId: string;
  name: string;
  description: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  schedule?: Schedule | null;
}

export interface Folder {
  id: string;
  parentType: 'chapter' | 'topic' | 'subtopic';
  parentId: string;
  name: string;
  description: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Question {
  id: string;
  parentType: 'chapter' | 'topic' | 'subtopic';
  parentId: string;
  folderId: string | null;
  title: string;
  prompt: string;
  referenceType?: string | null;
  referenceLocation?: string | null;
  priority: PriorityLevel;
  tags: string[];
  description?: string;
  note?: string;
  isArchived: boolean;
  isSuspended: boolean;
  createdAt: number;
  updatedAt: number;
  schedule: Schedule;
}

export interface ReviewLog {
  id: string;
  itemType: 'question' | 'chapter' | 'topic' | 'subtopic';
  itemId: string;
  at: number;
  date: string; // YYYY-MM-DD
  rating: SrsRating;
  prevDue: string;
  newDue: string;
  prevInterval: number;
  newInterval: number;
  reflection: string;
  sessionId: string;
}

export interface TrashItem {
  q: Question;
  deletedAt: number;
}

export interface SrsSettings {
  mode: SrsMode;
  preset: SrsPreset;
  first: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  easeStart: number;
  easeMin: number;
  easeMax: number;
  hardMult: number;
  easyBonus: number;
  maxInterval: number;
}

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentColor;
  dailyGoal: number;
  reviewAhead: boolean;
  order: 'priority' | 'due';
  srs: SrsSettings;
  reminder: {
    enabled: boolean;
    time: string;
  };
}

export interface LastOpenedRef {
  type: EntityType;
  id: string;
  at: number;
}

export interface AppDatabase {
  v: number;
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  subtopics: Subtopic[];
  folders: Folder[];
  questions: Question[];
  logs: ReviewLog[];
  trash: TrashItem[];
  settings: AppSettings;
  lastOpened: LastOpenedRef | null;
  onboarded: boolean;
  lastBackupAt: number | null;
  createdAt: number;
}

export interface FileRecord {
  id: string;
  ownerType: string;
  ownerId: string;
  role: FileRole;
  name: string;
  mime: string;
  kind: FileKind;
  size: number;
  createdAt: number;
  tags: string[];
  pinned: boolean;
  caption: string;
  pageMemo: string;
  overlay: string | null;
  blob: Blob;
}

export interface CrumbItem {
  type: EntityType;
  id: string;
  name: string;
}

export interface RefItem {
  type: 'question' | 'chapter' | 'topic' | 'subtopic';
  id: string;
}

export interface QueueItemInfo {
  ref: RefItem;
  type: 'question' | 'chapter' | 'topic' | 'subtopic';
  kindLabel: string;
  icon: string;
  title: string;
  prompt: string;
  priority: PriorityLevel;
  tags: string[];
  refType: string | null;
  refLoc: string | null;
  suspended: boolean;
  schedule: Schedule;
  crumb: CrumbItem[];
}
