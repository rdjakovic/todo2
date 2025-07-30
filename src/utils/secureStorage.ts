/**
 * Secure Storage Utility
 * 
 * Provides client-side encryption and secure storage functionality
 * for sensitive security state data using Web Crypto API.
 */

export interface SecureStorageOptions {
  keyDerivationSalt?: string;
  algorithm?: string;
  keyLength?: number;
}

export interface StorageRecord {
  data: string;
  checksum: string;
  timestamp: number;
  version: number;
}

export class SecureStorage {
  private static readonly DEFAULT_ALGORITHM = 'AES-GCM';
  private static readonly DEFAULT_KEY_LENGTH = 256;
  private static readonly DEFAULT_SALT = 'todo2-security-salt';
  private static readonly STORAGE_VERSION = 1;

  private algorithm: string;
  private keyLength: number;
  private salt: string;
  private cryptoKey: CryptoKey | null = null;

  constructor(options: SecureStorageOptions = {}) {
    this.algorithm = options.algorithm || SecureStorage.DEFAULT_ALGORITHM;
    this.keyLength = options.keyLength || SecureStorage.DEFAULT_KEY_LENGTH;
    this.salt = options.keyDerivationSalt || SecureStorage.DEFAULT_SALT;
  }

  /**
   * Initialize the crypto key for encryption/decryption
   */
  private async initializeCryptoKey(): Promise<CryptoKey> {
    if (this.cryptoKey) {
      return this.cryptoKey;
    }

    try {
      // Create a base key from the salt
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.salt),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive the actual encryption key
      this.cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('todo2-security'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.algorithm, length: this.keyLength },
        false,
        ['encrypt', 'decrypt']
      );

      return this.cryptoKey;
    } catch (error) {
      throw new Error(`Failed to initialize crypto key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(data: string): Promise<string> {
    try {
      const key = await this.initializeCryptoKey();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: this.algorithm, iv },
        key,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.initializeCryptoKey();

      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: this.algorithm, iv },
        key,
        encrypted
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate SHA-256 checksum for integrity validation
   */
  async calculateChecksum(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      return btoa(String.fromCharCode(...hashArray));
    } catch (error) {
      throw new Error(`Checksum calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate data integrity using checksum
   */
  async validateIntegrity(data: string, expectedChecksum: string): Promise<boolean> {
    try {
      const actualChecksum = await this.calculateChecksum(data);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      console.error('Integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Store encrypted data with integrity validation
   */
  async store(key: string, value: string): Promise<void> {
    try {
      const encryptedData = await this.encrypt(value);
      const checksum = await this.calculateChecksum(value);

      const record: StorageRecord = {
        data: encryptedData,
        checksum,
        timestamp: Date.now(),
        version: SecureStorage.STORAGE_VERSION
      };

      localStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      throw new Error(`Storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve and decrypt data with integrity validation
   */
  async retrieve(key: string): Promise<string | null> {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) {
        return null;
      }

      const record: StorageRecord = JSON.parse(storedData);
      
      // Validate record structure
      if (!record.data || !record.checksum || !record.timestamp) {
        console.warn('Invalid storage record structure, removing corrupted data');
        localStorage.removeItem(key);
        return null;
      }

      // Decrypt the data
      const decryptedData = await this.decrypt(record.data);

      // Validate integrity
      const isValid = await this.validateIntegrity(decryptedData, record.checksum);
      if (!isValid) {
        console.warn('Data integrity validation failed, removing corrupted data');
        localStorage.removeItem(key);
        return null;
      }

      return decryptedData;
    } catch (error) {
      console.error('Retrieval failed:', error);
      // Remove corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  remove(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Check if a key exists in storage
   */
  exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Clear all storage data (use with caution)
   */
  clear(): void {
    localStorage.clear();
  }

  /**
   * Get storage record metadata without decrypting
   */
  getMetadata(key: string): { timestamp: number; version: number } | null {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) {
        return null;
      }

      const record: StorageRecord = JSON.parse(storedData);
      return {
        timestamp: record.timestamp,
        version: record.version
      };
    } catch (error) {
      console.error('Failed to get metadata:', error);
      return null;
    }
  }

  /**
   * Clean up expired records based on age
   */
  cleanupExpired(maxAge: number): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const metadata = this.getMetadata(key);
      if (!metadata) {
        // If we can't get metadata, the record is corrupted
        keysToRemove.push(key);
      } else if ((now - metadata.timestamp) > maxAge) {
        // Record is expired
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.remove(key));
  }
}

// Export a default instance for convenience
export const secureStorage = new SecureStorage();

// Export types for external use
export type { SecureStorageOptions, StorageRecord };