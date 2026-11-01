import type { Conversation } from './types';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chati-conversations', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('conversations', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadConversations(): Promise<Conversation[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const request = tx.objectStore('conversations').getAll();
      request.onsuccess = () => resolve((request.result as Conversation[])
        .filter(c => typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages))
        .sort((a, b) => b.updated - a.updated).slice(0, 50));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations'); store.clear();
      conversations.slice(0, 50).forEach(c => store.put(c));
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
