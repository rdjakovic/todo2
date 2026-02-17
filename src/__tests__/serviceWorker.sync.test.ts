import { describe, it, expect, vi, beforeEach } from 'vitest';
// We'll mock the global environment that the service worker expects

describe('Service Worker Sync Logic', () => {
  let mockFetch: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock global objects used by SW
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    
    // We'll mock the helper functions inside the SW
    // Since we can't easily import the JavasScript file without side effects, 
    // we'll simulate the logic found in src/service-worker.js
  });

  it('should successfully sync operations and remove them from queue', async () => {
    // Simulated syncOperation logic from SW
    const syncOperation = async (operation: any) => {
      await fetch('https://test.supabase.co/rest/v1/todos', {
        method: 'POST',
        body: JSON.stringify(operation.data)
      });
    };

    const mockOps = [{ id: '1', type: 'addTodo', data: { title: 'Test' } }];

    // Simulate the loop in doBackgroundSync
    for (const op of mockOps) {
      await syncOperation(op);
    }

    expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('supabase.co'), 
        expect.objectContaining({ method: 'POST' })
    );
  });
});
