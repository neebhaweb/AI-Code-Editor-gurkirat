import { openDB } from "idb";

const DB_NAME = "CodeEditorDB";
const FILES_STORE = "files";
const CHANGES_STORE = "changes";
const CACHE_STORE = "aiCache";

export async function initDB() {
  const db = await openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(FILES_STORE);
      }
      if (oldVersion < 2) {
        db.createObjectStore(CHANGES_STORE);
      }
      if (oldVersion < 3) {
        db.createObjectStore(CACHE_STORE);
      }
    },
  });
  return db;
}

export async function saveFiles(files) {
  try {
    const db = await initDB();
    const tx = db.transaction(FILES_STORE, "readwrite");
    await tx.store.put(files, "currentFiles");
    await tx.done;
  } catch (e) {
    console.error("IndexedDB failed, falling back to localStorage", e);
    localStorage.setItem("files", JSON.stringify(files));
  }
}

export async function loadFiles() {
  try {
    const db = await initDB();
    const files = await db.get(FILES_STORE, "currentFiles");
    return files || null;
  } catch (e) {
    console.error("IndexedDB load failed, trying localStorage", e);
    const fallback = localStorage.getItem("files");
    return fallback ? JSON.parse(fallback) : null;
  }
}

export async function saveChange(change) {
  try {
    const db = await initDB();
    const tx = db.transaction(CHANGES_STORE, "readwrite");
    await tx.store.put(change, Date.now());
    await tx.done;
  } catch (e) {
    console.error("Failed to save offline change", e);
  }
}

export async function loadChanges() {
  try {
    const db = await initDB();
    const changes = await db.getAll(CHANGES_STORE);
    return changes.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error("Failed to load changes", e);
    return [];
  }
}

export async function clearChanges() {
  try {
    const db = await initDB();
    const tx = db.transaction(CHANGES_STORE, "readwrite");
    await tx.store.clear();
    await tx.done;
  } catch (e) {
    console.error("Failed to clear changes", e);
  }
}

export async function saveAICache(key, suggestion) {
  try {
    const db = await initDB();
    const tx = db.transaction(CACHE_STORE, "readwrite");
    await tx.store.put(suggestion, key);
    await tx.done;
  } catch (e) {
    console.error("Failed to cache AI suggestion", e);
  }
}

export async function loadAICache(key) {
  try {
    const db = await initDB();
    return await db.get(CACHE_STORE, key);
  } catch (e) {
    console.error("Failed to load AI cache", e);
    return null;
  }
}
