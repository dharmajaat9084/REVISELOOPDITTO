import React, { useEffect, useState, useCallback } from 'react';
import {
  AppDatabase,
  EntityType,
  QueueItemInfo,
  AccentColor,
  SrsPreset,
  ThemeMode
} from './types';
import {
  getDB,
  saveDB,
  subscribeDB,
  loadSampleData,
  dueQueue,
  computeStreak,
  refInfo,
  refKey,
  parseRefKey
} from './lib/db';
import { exportZIP, ingestFiles } from './lib/backup';
import { IDB } from './lib/idb';
import { ToastContainer, ToastItem } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Fab } from './components/Fab';
import { ContextMenu, MenuItem } from './components/ContextMenu';
import { Modal } from './components/Modal';
import { ViewerModal } from './components/ViewerModal';

// Views
import { TodayView } from './views/TodayView';
import { LibraryView } from './views/LibraryView';
import { SubjectView } from './views/SubjectView';
import { ChapterView } from './views/ChapterView';
import { TopicView } from './views/TopicView';
import { SubtopicView } from './views/SubtopicView';
import { FolderView } from './views/FolderView';
import { QuestionView } from './views/QuestionView';
import { MaterialsView } from './views/MaterialsView';
import { StatsView } from './views/StatsView';
import { SearchView } from './views/SearchView';
import { SettingsView } from './views/SettingsView';
import { ReviewSessionView } from './views/ReviewSessionView';
import { OnboardingModal } from './views/OnboardingModal';

// Modals
import { SubjectModal } from './modals/SubjectModal';
import { NodeModal } from './modals/NodeModal';
import { FolderModal } from './modals/FolderModal';
import { QuestionModal } from './modals/QuestionModal';
import { RescheduleModal } from './modals/RescheduleModal';
import { MoveModal } from './modals/MoveModal';
import { TrashModal } from './modals/TrashModal';
import { CatchUpModal } from './modals/CatchUpModal';
import { TextNoteModal } from './modals/TextNoteModal';

export function App() {
  const [db, setDb] = useState<AppDatabase>(getDB());
  const [route, setRoute] = useState<{ view: string; id?: string | null }>({
    view: 'today',
    id: null
  });
  const [searchPreset, setSearchPreset] = useState<string | null>(null);

  // Modals
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; id?: string | null }>({
    open: false
  });
  const [nodeModal, setNodeModal] = useState<{
    open: boolean;
    kind: 'chapter' | 'topic' | 'subtopic';
    parentType: EntityType;
    parentId: string;
    id?: string | null;
  }>({
    open: false,
    kind: 'chapter',
    parentType: 'subject',
    parentId: ''
  });
  const [folderModal, setFolderModal] = useState<{
    open: boolean;
    parentType: 'chapter' | 'topic' | 'subtopic';
    parentId: string;
    id?: string | null;
  }>({
    open: false,
    parentType: 'chapter',
    parentId: ''
  });
  const [questionModal, setQuestionModal] = useState<{
    open: boolean;
    id?: string | null;
    parentType?: EntityType | null;
    parentId?: string | null;
    folderId?: string | null;
  }>({ open: false });
  const [rescheduleModal, setRescheduleModal] = useState<{
    open: boolean;
    itemKey: string;
  }>({ open: false, itemKey: '' });
  const [moveModal, setMoveModal] = useState<{
    open: boolean;
    questionId: string;
  }>({ open: false, questionId: '' });
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [catchUpModalOpen, setCatchUpModalOpen] = useState(false);
  const [textNoteModal, setTextNoteModal] = useState<{
    open: boolean;
    ownerType: string;
    ownerId: string;
  }>({ open: false, ownerType: '', ownerId: '' });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    msg: string;
    onOk: () => void;
  }>({ open: false, title: '', msg: '', onOk: () => {} });

  // Context Menu
  const [menu, setMenu] = useState<{
    open: boolean;
    items: MenuItem[];
    x: number;
    y: number;
  } | null>(null);

  // Fullscreen Viewer
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);

  // Review session
  const [session, setSession] = useState<{
    queue: QueueItemInfo[];
    scope: string;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((msg: string, icon = 'check') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, msg, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  const askConfirm = useCallback((title: string, msg: string, onOk: () => void) => {
    setConfirmModal({
      open: true,
      title,
      msg,
      onOk: () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        onOk();
      }
    });
  }, []);

  // Subscribe to DB changes
  useEffect(() => {
    return subscribeDB(() => {
      setDb({ ...getDB() });
    });
  }, []);

  // Theme & Accent application
  useEffect(() => {
    const th = db.settings.theme;
    const isDark =
      th === 'dark' ||
      (th === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.dataset.accent = db.settings.accent || 'gold';

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#221c14' : '#f2ebdb');
    }
  }, [db.settings.theme, db.settings.accent]);

  // Handle system dark mode changes
  useEffect(() => {
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (db.settings.theme === 'system') {
        const isDark = mql.matches;
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
      }
    };
    if (mql) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [db.settings.theme]);

  // Navigation
  const handleNav = (view: string, id: string | null = null) => {
    setRoute({ view, id });
    window.scrollTo(0, 0);
  };

  const showMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.stopPropagation();
    setMenu({
      open: true,
      items,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Node Kebab Menu
  const handleNodeMenu = (e: React.MouseEvent, type: string, id: string) => {
    const items: MenuItem[] = [
      {
        label: 'Edit',
        icon: 'edit',
        fn: () => {
          if (type === 'subject') {
            setSubjectModal({ open: true, id });
          } else {
            const arr =
              type === 'chapter'
                ? db.chapters
                : type === 'topic'
                ? db.topics
                : db.subtopics;
            const item = (arr as any[]).find((x) => x.id === id);
            const parentKey =
              type === 'chapter' ? 'subjectId' : type === 'topic' ? 'chapterId' : 'topicId';
            const parentType =
              type === 'chapter' ? 'subject' : type === 'topic' ? 'chapter' : 'topic';
            if (item) {
              setNodeModal({
                open: true,
                kind: type as any,
                parentType: parentType as any,
                parentId: item[parentKey],
                id
              });
            }
          }
        }
      },
      {
        label: 'Attach files',
        icon: 'clip',
        fn: () => {
          setTextNoteModal({ open: true, ownerType: type, ownerId: id });
        }
      },
      {
        label: 'Delete',
        icon: 'trash',
        danger: true,
        fn: () => {
          askConfirm('Delete ' + type, `This will delete this ${type} and its nested items.`, () => {
            if (type === 'subject') {
              db.subjects = db.subjects.filter((s) => s.id !== id);
              saveDB();
              handleNav('library');
            } else if (type === 'chapter') {
              db.chapters = db.chapters.filter((c) => c.id !== id);
              saveDB();
              handleNav('library');
            } else if (type === 'topic') {
              db.topics = db.topics.filter((t) => t.id !== id);
              saveDB();
            } else if (type === 'subtopic') {
              db.subtopics = db.subtopics.filter((s) => s.id !== id);
              saveDB();
            }
            addToast('Deleted', 'trash');
          });
        }
      }
    ];
    showMenu(e, items);
  };

  // Question Kebab Menu
  const handleQMenu = (e: React.MouseEvent, id: string) => {
    const q = db.questions.find((x) => x.id === id);
    if (!q) return;
    const key = `question:${id}`;

    showMenu(e, [
      {
        label: 'Revise now',
        icon: 'play',
        fn: () => handleStartSingle(key)
      },
      {
        label: 'Edit',
        icon: 'edit',
        fn: () => setQuestionModal({ open: true, id })
      },
      {
        label: 'Reschedule',
        icon: 'refresh',
        fn: () => setRescheduleModal({ open: true, itemKey: key })
      },
      {
        label: 'Move',
        icon: 'move',
        fn: () => setMoveModal({ open: true, questionId: id })
      },
      {
        label: 'Duplicate',
        icon: 'copy',
        fn: () => {
          const copy = JSON.parse(JSON.stringify(q));
          copy.id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
          copy.title = q.title + ' (copy)';
          copy.isSuspended = false;
          copy.createdAt = Date.now();
          db.questions.push(copy);
          saveDB();
          addToast('Duplicated as new item', 'copy');
        }
      },
      {
        label: q.isSuspended ? 'Resume' : 'Suspend',
        icon: q.isSuspended ? 'play' : 'pause',
        fn: () => {
          q.isSuspended = !q.isSuspended;
          saveDB();
          addToast(q.isSuspended ? 'Suspended' : 'Resumed', q.isSuspended ? 'pause' : 'play');
        }
      },
      {
        label: 'Delete',
        icon: 'trash',
        danger: true,
        fn: () => {
          askConfirm('Delete question', 'Move this question to trash?', () => {
            const idx = db.questions.findIndex((x) => x.id === id);
            if (idx >= 0) {
              db.trash.push({ q: db.questions[idx], deletedAt: Date.now() });
              db.questions.splice(idx, 1);
              saveDB();
              addToast('Moved to trash', 'trash');
            }
          });
        }
      }
    ]);
  };

  // Queue Item Menu
  const handleQueueMenu = (e: React.MouseEvent, key: string) => {
    const info = refInfo(parseRefKey(key));
    if (!info) return;

    const items: MenuItem[] = [
      {
        label: 'Revise now',
        icon: 'play',
        fn: () => handleStartSingle(key)
      },
      {
        label: 'Reschedule',
        icon: 'refresh',
        fn: () => setRescheduleModal({ open: true, itemKey: key })
      }
    ];

    if (info.type === 'question') {
      items.push({
        label: 'Edit',
        icon: 'edit',
        fn: () => setQuestionModal({ open: true, id: info.ref.id })
      });
      items.push({
        label: info.suspended ? 'Resume' : 'Suspend',
        icon: info.suspended ? 'play' : 'pause',
        fn: () => {
          const q = db.questions.find((x) => x.id === info.ref.id);
          if (q) {
            q.isSuspended = !q.isSuspended;
            saveDB();
            addToast(q.isSuspended ? 'Suspended' : 'Resumed', q.isSuspended ? 'pause' : 'play');
          }
        }
      });
    }

    showMenu(e, items);
  };

  // Prompt patch helper
  const handlePromptPatch = async (
    id: string,
    field: string,
    label: string,
    currentVal: string
  ) => {
    const v = prompt(`${label}:`, currentVal || '');
    if (v === null) return;
    const rec = await IDB.get(id);
    if (rec) {
      if (field === 'tags') {
        rec.tags = v
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);
      } else {
        (rec as any)[field] = v;
      }
      await IDB.put(rec);
      addToast('Saved ✍️', 'check');
      setDb({ ...getDB() });
    }
  };

  // Start Review Session
  const handleStartReview = (scope: 'due' | 'overdue' | 'ahead') => {
    if (scope === 'overdue') {
      setCatchUpModalOpen(true);
      return;
    }
    const list = dueQueue(scope);
    if (!list.length) {
      addToast('Nothing to review here', 'check');
      return;
    }
    setSession({ queue: list, scope });
  };

  const handleStartSingle = (key: string) => {
    const info = refInfo(parseRefKey(key));
    if (!info) return;
    setSession({ queue: [info], scope: 'single' });
  };

  const handleCatchUpSelect = (count: number) => {
    const list = dueQueue('overdue').slice(0, count);
    setCatchUpModalOpen(false);
    if (list.length > 0) {
      setSession({ queue: list, scope: 'overdue' });
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menu) setMenu(null);
        else if (viewerFileId) setViewerFileId(null);
        else {
          setSubjectModal({ open: false });
          setNodeModal((prev) => ({ ...prev, open: false }));
          setFolderModal((prev) => ({ ...prev, open: false }));
          setQuestionModal({ open: false });
          setRescheduleModal({ open: false, itemKey: '' });
          setMoveModal({ open: false, questionId: '' });
          setTrashModalOpen(false);
          setCatchUpModalOpen(false);
          setTextNoteModal({ open: false, ownerType: '', ownerId: '' });
          setConfirmModal((prev) => ({ ...prev, open: false }));
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menu, viewerFileId]);

  // Global Paste Attachment
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const cd = e.clipboardData;
      if (!cd) return;
      const files: File[] = [];
      for (let i = 0; i < cd.items.length; i++) {
        const it = cd.items[i];
        if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (!files.length) return;

      if (['subject', 'chapter', 'topic', 'subtopic', 'folder', 'question'].includes(route.view) && route.id) {
        e.preventDefault();
        const n = await ingestFiles(files, route.view, route.id, 'note');
        if (n > 0) {
          addToast(`${n} file${n > 1 ? 's' : ''} pasted & attached 📎`, 'clip');
          setDb({ ...getDB() });
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [route, addToast]);

  // Global Drag & Drop Attachment
  useEffect(() => {
    let dragDepth = 0;
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        dragDepth++;
        document.body.classList.add('dragging');
      }
    };
    const handleDragLeave = () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        document.body.classList.remove('dragging');
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragDepth = 0;
      document.body.classList.remove('dragging');
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;

      if (['subject', 'chapter', 'topic', 'subtopic', 'folder', 'question'].includes(route.view) && route.id) {
        const n = await ingestFiles(files, route.view, route.id, 'note');
        if (n > 0) {
          addToast(`${n} file${n > 1 ? 's' : ''} dropped & attached 📎`, 'clip');
          setDb({ ...getDB() });
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [route, addToast]);

  const dueCount = dueQueue('due').length;
  const streak = computeStreak();

  const handleFabClick = (e: React.MouseEvent) => {
    if (route.view === 'today') {
      setQuestionModal({ open: true });
      return;
    }
    if (route.view === 'library') {
      setSubjectModal({ open: true });
      return;
    }

    const items: MenuItem[] = [];
    if (route.view === 'subject' && route.id) {
      items.push({
        label: 'Add chapter',
        icon: 'book',
        fn: () =>
          setNodeModal({
            open: true,
            kind: 'chapter',
            parentType: 'subject',
            parentId: route.id!
          })
      });
    }
    if (route.view === 'chapter' && route.id) {
      items.push({
        label: 'Add topic',
        icon: 'bookmark',
        fn: () =>
          setNodeModal({
            open: true,
            kind: 'topic',
            parentType: 'chapter',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Add question folder',
        icon: 'folder',
        fn: () =>
          setFolderModal({
            open: true,
            parentType: 'chapter',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Add question',
        icon: 'help',
        fn: () =>
          setQuestionModal({
            open: true,
            parentType: 'chapter',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Attach files',
        icon: 'clip',
        fn: () =>
          setTextNoteModal({
            open: true,
            ownerType: 'chapter',
            ownerId: route.id!
          })
      });
    }
    if (route.view === 'topic' && route.id) {
      items.push({
        label: 'Add subtopic',
        icon: 'list',
        fn: () =>
          setNodeModal({
            open: true,
            kind: 'subtopic',
            parentType: 'topic',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Add question folder',
        icon: 'folder',
        fn: () =>
          setFolderModal({
            open: true,
            parentType: 'topic',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Add question',
        icon: 'help',
        fn: () =>
          setQuestionModal({
            open: true,
            parentType: 'topic',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Attach files',
        icon: 'clip',
        fn: () =>
          setTextNoteModal({
            open: true,
            ownerType: 'topic',
            ownerId: route.id!
          })
      });
    }
    if (route.view === 'subtopic' && route.id) {
      items.push({
        label: 'Add question folder',
        icon: 'folder',
        fn: () =>
          setFolderModal({
            open: true,
            parentType: 'subtopic',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Add question',
        icon: 'help',
        fn: () =>
          setQuestionModal({
            open: true,
            parentType: 'subtopic',
            parentId: route.id!
          })
      });
      items.push({
        label: 'Attach files',
        icon: 'clip',
        fn: () =>
          setTextNoteModal({
            open: true,
            ownerType: 'subtopic',
            ownerId: route.id!
          })
      });
    }
    if (route.view === 'folder' && route.id) {
      const f = db.folders.find((x) => x.id === route.id);
      if (f) {
        items.push({
          label: 'Add question',
          icon: 'help',
          fn: () =>
            setQuestionModal({
              open: true,
              parentType: f.parentType,
              parentId: f.parentId,
              folderId: route.id
            })
        });
      }
    }

    if (items.length > 0) {
      showMenu(e, items);
    } else {
      addToast('Nothing to add here', 'alert');
    }
  };

  const cycleTheme = () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    db.settings.theme = next;
    saveDB();
    addToast(`Theme: ${next}`);
  };

  return (
    <>
      <div className="veil">
        <b>Drop to attach 📎</b>
      </div>

      <div className="app">
        <Sidebar
          currentView={route.view}
          dueCount={dueCount}
          theme={db.settings.theme}
          onNav={handleNav}
          onSearchPreset={(p) => {
            setSearchPreset(p);
            handleNav('search');
          }}
          onCycleTheme={cycleTheme}
          onExportZIP={() => exportZIP(addToast)}
        />

        <div className="main">
          <TopBar
            streak={streak}
            theme={db.settings.theme}
            onSearch={() => handleNav('search')}
            onQuickAdd={() => setQuestionModal({ open: true })}
            onCycleTheme={cycleTheme}
          />

          <div className="content">
            {route.view === 'today' && (
              <TodayView
                db={db}
                onStartReview={handleStartReview}
                onStartSingle={handleStartSingle}
                onOpenRef={(type, id) => handleNav(type, id)}
                onNav={handleNav}
                onQuestionModal={(opts) => setQuestionModal({ open: true, ...opts })}
                onQueueMenu={handleQueueMenu}
              />
            )}

            {route.view === 'library' && (
              <LibraryView
                db={db}
                onOpenSubject={(id) => handleNav('subject', id)}
                onNewSubject={() => setSubjectModal({ open: true })}
                onSubjectMenu={(e, id) => handleNodeMenu(e, 'subject', id)}
              />
            )}

            {route.view === 'subject' && route.id && (
              <SubjectView
                id={route.id}
                db={db}
                onBack={() => handleNav('library')}
                onOpenChapter={(id) => handleNav('chapter', id)}
                onAddChapter={() =>
                  setNodeModal({
                    open: true,
                    kind: 'chapter',
                    parentType: 'subject',
                    parentId: route.id!
                  })
                }
                onNodeMenu={handleNodeMenu}
                onOpenViewer={(id) => setViewerFileId(id)}
                onShowMenu={showMenu}
                onToast={addToast}
                onAskConfirm={askConfirm}
                onPromptPatch={handlePromptPatch}
                onNoteModal={(ot, oid) =>
                  setTextNoteModal({ open: true, ownerType: ot, ownerId: oid })
                }
              />
            )}

            {route.view === 'chapter' && route.id && (
              <ChapterView
                id={route.id}
                db={db}
                onBack={() => handleNav('library')}
                onOpenTopic={(id) => handleNav('topic', id)}
                onOpenFolder={(id) => handleNav('folder', id)}
                onOpenQuestion={(id) => handleNav('question', id)}
                onAddTopic={() =>
                  setNodeModal({
                    open: true,
                    kind: 'topic',
                    parentType: 'chapter',
                    parentId: route.id!
                  })
                }
                onAddFolder={() =>
                  setFolderModal({
                    open: true,
                    parentType: 'chapter',
                    parentId: route.id!
                  })
                }
                onAddQuestion={(opts) => setQuestionModal({ open: true, ...opts })}
                onNodeMenu={handleNodeMenu}
                onQMenu={handleQMenu}
                onStartSingle={handleStartSingle}
                onReschedule={(key) => setRescheduleModal({ open: true, itemKey: key })}
                onOpenViewer={(id) => setViewerFileId(id)}
                onShowMenu={showMenu}
                onToast={addToast}
                onAskConfirm={askConfirm}
                onPromptPatch={handlePromptPatch}
                onNoteModal={(ot, oid) =>
                  setTextNoteModal({ open: true, ownerType: ot, ownerId: oid })
                }
              />
            )}

            {route.view === 'topic' && route.id && (
              <TopicView
                id={route.id}
                db={db}
                onBack={() => handleNav('library')}
                onOpenSubtopic={(id) => handleNav('subtopic', id)}
                onOpenFolder={(id) => handleNav('folder', id)}
                onOpenQuestion={(id) => handleNav('question', id)}
                onAddSubtopic={() =>
                  setNodeModal({
                    open: true,
                    kind: 'subtopic',
                    parentType: 'topic',
                    parentId: route.id!
                  })
                }
                onAddFolder={() =>
                  setFolderModal({
                    open: true,
                    parentType: 'topic',
                    parentId: route.id!
                  })
                }
                onAddQuestion={(opts) => setQuestionModal({ open: true, ...opts })}
                onNodeMenu={handleNodeMenu}
                onQMenu={handleQMenu}
                onStartSingle={handleStartSingle}
                onReschedule={(key) => setRescheduleModal({ open: true, itemKey: key })}
                onOpenViewer={(id) => setViewerFileId(id)}
                onShowMenu={showMenu}
                onToast={addToast}
                onAskConfirm={askConfirm}
                onPromptPatch={handlePromptPatch}
                onNoteModal={(ot, oid) =>
                  setTextNoteModal({ open: true, ownerType: ot, ownerId: oid })
                }
              />
            )}

            {route.view === 'subtopic' && route.id && (
              <SubtopicView
                id={route.id}
                db={db}
                onBack={() => handleNav('library')}
                onOpenFolder={(id) => handleNav('folder', id)}
                onOpenQuestion={(id) => handleNav('question', id)}
                onAddFolder={() =>
                  setFolderModal({
                    open: true,
                    parentType: 'subtopic',
                    parentId: route.id!
                  })
                }
                onAddQuestion={(opts) => setQuestionModal({ open: true, ...opts })}
                onNodeMenu={handleNodeMenu}
                onQMenu={handleQMenu}
                onStartSingle={handleStartSingle}
                onReschedule={(key) => setRescheduleModal({ open: true, itemKey: key })}
                onOpenViewer={(id) => setViewerFileId(id)}
                onShowMenu={showMenu}
                onToast={addToast}
                onAskConfirm={askConfirm}
                onPromptPatch={handlePromptPatch}
                onNoteModal={(ot, oid) =>
                  setTextNoteModal({ open: true, ownerType: ot, ownerId: oid })
                }
              />
            )}

            {route.view === 'folder' && route.id && (
              <FolderView
                id={route.id}
                db={db}
                onBack={() => handleNav('library')}
                onOpenQuestion={(id) => handleNav('question', id)}
                onAddQuestion={(opts) => setQuestionModal({ open: true, ...opts })}
                onQMenu={handleQMenu}
                onOpenViewer={(id) => setViewerFileId(id)}
                onShowMenu={showMenu}
                onToast={addToast}
                onAskConfirm={askConfirm}
                onPromptPatch={handlePromptPatch}
                onNoteModal={(ot, oid) =>
                  setTextNoteModal({ open: true, ownerType: ot, ownerId: oid })
                }
              />
            )}

            {route.view === 'question' && route.id && (
              <QuestionView
                id={route.id}
                db={db}
                onBack={() => handleNav('library')}
                onStartSingle={handleStartSingle}
                onReschedule={(key) => setRescheduleModal({ open: true, itemKey: key })}
                onMoveModal={(id) => setMoveModal({ open: true, questionId: id })}
                onEditModal={(id) => setQuestionModal({ open: true, id })}
                onDuplicate={(id) => {
                  const q = db.questions.find((x) => x.id === id);
                  if (!q) return;
                  const copy = JSON.parse(JSON.stringify(q));
                  copy.id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
                  copy.title = q.title + ' (copy)';
                  copy.isSuspended = false;
                  copy.createdAt = Date.now();
                  db.questions.push(copy);
                  saveDB();
                  addToast('Duplicated as new item', 'copy');
                }}
                onDeleteQuestion={(id) => {
                  askConfirm('Delete question', 'Move this question to trash?', () => {
                    const idx = db.questions.findIndex((x) => x.id === id);
                    if (idx >= 0) {
                      db.trash.push({ q: db.questions[idx], deletedAt: Date.now() });
                      db.questions.splice(idx, 1);
                      saveDB();
                      addToast('Moved to trash', 'trash');
                      handleNav('library');
                    }
                  });
                }}
                onQMenu={handleQMenu}
                onOpenViewer={(id) => setViewerFileId(id)}
                onShowMenu={showMenu}
                onToast={addToast}
                onAskConfirm={askConfirm}
                onPromptPatch={handlePromptPatch}
                onNoteModal={(ot, oid) =>
                  setTextNoteModal({ open: true, ownerType: ot, ownerId: oid })
                }
              />
            )}

            {route.view === 'materials' && (
              <MaterialsView
                onOpenViewer={(id) => setViewerFileId(id)}
                onShowMenu={showMenu}
                onToast={addToast}
                onAskConfirm={askConfirm}
                onPromptPatch={handlePromptPatch}
              />
            )}

            {route.view === 'stats' && (
              <StatsView
                db={db}
                onNav={handleNav}
                onOpenQuestion={(id) => handleNav('question', id)}
              />
            )}

            {route.view === 'search' && (
              <SearchView
                db={db}
                initialPreset={searchPreset}
                onOpenRef={(type, id) => handleNav(type, id)}
              />
            )}

            {route.view === 'settings' && (
              <SettingsView
                db={db}
                onSetThemeMode={(m) => {
                  db.settings.theme = m;
                  saveDB();
                }}
                onSetAccent={(a: AccentColor) => {
                  db.settings.accent = a;
                  saveDB();
                }}
                onApplyPreset={(p: SrsPreset) => {
                  const presets: Record<SrsPreset, any> = {
                    gentle: {
                      first: { again: 1, hard: 1, good: 2, easy: 3 },
                      hardMult: 1.1,
                      easyBonus: 1.2,
                      easeStart: 2.2,
                      easeMin: 1.3,
                      easeMax: 2.6,
                      maxInterval: 90
                    },
                    standard: {
                      first: { again: 1, hard: 1, good: 2, easy: 4 },
                      hardMult: 1.2,
                      easyBonus: 1.3,
                      easeStart: 2.5,
                      easeMin: 1.3,
                      easeMax: 2.8,
                      maxInterval: 180
                    },
                    exam: {
                      first: { again: 1, hard: 1, good: 1, easy: 2 },
                      hardMult: 1.1,
                      easyBonus: 1.2,
                      easeStart: 2.3,
                      easeMin: 1.3,
                      easeMax: 2.6,
                      maxInterval: 60
                    }
                  };
                  Object.assign(db.settings.srs, presets[p]);
                  db.settings.srs.preset = p;
                  saveDB();
                  addToast(`Preset applied: ${p}`, 'zap');
                }}
                onOpenTrash={() => setTrashModalOpen(true)}
                onResetApp={() => {
                  askConfirm(
                    'Reset app',
                    'Delete ALL subjects, questions, logs, settings AND every attached file in the vault?',
                    async () => {
                      localStorage.removeItem('reviseloop_v1');
                      const all = await IDB.all();
                      await Promise.all(all.map((r) => IDB.del(r.id)));
                      window.location.reload();
                    }
                  );
                }}
                onLoadSample={() => {
                  askConfirm(
                    'Load sample plan',
                    'Replace current data with the demo study plan (Physics, Chemistry, Math, Biology)?',
                    () => {
                      loadSampleData();
                      addToast('Sample plan loaded', 'zap');
                    }
                  );
                }}
                onToast={addToast}
                onAskConfirm={askConfirm}
              />
            )}
          </div>
        </div>
      </div>

      <BottomNav
        currentView={route.view}
        dueCount={dueCount}
        onNav={handleNav}
      />

      <Fab
        currentView={route.view}
        hasSession={!!session}
        onClick={handleFabClick}
      />

      {/* Active Revision Session Overlay */}
      {session && (
        <ReviewSessionView
          queue={session.queue}
          scope={session.scope}
          onClose={() => setSession(null)}
          onToast={addToast}
          onOpenViewerFull={(id) => setViewerFileId(id)}
        />
      )}

      {/* Fullscreen Media Viewer */}
      {viewerFileId && (
        <ViewerModal
          fileId={viewerFileId}
          onClose={() => setViewerFileId(null)}
          onToast={addToast}
        />
      )}

      {/* Context Menu */}
      {menu && menu.open && (
        <ContextMenu
          items={menu.items}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        />
      )}

      {/* Modals */}
      {subjectModal.open && (
        <SubjectModal
          id={subjectModal.id}
          onClose={() => setSubjectModal({ open: false })}
          onToast={addToast}
        />
      )}

      {nodeModal.open && (
        <NodeModal
          kind={nodeModal.kind}
          parentType={nodeModal.parentType}
          parentId={nodeModal.parentId}
          id={nodeModal.id}
          onClose={() => setNodeModal((prev) => ({ ...prev, open: false }))}
          onToast={addToast}
        />
      )}

      {folderModal.open && (
        <FolderModal
          parentType={folderModal.parentType}
          parentId={folderModal.parentId}
          id={folderModal.id}
          onClose={() => setFolderModal((prev) => ({ ...prev, open: false }))}
          onToast={addToast}
        />
      )}

      {questionModal.open && (
        <QuestionModal
          id={questionModal.id}
          parentType={questionModal.parentType}
          parentId={questionModal.parentId}
          folderId={questionModal.folderId}
          onClose={() => setQuestionModal({ open: false })}
          onToast={addToast}
        />
      )}

      {rescheduleModal.open && (
        <RescheduleModal
          itemKey={rescheduleModal.itemKey}
          onClose={() => setRescheduleModal({ open: false, itemKey: '' })}
          onToast={addToast}
        />
      )}

      {moveModal.open && (
        <MoveModal
          questionId={moveModal.questionId}
          onClose={() => setMoveModal({ open: false, questionId: '' })}
          onToast={addToast}
        />
      )}

      {trashModalOpen && (
        <TrashModal
          onClose={() => setTrashModalOpen(false)}
          onToast={addToast}
          onAskConfirm={askConfirm}
        />
      )}

      {catchUpModalOpen && (
        <CatchUpModal
          overdueItems={dueQueue('overdue')}
          onClose={() => setCatchUpModalOpen(false)}
          onSelectCount={handleCatchUpSelect}
        />
      )}

      {textNoteModal.open && (
        <TextNoteModal
          ownerType={textNoteModal.ownerType}
          ownerId={textNoteModal.ownerId}
          onClose={() => setTextNoteModal({ open: false, ownerType: '', ownerId: '' })}
          onToast={addToast}
          onSuccess={() => setDb({ ...getDB() })}
        />
      )}

      {confirmModal.open && (
        <Modal title={confirmModal.title} onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}>
          <p style={{ fontSize: '.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            {confirmModal.msg}
          </p>
          <div className="mrow">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={confirmModal.onOk}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* Onboarding */}
      {!db.onboarded && (
        <OnboardingModal
          currentTheme={db.settings.theme}
          onSetTheme={(th: ThemeMode) => {
            db.settings.theme = th;
            saveDB();
          }}
          onChoose={(mode: 'fresh' | 'sample') => {
            db.onboarded = true;
            saveDB();
            if (mode === 'sample') {
              loadSampleData();
              addToast('Sample plan loaded — happy revising!', 'zap');
              handleNav('today');
            } else {
              handleNav('library');
              setSubjectModal({ open: true });
            }
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
