import { StoredRecording, StoredRecordingMeta } from "../types";

const DB_NAME = "SmartClassLoomDB";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
            return reject(new Error("IndexedDB no soportado en este entorno"));
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                store.createIndex("createdAt", "createdAt", { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveRecordingToDB(recording: StoredRecording): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(recording);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function getAllRecordingsMeta(): Promise<StoredRecordingMeta[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
            const records: StoredRecording[] = req.result || [];
            // Map out blobs to avoid keeping huge blobs in metadata memory
            const metas: StoredRecordingMeta[] = records.map(({ blob: _, ...meta }) => meta);
            // Sort newest first
            metas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(metas);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function getRecordingBlob(id: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
            const record = req.result as StoredRecording | undefined;
            resolve(record ? record.blob : null);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function deleteRecordingFromDB(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function updateRecordingTitle(id: string, newTitle: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
            const record = getReq.result as StoredRecording | undefined;
            if (!record) return reject(new Error("Grabación no encontrada"));
            record.title = newTitle;
            const putReq = store.put(record);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

export async function getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number } | null> {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            const usageMB = Math.round((estimate.usage || 0) / (1024 * 1024));
            const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
            return { usageMB, quotaMB };
        } catch {
            return null;
        }
    }
    return null;
}
