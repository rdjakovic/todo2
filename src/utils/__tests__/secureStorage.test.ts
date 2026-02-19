/**
 * Unit tests for SecureStorage utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureStorage, secureStorage } from '../secureStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

// Mock crypto.subtle for testing
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    digest: vi.fn()
  },
  getRandomValues: vi.fn()
};

describe('SecureStorage', () => {
  let storage: SecureStorage;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear();
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Reset crypto mock
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true
    });

    storage = new SecureStorage();

    // Setup default crypto mock implementations
    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.deriveKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const defaultStorage = new SecureStorage();
      expect(defaultStorage).toBeInstanceOf(SecureStorage);
    });

    it('should create instance with custom options', () => {
      const customStorage = new SecureStorage({
        algorithm: 'AES-GCM',
        keyLength: 128,
        keyDerivationSalt: 'custom-salt'
      });
      expect(customStorage).toBeInstanceOf(SecureStorage);
    });
  });

  describe('Encryption and Decryption', () => {
    beforeEach(() => {
      // Mock successful encryption
      mockCrypto.subtle.encrypt.mockResolvedValue(
        new ArrayBuffer(16) // Mock encrypted data
      );

      // Mock successful decryption
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('test data').buffer
      );
    });

    it('should encrypt data successfully', async () => {
      const testData = 'sensitive information';
      const encrypted = await storage.encrypt(testData);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should decrypt data successfully', async () => {
      const testData = 'test data';
      
      // First encrypt some data
      const encrypted = await storage.encrypt(testData);
      
      // Then decrypt it
      const decrypted = await storage.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should handle encryption errors gracefully', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      await expect(storage.encrypt('test')).rejects.toThrow('Encryption failed');
    });

    it('should handle decryption errors gracefully', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      await expect(storage.decrypt('invalid-data')).rejects.toThrow('Decryption failed');
    });
  });

  describe('Checksum and Integrity', () => {
    beforeEach(() => {
      // Mock digest for checksum calculation
      mockCrypto.subtle.digest.mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      );
    });

    it('should calculate checksum correctly', async () => {
      const testData = 'test data for checksum';
      const checksum = await storage.calculateChecksum(testData);

      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.anything());
    });

    it('should validate integrity correctly for matching checksums', async () => {
      const testData = 'test data';
      const checksum = await storage.calculateChecksum(testData);
      const isValid = await storage.validateIntegrity(testData, checksum);

      expect(isValid).toBe(true);
    });

    it('should validate integrity correctly for non-matching checksums', async () => {
      const testData = 'test data';
      const wrongChecksum = 'wrong-checksum';
      const isValid = await storage.validateIntegrity(testData, wrongChecksum);

      expect(isValid).toBe(false);
    });

    it('should handle checksum calculation errors gracefully', async () => {
      mockCrypto.subtle.digest.mockRejectedValue(new Error('Digest failed'));

      await expect(storage.calculateChecksum('test')).rejects.toThrow('Checksum calculation failed');
    });
  });

  describe('Storage Operations', () => {
    beforeEach(() => {
      // Setup successful crypto operations
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('test data').buffer
      );
      mockCrypto.subtle.digest.mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      );
    });

    it('should store data successfully', async () => {
      const key = 'test-key';
      const value = 'test value';

      await storage.store(key, value);

      expect(localStorageMock.getItem(key)).toBeTruthy();
      
      const storedRecord = JSON.parse(localStorageMock.getItem(key)!);
      expect(storedRecord).toHaveProperty('data');
      expect(storedRecord).toHaveProperty('checksum');
      expect(storedRecord).toHaveProperty('timestamp');
      expect(storedRecord).toHaveProperty('version');
    });

    it('should retrieve data successfully', async () => {
      const key = 'test-key';
      const value = 'test value';

      // Mock decrypt to return the original value
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(value).buffer
      );

      await storage.store(key, value);
      const retrieved = await storage.retrieve(key);

      expect(retrieved).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await storage.retrieve('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should handle corrupted data gracefully', async () => {
      const key = 'corrupted-key';
      localStorageMock.setItem(key, 'invalid-json');

      const retrieved = await storage.retrieve(key);
      expect(retrieved).toBeNull();
      expect(localStorageMock.getItem(key)).toBeNull(); // Should be removed
    });

    it('should handle integrity validation failure', async () => {
      const key = 'integrity-test';
      
      // Store valid data first
      await storage.store(key, 'original data');
      
      // Manually corrupt the stored record
      const storedRecord = JSON.parse(localStorageMock.getItem(key)!);
      storedRecord.checksum = 'corrupted-checksum';
      localStorageMock.setItem(key, JSON.stringify(storedRecord));

      const retrieved = await storage.retrieve(key);
      expect(retrieved).toBeNull();
      expect(localStorageMock.getItem(key)).toBeNull(); // Should be removed
    });

    it('should remove data successfully', () => {
      const key = 'test-key';
      localStorageMock.setItem(key, 'test-value');

      storage.remove(key);
      expect(localStorageMock.getItem(key)).toBeNull();
    });

    it('should check existence correctly', () => {
      const key = 'existence-test';
      
      expect(storage.exists(key)).toBe(false);
      
      localStorageMock.setItem(key, 'test-value');
      expect(storage.exists(key)).toBe(true);
    });

    it('should clear all data', () => {
      localStorageMock.setItem('key1', 'value1');
      localStorageMock.setItem('key2', 'value2');

      storage.clear();
      expect(localStorageMock.length).toBe(0);
    });
  });

  describe('Metadata Operations', () => {
    it('should get metadata for existing records', async () => {
      const key = 'metadata-test';
      const value = 'test value';

      // Setup crypto mocks
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
      mockCrypto.subtle.digest.mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      );

      await storage.store(key, value);
      const metadata = storage.getMetadata(key);

      expect(metadata).toBeTruthy();
      expect(metadata).toHaveProperty('timestamp');
      expect(metadata).toHaveProperty('version');
      expect(typeof metadata!.timestamp).toBe('number');
      expect(metadata!.version).toBe(1);
    });

    it('should return null for non-existent metadata', () => {
      const metadata = storage.getMetadata('non-existent');
      expect(metadata).toBeNull();
    });

    it('should handle corrupted metadata gracefully', () => {
      const key = 'corrupted-metadata';
      localStorageMock.setItem(key, 'invalid-json');

      const metadata = storage.getMetadata(key);
      expect(metadata).toBeNull();
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(() => {
      // Mock current time
      vi.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    it('should cleanup expired records', async () => {
      const oldKey = 'old-key';
      const newKey = 'new-key';
      const maxAge = 60000; // 1 minute

      // Setup crypto mocks
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
      mockCrypto.subtle.digest.mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      );

      // Create old record (expired)
      const oldRecord = {
        data: 'encrypted-data',
        checksum: 'checksum',
        timestamp: Date.now() - maxAge - 1000, // Older than maxAge
        version: 1
      };
      localStorageMock.setItem(oldKey, JSON.stringify(oldRecord));

      // Create new record (not expired)
      await storage.store(newKey, 'new value');

      // Cleanup expired records
      storage.cleanupExpired(maxAge);

      expect(localStorageMock.getItem(oldKey)).toBeNull();
      expect(localStorageMock.getItem(newKey)).toBeTruthy();
    });

    it('should cleanup corrupted records during cleanup', () => {
      const corruptedKey = 'corrupted-key';
      const validKey = 'valid-key';

      // Add corrupted record
      localStorageMock.setItem(corruptedKey, 'invalid-json');
      
      // Add valid record
      const validRecord = {
        data: 'encrypted-data',
        checksum: 'checksum',
        timestamp: Date.now(),
        version: 1
      };
      localStorageMock.setItem(validKey, JSON.stringify(validRecord));

      // Verify initial state
      expect(localStorageMock.getItem(corruptedKey)).toBe('invalid-json');
      expect(localStorageMock.getItem(validKey)).toBeTruthy();

      storage.cleanupExpired(60000);

      // The corrupted record should be removed during cleanup
      expect(localStorageMock.getItem(corruptedKey)).toBeNull();
      expect(localStorageMock.getItem(validKey)).toBeTruthy();
    });
  });

  describe('Default Instance', () => {
    it('should export a default instance', () => {
      expect(secureStorage).toBeInstanceOf(SecureStorage);
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto key initialization failure', async () => {
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Key import failed'));

      await expect(storage.encrypt('test')).rejects.toThrow('Failed to initialize crypto key');
    });

    it('should handle storage errors gracefully by falling back to memory storage', async () => {
      // Mock localStorage and sessionStorage to throw errors
      const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
      mockCrypto.subtle.digest.mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      );

      // Store should succeed by falling back to memory storage
      await expect(storage.store('test-key', 'test-value')).resolves.not.toThrow();
      
      // Verify data can be retrieved from memory storage
      const retrieved = await storage.retrieve('test-key');
      expect(retrieved).toBe('test-value');

      // Restore original method
      localStorageSpy.mockRestore();
    });
  });
});