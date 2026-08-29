import { FileKind, FileRecord } from '../types';

let dbInstance: IDBDatabase | null = null;

export const IDB = {
  open(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
      if (dbInstance) return res(dbInstance);
      if (typeof window === 'undefined' || !window.indexedDB) {
        return rej(new Error('IndexedDB unavailable'));
      }
      const r = indexedDB.open('reviseloop_files', 1);
      r.onupgradeneeded = (e: any) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('files')) {
          d.createObjectStore('files', { keyPath: 'id' });
        }
      };
      r.onsuccess = (e: any) => {
        dbInstance = e.target.result;
        res(dbInstance!);
      };
      r.onerror = () => rej(r.error);
    });
  },

  async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const d = await this.open();
    return d.transaction('files', mode).objectStore('files');
  },

  async put(rec: FileRecord): Promise<void> {
    const s = await this.store('readwrite');
    return new Promise((res, rej) => {
      const q = s.put(rec);
      q.onsuccess = () => res();
      q.onerror = () => rej(q.error);
    });
  },

  async get(id: string): Promise<FileRecord | null> {
    const s = await this.store('readonly');
    return new Promise((res) => {
      const q = s.get(id);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  },

  async all(): Promise<FileRecord[]> {
    const s = await this.store('readonly');
    return new Promise((res) => {
      const q = s.getAll();
      q.onsuccess = () => res(q.result || []);
      q.onerror = () => res([]);
    });
  },

  async del(id: string): Promise<void> {
    const s = await this.store('readwrite');
    return new Promise((res, rej) => {
      const q = s.delete(id);
      q.onsuccess = () => res();
      q.onerror = () => rej(q.error);
    });
  }
};

export function kindOf(mime: string, name: string): FileKind {
  if (mime && mime.indexOf('image') === 0) return 'image';
  if (mime === 'application/pdf' || /\.pdf$/i.test(name || '')) return 'pdf';
  if (mime && mime.indexOf('audio') === 0) return 'audio';
  return 'text';
}

export function compressImage(file: File | Blob): Promise<Blob> {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * sc));
        const h = Math.max(1, Math.round(img.height * sc));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        c.toBlob((b) => res(b || file), 'image/jpeg', 0.82);
      };
      img.onerror = () => res(file);
      img.src = fr.result as string;
    };
    fr.onerror = () => res(file);
    fr.readAsDataURL(file);
  });
}

export function fmtMB(bytes: number): string {
  return (bytes / 1048576).toFixed(1) + ' MB';
}
