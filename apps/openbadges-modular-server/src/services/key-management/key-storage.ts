/**
 * Key Storage Service
 *
 * This service handles loading, saving, and managing cryptographic key pairs
 * for digital signatures in the Open Badges API. It supports:
 * - Environment variable key loading (KEY_PRIVATE, KEY_PUBLIC)
 * - File-based key storage
 * - Active key retrieval
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/utils/logging/logger.service';
import { KeyType, detectKeyType, Cryptosuite } from '@/utils/crypto/signature';

/**
 * Key pair structure with metadata
 */
export interface StoredKeyPair {
  publicKey: string;
  privateKey: string;
  keyType: KeyType;
  cryptosuite?: Cryptosuite;
  keyId: string;
  isActive: boolean;
  createdAt: string;
  source: 'environment' | 'file';
}

/**
 * Options for loading keys from environment
 */
export interface EnvKeyOptions {
  privateKeyEnvVar?: string;
  publicKeyEnvVar?: string;
  keyId?: string;
}

/**
 * Options for file-based key storage
 */
export interface FileKeyOptions {
  keysDir?: string;
  keyId: string;
}

/**
 * Result of key loading operations
 */
export interface KeyLoadResult {
  success: boolean;
  keyPair?: StoredKeyPair;
  error?: string;
}

/**
 * Key Storage Service class
 */
export class KeyStorageService {
  private static instance: KeyStorageService | null = null;
  private activeKey: StoredKeyPair | null = null;
  private keysDir: string;

  /**
   * Creates a new KeyStorageService instance
   * @param keysDir Directory for file-based key storage
   */
  constructor(keysDir?: string) {
    this.keysDir = keysDir || process.env['KEYS_DIR'] || path.join(process.cwd(), 'keys');
  }

  /**
   * Gets or creates a singleton instance of KeyStorageService
   * @param keysDir Optional directory for file-based key storage
   * @returns The singleton instance
   */
  static getInstance(keysDir?: string): KeyStorageService {
    if (!KeyStorageService.instance) {
      KeyStorageService.instance = new KeyStorageService(keysDir);
    }
    return KeyStorageService.instance;
  }

  /**
   * Resets the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    KeyStorageService.instance = null;
  }

  /**
   * Helper function to check if a file exists
   * @param filePath The path to the file
   * @returns True if the file exists, false otherwise
   */
  private async fileExists(filePath: string): Promise<boolean> {
    return fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Ensures the keys directory exists
   */
  private async ensureKeysDir(): Promise<void> {
    const dirExists = await this.fileExists(this.keysDir);
    if (!dirExists) {
      await fs.promises.mkdir(this.keysDir, { recursive: true });
      logger.info(`Created keys directory: ${this.keysDir}`);
    }
  }

  /**
   * Determines the cryptosuite based on key type
   * @param keyType The type of the key
   * @returns The appropriate cryptosuite
   */
  private getCryptosuiteForKeyType(keyType: KeyType): Cryptosuite {
    switch (keyType) {
      case KeyType.RSA:
        return Cryptosuite.RsaSha256;
      case KeyType.Ed25519:
        return Cryptosuite.Ed25519;
      default:
        return Cryptosuite.RsaSha256;
    }
  }

  /**
   * Loads a key pair from environment variables
   *
   * @param options Options for loading keys from environment
   * @returns The result of the key loading operation
   */
  async loadKeyPair(options: EnvKeyOptions = {}): Promise<KeyLoadResult> {
    const {
      privateKeyEnvVar = 'KEY_PRIVATE',
      publicKeyEnvVar = 'KEY_PUBLIC',
      keyId = 'env-key',
    } = options;

    try {
      const privateKey = process.env[privateKeyEnvVar];
      const publicKey = process.env[publicKeyEnvVar];

      if (!privateKey || !publicKey) {
        const missingVars: string[] = [];
        if (!privateKey) missingVars.push(privateKeyEnvVar);
        if (!publicKey) missingVars.push(publicKeyEnvVar);

        return {
          success: false,
          error: `Missing environment variables: ${missingVars.join(', ')}`,
        };
      }

      // Decode keys if they are base64 encoded (common for env vars)
      const decodedPrivateKey = this.decodeKeyIfNeeded(privateKey);
      const decodedPublicKey = this.decodeKeyIfNeeded(publicKey);

      // Detect key type from the public key
      const keyType = detectKeyType(decodedPublicKey);
      const cryptosuite = this.getCryptosuiteForKeyType(keyType);

      const keyPair: StoredKeyPair = {
        publicKey: decodedPublicKey,
        privateKey: decodedPrivateKey,
        keyType,
        cryptosuite,
        keyId,
        isActive: true,
        createdAt: new Date().toISOString(),
        source: 'environment',
      };

      // Set as active key
      this.activeKey = keyPair;

      logger.info('Loaded key pair from environment variables', {
        keyId,
        keyType,
        cryptosuite,
      });

      return {
        success: true,
        keyPair,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to load key pair from environment', { error: errorMessage });
      return {
        success: false,
        error: `Failed to load key pair: ${errorMessage}`,
      };
    }
  }

  /**
   * Decodes a key if it appears to be base64 encoded
   * @param key The key string to potentially decode
   * @returns The decoded key or the original key
   */
  private decodeKeyIfNeeded(key: string): string {
    // If the key already looks like a PEM key, return it as-is
    if (key.includes('-----BEGIN')) {
      return key;
    }

    try {
      // Try to decode as base64
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      // If the decoded value looks like a PEM key, use it
      if (decoded.includes('-----BEGIN')) {
        return decoded;
      }
    } catch {
      // If decoding fails, use the original key
    }

    return key;
  }

  /**
   * Saves a key pair to the file system
   *
   * @param keyPair The key pair to save
   * @param options Options for saving the key
   * @returns True if the save was successful, false otherwise
   */
  async saveKeyPair(
    keyPair: Omit<StoredKeyPair, 'createdAt' | 'source'>,
    options: FileKeyOptions
  ): Promise<boolean> {
    const { keysDir = this.keysDir, keyId } = options;

    try {
      // Ensure the keys directory exists
      const targetDir = keysDir || this.keysDir;
      const dirExists = await this.fileExists(targetDir);
      if (!dirExists) {
        await fs.promises.mkdir(targetDir, { recursive: true });
      }

      const publicKeyPath = path.join(targetDir, `${keyId}.pub`);
      const privateKeyPath = path.join(targetDir, `${keyId}.key`);
      const metadataPath = path.join(targetDir, `${keyId}.meta.json`);

      // Save public key
      await fs.promises.writeFile(publicKeyPath, keyPair.publicKey, {
        mode: 0o644, // Read by all, write by owner
      });

      // Save private key with restricted permissions
      await fs.promises.writeFile(privateKeyPath, keyPair.privateKey, {
        mode: 0o600, // Read/write by owner only
      });

      // Save metadata
      const metadata = {
        keyType: keyPair.keyType,
        cryptosuite: keyPair.cryptosuite,
        keyId: keyPair.keyId,
        isActive: keyPair.isActive,
        createdAt: new Date().toISOString(),
        source: 'file' as const,
      };

      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), {
        mode: 0o644,
      });

      logger.info(`Saved key pair to file: ${keyId}`, {
        keyId,
        keyType: keyPair.keyType,
        publicKeyPath,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to save key pair: ${keyId}`, { error: errorMessage });
      return false;
    }
  }

  /**
   * Loads a key pair from a file
   *
   * @param options Options for loading the key from file
   * @returns The result of the key loading operation
   */
  async loadKeyPairFromFile(options: FileKeyOptions): Promise<KeyLoadResult> {
    const { keysDir = this.keysDir, keyId } = options;

    try {
      const targetDir = keysDir || this.keysDir;
      const publicKeyPath = path.join(targetDir, `${keyId}.pub`);
      const privateKeyPath = path.join(targetDir, `${keyId}.key`);
      const metadataPath = path.join(targetDir, `${keyId}.meta.json`);

      // Check if key files exist
      const publicKeyExists = await this.fileExists(publicKeyPath);
      const privateKeyExists = await this.fileExists(privateKeyPath);

      if (!publicKeyExists || !privateKeyExists) {
        return {
          success: false,
          error: `Key files not found for keyId: ${keyId}`,
        };
      }

      // Read key files
      const publicKey = await fs.promises.readFile(publicKeyPath, 'utf8');
      const privateKey = await fs.promises.readFile(privateKeyPath, 'utf8');

      // Try to load metadata
      let keyType: KeyType;
      let cryptosuite: Cryptosuite;
      let isActive = true;
      let createdAt = new Date().toISOString();

      const metadataExists = await this.fileExists(metadataPath);
      if (metadataExists) {
        try {
          const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          keyType = metadata.keyType;
          cryptosuite = metadata.cryptosuite;
          isActive = metadata.isActive ?? true;
          createdAt = metadata.createdAt ?? createdAt;
        } catch {
          // If metadata parsing fails, detect from key
          keyType = detectKeyType(publicKey);
          cryptosuite = this.getCryptosuiteForKeyType(keyType);
        }
      } else {
        // Detect key type from the public key
        keyType = detectKeyType(publicKey);
        cryptosuite = this.getCryptosuiteForKeyType(keyType);
      }

      const keyPair: StoredKeyPair = {
        publicKey,
        privateKey,
        keyType,
        cryptosuite,
        keyId,
        isActive,
        createdAt,
        source: 'file',
      };

      logger.info(`Loaded key pair from file: ${keyId}`, {
        keyId,
        keyType,
        cryptosuite,
      });

      return {
        success: true,
        keyPair,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to load key pair from file: ${keyId}`, { error: errorMessage });
      return {
        success: false,
        error: `Failed to load key pair: ${errorMessage}`,
      };
    }
  }

  /**
   * Gets the currently active key pair
   *
   * Priority:
   * 1. Key loaded from environment variables
   * 2. Key loaded from file (default key)
   *
   * @returns The active key pair or null if none is available
   */
  async getActiveKey(): Promise<StoredKeyPair | null> {
    // Return cached active key if available
    if (this.activeKey) {
      return this.activeKey;
    }

    // Try to load from environment first
    const envResult = await this.loadKeyPair();
    if (envResult.success && envResult.keyPair) {
      this.activeKey = envResult.keyPair;
      return this.activeKey;
    }

    // Fall back to loading default key from file
    const fileResult = await this.loadKeyPairFromFile({ keyId: 'default' });
    if (fileResult.success && fileResult.keyPair) {
      this.activeKey = fileResult.keyPair;
      return this.activeKey;
    }

    logger.warn('No active key found');
    return null;
  }

  /**
   * Sets the active key pair
   * @param keyPair The key pair to set as active
   */
  setActiveKey(keyPair: StoredKeyPair): void {
    this.activeKey = { ...keyPair, isActive: true };
    logger.info('Active key updated', {
      keyId: keyPair.keyId,
      keyType: keyPair.keyType,
    });
  }

  /**
   * Clears the active key from memory
   */
  clearActiveKey(): void {
    this.activeKey = null;
    logger.info('Active key cleared from memory');
  }

  /**
   * Checks if environment variables contain key pair
   * @param options Options for checking environment variables
   * @returns True if both KEY_PRIVATE and KEY_PUBLIC are set
   */
  hasEnvironmentKeys(options: EnvKeyOptions = {}): boolean {
    const {
      privateKeyEnvVar = 'KEY_PRIVATE',
      publicKeyEnvVar = 'KEY_PUBLIC',
    } = options;

    return !!(process.env[privateKeyEnvVar] && process.env[publicKeyEnvVar]);
  }

  /**
   * Lists all key IDs in the keys directory
   * @returns Array of key IDs found in the directory
   */
  async listKeyIds(): Promise<string[]> {
    try {
      await this.ensureKeysDir();

      const files = await fs.promises.readdir(this.keysDir);
      const keyIds = new Set<string>();

      for (const file of files) {
        if (file.endsWith('.pub')) {
          const keyId = file.replace('.pub', '');
          // Only include if both .pub and .key exist
          const privateKeyPath = path.join(this.keysDir, `${keyId}.key`);
          if (await this.fileExists(privateKeyPath)) {
            keyIds.add(keyId);
          }
        }
      }

      return Array.from(keyIds);
    } catch (error) {
      logger.error('Failed to list key IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Deletes a key pair from file storage
   * @param keyId The ID of the key pair to delete
   * @returns True if deletion was successful
   */
  async deleteKeyPair(keyId: string): Promise<boolean> {
    try {
      const publicKeyPath = path.join(this.keysDir, `${keyId}.pub`);
      const privateKeyPath = path.join(this.keysDir, `${keyId}.key`);
      const metadataPath = path.join(this.keysDir, `${keyId}.meta.json`);

      const filesToDelete = [publicKeyPath, privateKeyPath, metadataPath];

      for (const filePath of filesToDelete) {
        if (await this.fileExists(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }

      // Clear active key if it was the deleted key
      if (this.activeKey?.keyId === keyId) {
        this.clearActiveKey();
      }

      logger.info(`Deleted key pair: ${keyId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete key pair: ${keyId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Gets the keys directory path
   * @returns The path to the keys directory
   */
  getKeysDir(): string {
    return this.keysDir;
  }
}

// Export singleton getter for convenience
export const getKeyStorageService = KeyStorageService.getInstance;
