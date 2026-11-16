import { NotebookDoc } from '../types';

const DB_NAME = 'AtelierStudioDB';
const DB_VERSION = 1;
const STORE_DOCS = 'notebooks';
const STORE_BLOBS = 'pdf_blobs';

function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listNotebooks(): Promise<NotebookDoc[]> {
  const db = await openStudioDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_DOCS, 'readonly');
    const req = tx.objectStore(STORE_DOCS).getAll();
    req.onsuccess = () => {
      const items = (req.result as NotebookDoc[]) ?? [];
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      db.close();
      resolve(items);
    };
    req.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}

export async function saveNotebook(doc: NotebookDoc): Promise<void> {
  const db = await openStudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_DOCS, 'readwrite');
    tx.objectStore(STORE_DOCS).put(doc);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deleteNotebook(id: string): Promise<void> {
  const db = await openStudioDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction([STORE_DOCS, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_DOCS).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      resolve();
    };
  });
}

export async function savePdfBytes(id: string, bytes: ArrayBuffer): Promise<void> {
  const db = await openStudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    tx.objectStore(STORE_BLOBS).put(bytes, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getPdfBytes(id: string): Promise<ArrayBuffer | null> {
  const db = await openStudioDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const req = tx.objectStore(STORE_BLOBS).get(id);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as ArrayBuffer) ?? null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}
