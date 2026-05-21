const DB_NAME = "tab-switcher";
const STORE_NAME = "thumbnails";
const DB_VERSION = 1;
const MAX_ENTRIES = 100;
const OLD_STORAGE_KEY = "urlScreenshots";

type ThumbnailRecord = {
  url: string;
  blob: Blob;
  capturedAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
        store.createIndex("capturedAt", "capturedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function putThumbnail(
  url: string,
  blob: Blob,
  capturedAt: number,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ url, blob, capturedAt } satisfies ThumbnailRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getThumbnail(
  url: string,
): Promise<ThumbnailRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(url);
    req.onsuccess = () => resolve(req.result as ThumbnailRecord | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getThumbnailDataUrl(
  url: string,
): Promise<string | undefined> {
  const record = await getThumbnail(url);
  if (!record) return undefined;
  return blobToDataUrl(record.blob);
}

export async function evictOldest(): Promise<void> {
  const db = await openDB();

  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (count <= MAX_ENTRIES) return;

  const toRemove = count - MAX_ENTRIES;

  const keysToDelete = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("capturedAt");
    const keys: string[] = [];
    const cursor = index.openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c && keys.length < toRemove) {
        keys.push(c.value.url as string);
        c.continue();
      } else {
        resolve(keys);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const key of keysToDelete) {
    store.delete(key);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllThumbnailUrls(): Promise<
  Map<string, { dataUrl: string; capturedAt: number }>
> {
  const db = await openDB();
  const map = new Map<string, { dataUrl: string; capturedAt: number }>();

  const records = await new Promise<ThumbnailRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as ThumbnailRecord[]);
    req.onerror = () => reject(req.error);
  });

  for (const record of records) {
    try {
      const dataUrl = await blobToDataUrl(record.blob);
      map.set(record.url, { dataUrl, capturedAt: record.capturedAt });
    } catch {
      // Corrupted blob — skip
    }
  }

  return map;
}

/**
 * Migrate old `chrome.storage.local` screenshots into IndexedDB,
 * then delete the old key.
 */
export async function migrateFromChromeStorage(): Promise<void> {
  const stored = await chrome.storage.local.get(OLD_STORAGE_KEY);
  const record = stored[OLD_STORAGE_KEY] as
    | Record<string, { dataUrl: string; capturedAt: number }>
    | undefined;

  if (!record || Object.keys(record).length === 0) return;

  for (const [url, entry] of Object.entries(record)) {
    if (!entry?.dataUrl) continue;
    try {
      const blob = await dataUrlToBlob(entry.dataUrl);
      await putThumbnail(url, blob, entry.capturedAt);
    } catch {
      // Skip entries that can't be converted
    }
  }

  await chrome.storage.local.remove(OLD_STORAGE_KEY);
}

export async function initThumbnailStore(): Promise<void> {
  await openDB();
  await migrateFromChromeStorage();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}
