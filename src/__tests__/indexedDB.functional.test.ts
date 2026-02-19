import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDBManager } from '../lib/indexedDB';

describe('IndexedDB Manager Functional', () => {
  beforeEach(async () => {
    await indexedDBManager.clearAllData();
  });

  it('should save and retrieve lists', async () => {
    const testLists = [
      { id: 'l1', name: 'List 1', icon: 'home', showCompleted: true, userId: 'u1' }
    ];

    await indexedDBManager.saveLists(testLists);
    const savedLists = await indexedDBManager.getLists();

    expect(savedLists).toHaveLength(1);
    expect(savedLists[0].name).toBe('List 1');
  });

  it('should save and retrieve todos', async () => {
    const testTodos = [
      { id: 't1', title: 'Todo 1', listId: 'l1', notes: '', completed: false, priority: 'medium', dateCreated: new Date() }
    ];

    await indexedDBManager.saveTodos(testTodos);
    const savedTodos = await indexedDBManager.getTodos();

    expect(savedTodos).toHaveLength(1);
    expect(savedTodos[0].title).toBe('Todo 1');
  });

  it('should manage the sync queue', async () => {
    const operation = {
      type: 'addTodo' as const,
      data: { todo: { id: 't1', title: 'Sync Me' } }
    };

    await indexedDBManager.addToSyncQueue(operation);
    let queue = await indexedDBManager.getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('addTodo');

    await indexedDBManager.removeFromSyncQueue(queue[0].id);
    queue = await indexedDBManager.getSyncQueue();
    expect(queue).toHaveLength(0);
  });
});
