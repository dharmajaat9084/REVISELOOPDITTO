import React, { useEffect, useState } from 'react';
import { QueueItemInfo, FileRecord } from '../types';
import { IDB } from '../lib/idb';
import { getQ, nodeObj, parentTypeOf, pidKey } from '../lib/db';
import { cap } from '../lib/srs';
import { Icon } from './Icon';
import { ViewerModal } from './ViewerModal';

interface NotesDrawerProps {
  info: QueueItemInfo;
  onClose: () => void;
  onToast: (msg: string, icon?: string) => void;
  onOpenViewerFull: (id: string) => void;
}

interface OwnerEntry {
  ot: string;
  oid: string;
  label: string;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  info,
  onClose,
  onToast,
  onOpenViewerFull
}) => {
  const [owners, setOwners] = useState<OwnerEntry[]>([]);
  const [records, setRecords] = useState<FileRecord[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    const out: OwnerEntry[] = [
      {
        ot: info.ref.type,
        oid: info.ref.id,
        label: info.type === 'question' ? 'This question' : cap(info.type)
      }
    ];

    if (info.type === 'question') {
      const q = getQ(info.ref.id);
      if (q) {
        if (q.folderId) out.push({ ot: 'folder', oid: q.folderId, label: 'Folder' });
        let pt = q.parentType;
        let pid = q.parentId;
        while (pt) {
          out.push({ ot: pt, oid: pid, label: cap(pt) });
          const n = nodeObj(pt, pid);
          if (!n) break;
          const npt = parentTypeOf(pt);
          const pKey = pidKey(pt);
          pid = pKey ? n[pKey] : '';
          pt = npt as any;
        }
      }
    } else {
      const n = nodeObj(info.ref.type, info.ref.id);
      if (n) {
        let pt = parentTypeOf(info.ref.type);
        const pKey = pidKey(info.ref.type);
        let pid = pKey ? n[pKey] : '';
        while (pt) {
          out.push({ ot: pt, oid: pid, label: cap(pt) });
          const m = nodeObj(pt, pid);
          if (!m) break;
          const nextPt = parentTypeOf(pt);
          const nextKey = pidKey(pt);
          pid = nextKey ? m[nextKey] : '';
          pt = nextPt as any;
        }
      }
    }
    setOwners(out);

    IDB.all().then((all) => {
      setRecords(all);
    });
  }, [info]);

  if (selectedFileId) {
    return (
      <div id="notesDrawer">
        <ViewerModal
          fileId={selectedFileId}
          isEmbed={true}
          onBack={() => setSelectedFileId(null)}
          onClose={onClose}
          onToast={onToast}
        />
      </div>
    );
  }

  let hasAnyMaterials = false;

  return (
    <div id="notesDrawer">
      <div className="dhead">
        <b>Materials 📁</b>
        <span style={{ fontSize: '.7rem', color: 'var(--muted)', fontWeight: 700 }}>
          press N to toggle
        </span>
        <button className="ibtn" onClick={onClose} title="Close Drawer">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="dbody">
        {info.refLoc && (
          <div className="dgroup">
            <h4>Reference link</h4>
            <div
              className="attrow"
              onClick={() => {
                if (info.refType === 'url' && info.refLoc && /^https?:/.test(info.refLoc)) {
                  window.open(info.refLoc, '_blank');
                }
              }}
            >
              <div className="ai">
                <Icon name="external" size={16} />
              </div>
              <div className="an">
                <b>
                  {cap(info.refType || 'ref')}: {info.refLoc}
                </b>
              </div>
            </div>
          </div>
        )}

        {owners.map((o) => {
          const recs = records
            .filter((r) => r.ownerType === o.ot && r.ownerId === o.oid)
            .sort(
              (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt
            );
          if (!recs.length) return null;
          hasAnyMaterials = true;

          return (
            <div key={`${o.ot}-${o.oid}`} className="dgroup">
              <h4>
                {o.label} · {recs.length}
              </h4>
              {recs.map((r) => (
                <div
                  key={r.id}
                  className="attrow"
                  onClick={() => setSelectedFileId(r.id)}
                >
                  <div className="ai">
                    <Icon
                      name={
                        r.kind === 'image'
                          ? 'cam'
                          : r.kind === 'pdf'
                          ? 'file'
                          : r.kind === 'audio'
                          ? 'mic'
                          : 'edit'
                      }
                      size={16}
                    />
                  </div>
                  <div className="an">
                    <b>
                      {r.name}
                      {r.pinned ? ' 📌' : ''}
                    </b>
                    <span className="am">
                      {r.kind}
                      {r.pageMemo ? ` · p.${r.pageMemo}` : ''}
                    </span>
                  </div>
                  <button
                    className="ibtn"
                    title="Fullscreen"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenViewerFull(r.id);
                    }}
                  >
                    <Icon name="fit" size={14} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {!hasAnyMaterials && !info.refLoc && (
          <div className="crumb" style={{ padding: '8px 2px' }}>
            Nothing attached yet for this item or its parents. Attach notes from the item’s page (📎 Attach files) — or paste Ctrl+V there.
          </div>
        )}
      </div>
    </div>
  );
};
