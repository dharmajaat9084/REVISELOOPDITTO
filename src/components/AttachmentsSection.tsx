import React, { useEffect, useRef, useState } from 'react';
import { IDB, fmtMB } from '../lib/idb';
import { ingestFiles } from '../lib/backup';
import { FileRecord } from '../types';
import { Icon } from './Icon';
import { MenuItem } from './ContextMenu';
import { timeAgo, fmtShort, todayISO, uid } from '../lib/srs';

interface AttachmentsSectionProps {
  ownerType: string;
  ownerId: string;
  onOpenViewer: (id: string) => void;
  onShowMenu: (e: React.MouseEvent, items: MenuItem[]) => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
  onPromptPatch: (id: string, field: string, label: string, currentVal: string) => void;
  onNoteModal: (ot: string, oid: string) => void;
  onRefresh?: () => void;
}

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({
  ownerType,
  ownerId,
  onOpenViewer,
  onShowMenu,
  onToast,
  onAskConfirm,
  onPromptPatch,
  onNoteModal,
  onRefresh
}) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const camInputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = async () => {
    const all = await IDB.all();
    const filtered = all
      .filter((r) => r.ownerType === ownerType && r.ownerId === ownerId)
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
    setFiles(filtered);
  };

  useEffect(() => {
    loadFiles();
  }, [ownerType, ownerId]);

  const handleFilesPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const n = await ingestFiles(e.target.files, ownerType, ownerId, 'note');
      e.target.value = '';
      if (n > 0) {
        onToast(`${n} file${n > 1 ? 's' : ''} attached `, 'clip');
        await loadFiles();
        if (onRefresh) onRefresh();
      }
    }
  };

  const handleRecToggle = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      onToast('Recording not supported on this browser', 'alert');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const rec: FileRecord = {
          id: uid(),
          ownerType,
          ownerId,
          role: 'note',
          name: 'Voice note · ' + fmtShort(todayISO()),
          mime: blob.type || 'audio/webm',
          kind: 'audio',
          size: blob.size,
          createdAt: Date.now(),
          tags: [],
          pinned: false,
          caption: '',
          pageMemo: '',
          overlay: null,
          blob
        };
        await IDB.put(rec);
        onToast('Voice note saved 🎙️', 'mic');
        await loadFiles();
        if (onRefresh) onRefresh();
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      onToast('Microphone access blocked', 'alert');
    }
  };

  const handleMenu = (e: React.MouseEvent, rec: FileRecord) => {
    e.stopPropagation();
    const items: MenuItem[] = [
      { label: 'Open / view', icon: 'play', fn: () => onOpenViewer(rec.id) }
    ];

    if (rec.kind === 'image') {
      items.push({
        label: rec.role === 'question' ? 'Demote to note' : 'Make this the question ⭐',
        icon: 'help',
        fn: async () => {
          rec.role = rec.role === 'question' ? 'note' : 'question';
          await IDB.put(rec);
          onToast(
            rec.role === 'question' ? 'Now the question image ⭐' : 'Demoted to note',
            'help'
          );
          await loadFiles();
          if (onRefresh) onRefresh();
        }
      });
    }

    items.push({
      label: rec.pinned ? 'Unpin' : 'Pin to top 📌',
      icon: 'pin',
      fn: async () => {
        rec.pinned = !rec.pinned;
        await IDB.put(rec);
        onToast(rec.pinned ? 'Pinned 📌' : 'Unpinned', 'check');
        await loadFiles();
        if (onRefresh) onRefresh();
      }
    });

    items.push({
      label: 'Rename',
      icon: 'edit',
      fn: () => onPromptPatch(rec.id, 'name', 'Rename file', rec.name)
    });

    if (rec.kind === 'image') {
      items.push({
        label: 'Handwritten caption',
        icon: 'pen',
        fn: () => onPromptPatch(rec.id, 'caption', 'Caption (handwritten)', rec.caption)
      });
    }

    if (rec.kind === 'pdf') {
      items.push({
        label: 'Page memo (p.…)',
        icon: 'bookmark',
        fn: () => onPromptPatch(rec.id, 'pageMemo', 'Revise from page', rec.pageMemo)
      });
    }

    items.push({
      label: 'Tags',
      icon: 'tag',
      fn: () =>
        onPromptPatch(rec.id, 'tags', 'Tags (comma separated)', (rec.tags || []).join(', '))
    });

    items.push({
      label: 'Download',
      icon: 'download',
      fn: () => {
        if (rec.blob) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(rec.blob);
          a.download = rec.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
    });

    items.push({
      label: 'Delete',
      icon: 'trash',
      danger: true,
      fn: () => {
        onAskConfirm('Delete file', 'Remove this attachment from the local vault?', async () => {
          await IDB.del(rec.id);
          onToast('Deleted', 'trash');
          await loadFiles();
          if (onRefresh) onRefresh();
        });
      }
    });

    onShowMenu(e, items);
  };

  const images = files.filter((r) => r.kind === 'image');
  const others = files.filter((r) => r.kind !== 'image');

  return (
    <div>
      <div className="sectiontitle">
        Materials <span className="grow" />
      </div>

      <div className="attbar">
        <button
          type="button"
          className="btn small soft"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="clip" size={14} /> Attach files
        </button>
        <button
          type="button"
          className="btn small ghost"
          onClick={() => camInputRef.current?.click()}
        >
          <Icon name="cam" size={14} /> Camera
        </button>
        <button
          type="button"
          className="btn small ghost"
          onClick={() => onNoteModal(ownerType, ownerId)}
        >
          <Icon name="edit" size={14} /> Text note
        </button>
        <button type="button" className="btn small ghost" onClick={handleRecToggle}>
          <Icon name="mic" size={14} />
          <span>{isRecording ? 'Stop ●' : 'Record'}</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.txt,.md,audio/*"
        style={{ display: 'none' }}
        onChange={handleFilesPicked}
      />
      <input
        ref={camInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFilesPicked}
      />

      {files.length === 0 && (
        <div className="crumb" style={{ marginBottom: '8px' }}>
          No materials yet — attach notes, PDFs, photos or voice memos. They open right here while revising.
        </div>
      )}

      {images.length > 0 && (
        <div className="attgrid" style={{ marginBottom: others.length ? '12px' : '0' }}>
          {images.map((r) => (
            <AttachmentImageCard
              key={r.id}
              rec={r}
              onOpen={() => onOpenViewer(r.id)}
              onMenu={(e) => handleMenu(e, r)}
            />
          ))}
        </div>
      )}

      {others.map((r) => (
        <div key={r.id} className="attrow" onClick={() => onOpenViewer(r.id)}>
          <div className="ai">
            <Icon
              name={r.kind === 'pdf' ? 'file' : r.kind === 'audio' ? 'mic' : 'edit'}
              size={16}
            />
          </div>
          <div className="an">
            <b>
              {r.name}
              {r.pinned ? ' 📌' : ''}
              {r.role === 'question' ? ' ⭐' : ''}
            </b>
            <span className="am">
              {r.kind === 'pdf' ? 'PDF' : r.kind === 'audio' ? 'Audio' : 'Text'} ·{' '}
              {fmtMB(r.size || 0)}
              {r.pageMemo ? ` · p.${r.pageMemo}` : ''} · {timeAgo(r.createdAt)}
            </span>
          </div>
          <button
            type="button"
            className="ibtn"
            onClick={(e) => handleMenu(e, r)}
            title="More options"
          >
            <Icon name="dots" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};

interface AttachmentImageCardProps {
  rec: FileRecord;
  onOpen: () => void;
  onMenu: (e: React.MouseEvent) => void;
}

const AttachmentImageCard: React.FC<AttachmentImageCardProps> = ({ rec, onOpen, onMenu }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (rec.blob) {
      const url = URL.createObjectURL(rec.blob);
      setSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [rec.blob]);

  return (
    <div className="attcard" onClick={onOpen}>
      {rec.pinned && <span className="pinb">📌 pinned</span>}
      <button
        type="button"
        className="kab"
        onClick={onMenu}
        title="Options"
      >
        <Icon name="dots" size={13} />
      </button>
      {src ? <img src={src} alt={rec.name} /> : <div className="aph">Loading...</div>}
      <div className="an">
        {rec.name}
        {rec.role === 'question' ? ' ⭐' : ''}
      </div>
      {rec.caption && <div className="hand">{rec.caption}</div>}
    </div>
  );
};
