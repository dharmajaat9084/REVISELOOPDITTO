import React, { useEffect, useState } from 'react';
import { FileRecord } from '../types';
import { IDB } from '../lib/idb';
import { getDB, nodeObj } from '../lib/db';
import { Icon } from '../components/Icon';

interface MaterialsViewProps {
  onOpenViewer: (id: string) => void;
  onShowMenu: (e: React.MouseEvent, items: any[]) => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
  onPromptPatch: (id: string, field: string, label: string, currentVal: string) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  onOpenViewer,
  onShowMenu,
  onToast,
  onAskConfirm,
  onPromptPatch
}) => {
  const [records, setRecords] = useState<FileRecord[]>([]);
  const [kindFilter, setKindFilter] = useState<'all' | 'image' | 'pdf' | 'text' | 'audio'>('all');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    const all = await IDB.all();
    setRecords(all);
  };

  useEffect(() => {
    loadData();
  }, []);

  const db = getDB();

  let list = records;
  if (kindFilter !== 'all') {
    list = list.filter((r) => r.kind === kindFilter);
  }
  const q = search.toLowerCase().trim();
  if (q) {
    list = list.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.caption || '').toLowerCase().includes(q) ||
        (r.tags || []).some((tg) => tg.toLowerCase().includes(q))
    );
  }
  list.sort((a, b) => b.createdAt - a.createdAt);

  const handleMenu = (e: React.MouseEvent, rec: FileRecord) => {
    e.stopPropagation();
    const items = [
      { label: 'Open / view', icon: 'play', fn: () => onOpenViewer(rec.id) },
      {
        label: rec.pinned ? 'Unpin' : 'Pin to top 📌',
        icon: 'pin',
        fn: async () => {
          rec.pinned = !rec.pinned;
          await IDB.put(rec);
          onToast(rec.pinned ? 'Pinned 📌' : 'Unpinned', 'check');
          loadData();
        }
      },
      {
        label: 'Rename',
        icon: 'edit',
        fn: () => onPromptPatch(rec.id, 'name', 'Rename file', rec.name)
      },
      {
        label: 'Delete',
        icon: 'trash',
        danger: true,
        fn: () => {
          onAskConfirm('Delete file', 'Remove this attachment from the local vault?', async () => {
            await IDB.del(rec.id);
            onToast('Deleted', 'trash');
            loadData();
          });
        }
      }
    ];
    onShowMenu(e, items);
  };

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Materials</h1>
          <div className="sub">Every file in your local vault</div>
        </div>
        <div className="grow" />
        <input
          style={{ width: '220px' }}
          placeholder="Search name / tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chiprow" style={{ marginBottom: '16px' }}>
        {[
          ['all', 'All'],
          ['image', 'Images'],
          ['pdf', 'PDFs'],
          ['text', 'Text'],
          ['audio', 'Audio']
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`chip ${kindFilter === k ? 'active' : ''}`}
            onClick={() => setKindFilter(k as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty card">
          <div className="eicon">📁</div>
          <h3>No materials</h3>
          <p>
            Attach files from any subject, chapter, topic, folder or question — they all land here.
          </p>
        </div>
      ) : (
        <div className="attgrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {list.map((r) => {
            const owner =
              r.ownerType === 'question'
                ? db.questions.find((x) => x.id === r.ownerId)?.title || 'Question'
                : nodeObj(r.ownerType as any, r.ownerId)?.name || 'Item';

            return (
              <MaterialThumbnailCard
                key={r.id}
                rec={r}
                owner={owner}
                onOpen={() => onOpenViewer(r.id)}
                onMenu={(e) => handleMenu(e, r)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const MaterialThumbnailCard: React.FC<{
  rec: FileRecord;
  owner: string;
  onOpen: () => void;
  onMenu: (e: React.MouseEvent) => void;
}> = ({ rec, owner, onOpen, onMenu }) => {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (rec.kind === 'image' && rec.blob) {
      const url = URL.createObjectURL(rec.blob);
      setThumb(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [rec]);

  return (
    <div className="attcard" onClick={onOpen}>
      {rec.pinned && <span className="pinb">📌</span>}
      <button
        type="button"
        className="kab"
        onClick={onMenu}
        title="Options"
      >
        <Icon name="dots" size={13} />
      </button>

      {rec.kind === 'image' ? (
        thumb ? (
          <img src={thumb} alt={rec.name} />
        ) : (
          <div className="aph">Loading…</div>
        )
      ) : (
        <div className="aph">
          <Icon
            name={rec.kind === 'pdf' ? 'file' : rec.kind === 'audio' ? 'mic' : 'edit'}
            size={26}
          />
        </div>
      )}

      <div className="an">{rec.name}</div>
      <div className="hand" style={{ padding: '0 8px 8px', fontSize: '.85rem' }}>
        {owner}
      </div>
    </div>
  );
};
