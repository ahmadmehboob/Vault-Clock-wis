import { MediaItem, NoteItem, IntruderLog, SecurityConfig } from '../types/vault';

const DB_NAME = 'CalcVault_SecureDB_v2';
const DB_VERSION = 1;

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  masterPin: '1234',
  decoyPin: '9999',
  triggerKey: '=',
  autoLockDelaySeconds: 60,
  lockOnWindowBlur: true,
  maxFailedAttemptsBeforeWipe: 0,
  intruderDetectionEnabled: true,
  intruderCameraEnabled: false,
  failedAttemptsCount: 0,
  camouflageStyle: 'apple_dark',
  hasCompletedFirstTimeSetup: false,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('master_media')) {
        db.createObjectStore('master_media', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('decoy_media')) {
        db.createObjectStore('decoy_media', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('master_notes')) {
        db.createObjectStore('master_notes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('decoy_notes')) {
        db.createObjectStore('decoy_notes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('intruder_logs')) {
        db.createObjectStore('intruder_logs', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getMediaItems(isDecoy: boolean = false): Promise<MediaItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const storeName = isDecoy ? 'decoy_media' : 'master_media';
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('DB getMediaItems error, returning fallback:', e);
    return [];
  }
}

export async function saveMediaItem(item: MediaItem, isDecoy: boolean = false): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeName = isDecoy ? 'decoy_media' : 'master_media';
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMediaItem(id: string, isDecoy: boolean = false): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeName = isDecoy ? 'decoy_media' : 'master_media';
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getNotes(isDecoy: boolean = false): Promise<NoteItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const storeName = isDecoy ? 'decoy_notes' : 'master_notes';
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('DB getNotes error:', e);
    return [];
  }
}

export async function saveNote(note: NoteItem, isDecoy: boolean = false): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeName = isDecoy ? 'decoy_notes' : 'master_notes';
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(note);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNote(id: string, isDecoy: boolean = false): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeName = isDecoy ? 'decoy_notes' : 'master_notes';
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getIntruderLogs(): Promise<IntruderLog[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('intruder_logs', 'readonly');
      const store = tx.objectStore('intruder_logs');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function addIntruderLog(log: IntruderLog): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('intruder_logs', 'readwrite');
      const store = tx.objectStore('intruder_logs');
      const req = store.put(log);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save intruder log', err);
  }
}

export async function clearIntruderLogs(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('intruder_logs', 'readwrite');
    const store = tx.objectStore('intruder_logs');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function loadSecurityConfig(): SecurityConfig {
  try {
    const raw = localStorage.getItem('calc_vault_security_config');
    if (raw) {
      return { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Could not read security config from localStorage', err);
  }
  return DEFAULT_SECURITY_CONFIG;
}

export function saveSecurityConfig(config: SecurityConfig): void {
  try {
    localStorage.setItem('calc_vault_security_config', JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save security config', err);
  }
}

export async function wipeAllVaultData(): Promise<void> {
  try {
    const db = await openDatabase();
    const stores = ['master_media', 'decoy_media', 'master_notes', 'decoy_notes', 'intruder_logs'];
    const tx = db.transaction(stores, 'readwrite');
    stores.forEach((storeName) => tx.objectStore(storeName).clear());
    localStorage.removeItem('calc_vault_security_config');
  } catch (err) {
    console.error('Failed to wipe data', err);
  }
}
