const CACHE_NAME = 'todo-app-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - serve from cache when offline, but don't cache API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Don't cache Supabase API requests or authentication requests
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('supabase.in') ||
      event.request.url.includes('/auth/') ||
      event.request.url.includes('/rest/') ||
      event.request.url.includes('/realtime/') ||
      event.request.method !== 'GET') {
    // For API requests, always go to network
    event.respondWith(fetch(event.request));
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).catch(() => {
          // If offline and no cache, return a fallback
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the new service worker takes control immediately
  self.clients.claim();
});

// Enhanced background sync for offline data synchronization
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('Background sync triggered');
  
  try {
    // Open IndexedDB to get pending operations
    const db = await openIndexedDB();
    const pendingOperations = await getSyncQueue(db);
    
    console.log(`Found ${pendingOperations.length} pending operations to sync`);
    
    for (const operation of pendingOperations) {
      try {
        await syncOperation(operation);
        await removeFromSyncQueue(db, operation.id);
        console.log(`Successfully synced operation: ${operation.type}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.type}:`, error);
        
        // Increment retry count
        operation.retryCount = (operation.retryCount || 0) + 1;
        if (operation.retryCount < 3) {
          await updateSyncOperation(db, operation);
        } else {
          // Remove after 3 failed attempts
          await removeFromSyncQueue(db, operation.id);
          console.error(`Giving up on operation ${operation.type} after 3 attempts`);
        }
      }
    }
    
    // Notify the main thread about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        syncedCount: pendingOperations.length
      });
    });
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// IndexedDB helper functions for service worker
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TodoAppDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getSyncQueue(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readonly');
    const store = transaction.objectStore('sync_queue');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removeFromSyncQueue(db, operationId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.delete(operationId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function updateSyncOperation(db, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.put(operation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function syncOperation(operation) {
  // Get Supabase URL and key from environment (these should be available in the service worker context)
  const supabaseUrl = 'https://your-project.supabase.co'; // This would need to be injected
  const supabaseKey = 'your-anon-key'; // This would need to be injected
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };

  switch (operation.type) {
    case 'addTodo':
      await fetch(`${supabaseUrl}/rest/v1/todos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: operation.data.todo.id,
          list_id: operation.data.todo.listId,
          title: operation.data.todo.title,
          notes: operation.data.todo.notes,
          completed: operation.data.todo.completed,
          priority: operation.data.todo.priority,
          date_created: operation.data.todo.dateCreated,
          due_date: operation.data.todo.dueDate,
          date_of_completion: operation.data.todo.dateOfCompletion,
        })
      });
      break;

    case 'toggleTodo':
      await fetch(`${supabaseUrl}/rest/v1/todos?id=eq.${operation.data.todoId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          completed: operation.data.completed,
          date_of_completion: operation.data.dateOfCompletion,
        })
      });
      break;

    case 'deleteTodo':
      await fetch(`${supabaseUrl}/rest/v1/todos?id=eq.${operation.data.todoId}`, {
        method: 'DELETE',
        headers
      });
      break;

    case 'editTodo':
      const payload = {
        title: operation.data.updates.title,
        notes: operation.data.updates.notes,
        completed: operation.data.updates.completed,
        priority: operation.data.updates.priority,
      };

      if (operation.data.updates.dueDate !== undefined) {
        payload.due_date = operation.data.updates.dueDate;
      }
      if (operation.data.updates.dateOfCompletion !== undefined) {
        payload.date_of_completion = operation.data.updates.dateOfCompletion;
      }
      if (operation.data.updates.dateCreated !== undefined) {
        payload.date_created = operation.data.updates.dateCreated;
      }

      await fetch(`${supabaseUrl}/rest/v1/todos?id=eq.${operation.data.todoId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      break;

    case 'createList':
      await fetch(`${supabaseUrl}/rest/v1/lists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: operation.data.list.id,
          name: operation.data.list.name,
          icon: operation.data.list.icon,
          show_completed: operation.data.list.showCompleted,
          user_id: operation.data.list.userId,
        })
      });
      break;

    case 'deleteList':
      // First delete todos
      await fetch(`${supabaseUrl}/rest/v1/todos?list_id=eq.${operation.data.listId}`, {
        method: 'DELETE',
        headers
      });
      // Then delete list
      await fetch(`${supabaseUrl}/rest/v1/lists?id=eq.${operation.data.listId}`, {
        method: 'DELETE',
        headers
      });
      break;

    case 'editList':
      const listPayload = {
        name: operation.data.name,
      };
      if (operation.data.icon) {
        listPayload.icon = operation.data.icon;
      }

      await fetch(`${supabaseUrl}/rest/v1/lists?id=eq.${operation.data.listId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(listPayload)
      });
      break;

    // Handle bulk operations
    case 'saveTodos':
      await fetch(`${supabaseUrl}/rest/v1/todos`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(operation.data.todos.map(todo => ({
          id: todo.id,
          list_id: todo.listId,
          title: todo.title,
          notes: todo.notes,
          completed: todo.completed,
          priority: todo.priority,
          date_created: todo.dateCreated,
          due_date: todo.dueDate,
          date_of_completion: todo.dateOfCompletion,
        })))
      });
      break;

    case 'saveLists':
      await fetch(`${supabaseUrl}/rest/v1/lists`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(operation.data.lists.map(list => ({
          id: list.id,
          name: list.name,
          icon: list.icon,
          show_completed: list.showCompleted,
          user_id: list.userId,
        })))
      });
      break;

    default:
      console.warn(`Unknown operation type: ${operation.type}`);
  }
}

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    tag: 'todo-notification'
  };

  event.waitUntil(
    self.registration.showNotification('Todo App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});