// IndexedDB utility for offline data storage and sync queue management
export interface SyncOperation {
  id: string;
  type: 'addTodo' | 'toggleTodo' | 'deleteTodo' | 'editTodo' | 'createList' | 'deleteList' | 'editList' | 'saveTodos' | 'saveLists';
  data: any;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'TodoAppDB';
const DB_VERSION = 1;
const LISTS_STORE = 'lists';
const TODOS_STORE = 'todos';
const SYNC_QUEUE_STORE = 'sync_queue';

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create lists store
        if (!db.objectStoreNames.contains(LISTS_STORE)) {
          const listsStore = db.createObjectStore(LISTS_STORE, { keyPath: 'id' });
          listsStore.createIndex('userId', 'userId', { unique: false });
        }

        // Create todos store
        if (!db.objectStoreNames.contains(TODOS_STORE)) {
          const todosStore = db.createObjectStore(TODOS_STORE, { keyPath: 'id' });
          todosStore.createIndex('listId', 'listId', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Lists operations
  async saveLists(lists: any[]): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([LISTS_STORE], 'readwrite');
    const store = transaction.objectStore(LISTS_STORE);

    // Clear existing lists first
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new lists
    for (const list of lists) {
      await new Promise<void>((resolve, reject) => {
        const request = store.add({
          ...list,
          // Convert Date objects to ISO strings for storage
          created_at: list.created_at instanceof Date ? list.created_at.toISOString() : list.created_at,
          updated_at: list.updated_at instanceof Date ? list.updated_at.toISOString() : list.updated_at,
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getLists(): Promise<any[]> {
    const db = await this.openDB();
    const transaction = db.transaction([LISTS_STORE], 'readonly');
    const store = transaction.objectStore(LISTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const lists = request.result.map(list => ({
          ...list,
          // Convert ISO strings back to Date objects
          created_at: list.created_at ? new Date(list.created_at) : undefined,
          updated_at: list.updated_at ? new Date(list.updated_at) : undefined,
        }));
        resolve(lists);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Todos operations
  async saveTodos(todos: any[]): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([TODOS_STORE], 'readwrite');
    const store = transaction.objectStore(TODOS_STORE);

    // Clear existing todos first
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new todos
    for (const todo of todos) {
      await new Promise<void>((resolve, reject) => {
        const request = store.add({
          ...todo,
          // Convert Date objects to ISO strings for storage
          dateCreated: todo.dateCreated instanceof Date ? todo.dateCreated.toISOString() : todo.dateCreated,
          dueDate: todo.dueDate instanceof Date ? todo.dueDate.toISOString() : todo.dueDate,
          dateOfCompletion: todo.dateOfCompletion instanceof Date ? todo.dateOfCompletion.toISOString() : todo.dateOfCompletion,
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getTodos(): Promise<any[]> {
    const db = await this.openDB();
    const transaction = db.transaction([TODOS_STORE], 'readonly');
    const store = transaction.objectStore(TODOS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const todos = request.result.map(todo => ({
          ...todo,
          // Convert ISO strings back to Date objects
          dateCreated: todo.dateCreated ? new Date(todo.dateCreated) : new Date(),
          dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
          dateOfCompletion: todo.dateOfCompletion ? new Date(todo.dateOfCompletion) : undefined,
        }));
        resolve(todos);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync queue operations
  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    const syncOperation: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(syncOperation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    const db = await this.openDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(operationId: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(operationId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncOperation(operation: SyncOperation): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([LISTS_STORE, TODOS_STORE, SYNC_QUEUE_STORE], 'readwrite');
    
    const promises = [
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(LISTS_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(TODOS_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(SYNC_QUEUE_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ];

    await Promise.all(promises);
  }

  // Check if we have any data offline
  async hasOfflineData(): Promise<{ hasLists: boolean; hasTodos: boolean }> {
    try {
      const [lists, todos] = await Promise.all([
        this.getLists(),
        this.getTodos(),
      ]);
      
      return {
        hasLists: lists.length > 0,
        hasTodos: todos.length > 0,
      };
    } catch (error) {
      console.error('Error checking offline data:', error);
      return { hasLists: false, hasTodos: false };
    }
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

// Helper function to register background sync
export const registerBackgroundSync = async (): Promise<void> => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }
};

// Helper function to check if we're online
export const isOnline = (): boolean => {
  return navigator.onLine;
};