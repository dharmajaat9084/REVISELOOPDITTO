import JSZip from 'jszip';
import { getDB, saveDB, defaultDB } from './db';
import { IDB, kindOf, compressImage } from './idb';
import { todayISO, fmtShort, uid } from './srs';
import { FileRecord } from '../types';

export function safeName(n: string): string {
  return String(n || 'file').replace(/[\\/:*?"<>|]/g, '_');
}

export function dlBlob(name: string, blob: Blob): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

export function dlFile(name: string, text: string, mime?: string): void {
  try {
    dlBlob(name, new Blob([text], { type: mime || 'application/json' }));
  } catch (e) {
    console.error('Download failed', e);
  }
}

export async function exportZIP(onToast: (msg: string, icon?: string) => void): Promise<void> {
  onToast('Packing backup…', 'download');
  try {
    const zip = new JSZip();
    const db = getDB();
    zip.file('data.json', JSON.stringify(db));
    const all = await IDB.all();
    zip.file(
      'files.json',
      JSON.stringify(
        all.map((r) => {
          const o: any = {};
          for (const k in r) {
            if (k !== 'blob') o[k] = (r as any)[k];
          }
          return o;
        })
      )
    );
    const fdir = zip.folder('files');
    for (const r of all) {
      if (r.blob && fdir) {
        fdir.file(r.id + '_' + safeName(r.name), r.blob);
      }
    }
    const b = await zip.generateAsync({ type: 'blob' });
    dlBlob('reviseloop-backup-' + todayISO() + '.zip', b);
    db.lastBackupAt = Date.now();
    saveDB();
    onToast('ZIP backup exported (' + all.length + ' files)', 'download');
  } catch (e) {
    console.error(e);
    onToast('Backup failed', 'alert');
  }
}

export function exportJSON(onToast: (msg: string, icon?: string) => void): void {
  const db = getDB();
  db.lastBackupAt = Date.now();
  saveDB();
  dlFile('reviseloop-data-' + todayISO() + '.json', JSON.stringify(db, null, 2));
  onToast('Data exported (files not included)', 'download');
}

export function exportCSV(onToast: (msg: string, icon?: string) => void): void {
  const db = getDB();
  const rows = [
    [
      'date',
      'item_type',
      'item_id',
      'title',
      'rating',
      'prev_due',
      'new_due',
      'prev_interval',
      'new_interval',
      'reflection'
    ]
  ];

  db.logs.forEach((l) => {
    let title = 'deleted';
    if (l.itemType === 'question') {
      const q = db.questions.find((x) => x.id === l.itemId);
      if (q) title = q.title;
    } else {
      const arr =
        l.itemType === 'chapter'
          ? db.chapters
          : l.itemType === 'topic'
          ? db.topics
          : db.subtopics;
      const n = (arr as any[]).find((x) => x.id === l.itemId);
      if (n) title = n.name;
    }
    rows.push([
      l.date,
      l.itemType,
      l.itemId,
      String(title).replace(/,/g, ';'),
      l.rating,
      l.prevDue,
      l.newDue,
      String(l.prevInterval),
      String(l.newInterval),
      String(l.reflection || '').replace(/,/g, ';')
    ]);
  });

  dlFile('reviseloop-log.csv', rows.map((r) => r.join(',')).join('\n'), 'text/csv');
  onToast('CSV exported', 'download');
}

export async function importAny(
  file: File,
  askConfirm: (title: string, msg: string, onOk: () => void) => void,
  onToast: (msg: string, icon?: string) => void,
  onSuccess: () => void
): Promise<void> {
  const fr = new FileReader();
  fr.onload = async () => {
    try {
      const buf = fr.result as ArrayBuffer;
      const bytes = new Uint8Array(buf);
      if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
        // ZIP
        askConfirm(
          'Import ZIP backup',
          'Overwrite current data AND restore all attached files?',
          async () => {
            try {
              const zip = await JSZip.loadAsync(buf);
              const dataFile = zip.file('data.json');
              if (!dataFile) throw new Error('Missing data.json');
              const data = JSON.parse(await dataFile.async('string'));
              if (!data.subjects || !data.settings) throw new Error('Invalid DB schema');
              saveDB({ ...defaultDB(), ...data });

              const mf = zip.file('files.json');
              if (mf) {
                const metas: FileRecord[] = JSON.parse(await mf.async('string'));
                for (const m of metas) {
                  const entry = zip.file('files/' + m.id + '_' + safeName(m.name));
                  if (entry) {
                    const blob = await entry.async('blob');
                    await IDB.put({ ...m, blob });
                  }
                }
              }
              onToast('Backup restored with files', 'upload');
              onSuccess();
            } catch (err) {
              console.error(err);
              onToast('Invalid ZIP backup', 'alert');
            }
          }
        );
      } else {
        // JSON
        const text = new TextDecoder().decode(buf);
        const data = JSON.parse(text);
        if (!data.subjects || !data.settings) throw new Error('Invalid JSON file');
        askConfirm(
          'Import backup',
          'This will overwrite your current data (attached files NOT included in JSON). Continue?',
          () => {
            saveDB({ ...defaultDB(), ...data });
            onToast('Backup restored', 'upload');
            onSuccess();
          }
        );
      }
    } catch (e) {
      console.error(e);
      onToast('Invalid backup file', 'alert');
    }
  };
  fr.readAsArrayBuffer(file);
}

export function autoName(orig: string, ot: string, oid: string): string {
  let base = 'note';
  if (ot === 'question') {
    const db = getDB();
    const q = db.questions.find((x) => x.id === oid);
    base = q ? q.title : base;
  } else {
    const db = getDB();
    const arr =
      ot === 'subject'
        ? db.subjects
        : ot === 'chapter'
        ? db.chapters
        : ot === 'topic'
        ? db.topics
        : ot === 'subtopic'
        ? db.subtopics
        : db.folders;
    const n = (arr as any[]).find((x) => x.id === oid);
    base = n ? n.name : base;
  }
  const ext = (String(orig).match(/\.[a-z0-9]+$/i) || [''])[0];
  return String(base).slice(0, 42) + ' · ' + fmtShort(todayISO()) + ext;
}

export async function ingestFiles(
  list: FileList | File[],
  ot: string,
  oid: string,
  role: 'question' | 'note' = 'note'
): Promise<number> {
  const arr = Array.from(list || []);
  let n = 0;
  for (const f of arr) {
    try {
      let blob: Blob = f;
      let mime = f.type || 'text/plain';
      const kind = kindOf(mime, f.name);

      if (kind === 'pdf' && f.size > 15 * 1048576) {
        if (!confirm('Large PDF (' + Math.round(f.size / 1048576) + ' MB). Store it in the local vault anyway?')) {
          continue;
        }
      }
      if (kind === 'image') blob = await compressImage(f);
      if (kind === 'text') {
        const txt = await f.text();
        blob = new Blob([txt], { type: 'text/plain' });
        mime = 'text/plain';
      }

      const rec: FileRecord = {
        id: uid(),
        ownerType: ot,
        ownerId: oid,
        role,
        name: autoName(f.name, ot, oid),
        mime,
        kind,
        size: blob.size || f.size,
        createdAt: Date.now(),
        tags: [],
        pinned: false,
        caption: '',
        pageMemo: '',
        overlay: null,
        blob
      };
      await IDB.put(rec);
      n++;
    } catch (e) {
      console.error(e);
    }
  }
  return n;
}

export async function ingestTextNote(
  text: string,
  name: string | null,
  ot: string,
  oid: string,
  role: 'question' | 'note' = 'note'
): Promise<FileRecord> {
  const blob = new Blob([text], { type: 'text/plain' });
  const rec: FileRecord = {
    id: uid(),
    ownerType: ot,
    ownerId: oid,
    role,
    name: name || 'Note · ' + fmtShort(todayISO()),
    mime: 'text/plain',
    kind: 'text',
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
  return rec;
}
