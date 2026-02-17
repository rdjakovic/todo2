import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTodoStore } from '../store/todoStore';
import { indexedDBManager, isOnline, registerBackgroundSync } from '../lib/indexedDB';
import { supabase } from '../lib/supabase';

// Mock dependencies
vi.mock('../lib/indexedDB', () => ({
  indexedDBManager: {
    saveTodos: vi.fn().mockResolvedValue(undefined),
    saveLists: vi.fn().mockResolvedValue(undefined),
    addToSyncQueue: vi.fn().mockResolvedValue(undefined),
    getSyncQueue: vi.fn().mockResolvedValue([]),
    removeFromSyncQueue: vi.fn().mockResolvedValue(undefined),
  },
  isOnline: vi.fn().mockReturnValue(true),
  registerBackgroundSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  } as any,
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'test-user-id' } }),
  },
}));

describe('TodoStore Sync Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTodoStore.setState({
      lists: [{ id: 'list-1', name: 'Test List', icon: 'home', showCompleted: true, userId: 'test-user-id' }],
      todos: [],
      selectedListId: 'list-1',
    });
  });

  it('should call supabase when online during addTodo', async () => {
    vi.mocked(isOnline).mockReturnValue(true);
    
    const newTodo = {
      title: 'Online Todo',
      notes: '',
      completed: false,
      dateCreated: new Date(),
      priority: 'medium' as const,
      listId: 'list-1',
    };

    await useTodoStore.getState().addTodo('list-1', newTodo);

    expect(supabase.from).toHaveBeenCalledWith('todos');
    expect(supabase.insert).toHaveBeenCalled();
    expect(indexedDBManager.addToSyncQueue).not.toHaveBeenCalled();
  });

  it('should queue to IndexedDB when offline during addTodo', async () => {
    vi.mocked(isOnline).mockReturnValue(false);
    
    const newTodo = {
      title: 'Offline Todo',
      notes: '',
      completed: false,
      dateCreated: new Date(),
      priority: 'medium' as const,
      listId: 'list-1',
    };

    await useTodoStore.getState().addTodo('list-1', newTodo);

    expect(supabase.insert).not.toHaveBeenCalled();
    expect(indexedDBManager.addToSyncQueue).toHaveBeenCalledWith(expect.objectContaining({
      type: 'addTodo',
      data: expect.objectContaining({
        todo: expect.objectContaining({
          title: 'Offline Todo'
        })
      })
    }));
    expect(registerBackgroundSync).toHaveBeenCalled();
  });

  it('should sync pending operations when syncPendingOperations is called online', async () => {
    vi.mocked(isOnline).mockReturnValue(true);
    const mockPendingOps = [
      { id: 'op-1', type: 'addTodo', data: { todo: { id: 't1', title: 'Pending', listId: 'l1', notes: '', completed: false, priority: 'medium', dateCreated: new Date() } }, retryCount: 0 }
    ];
    vi.mocked(indexedDBManager.getSyncQueue).mockResolvedValue(mockPendingOps as any);

    await useTodoStore.getState().syncPendingOperations();

    expect(supabase.from).toHaveBeenCalledWith('todos');
    expect(supabase.insert).toHaveBeenCalled();
    expect(indexedDBManager.removeFromSyncQueue).toHaveBeenCalledWith('op-1');
  });

  it('should not sync when offline', async () => {
    vi.mocked(isOnline).mockReturnValue(false);
    
    await useTodoStore.getState().syncPendingOperations();

    expect(indexedDBManager.getSyncQueue).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
