import fs from 'fs';
import path from 'path';
import { Transport } from './transport.interface';
import { safeStringify } from '../utils';

export interface FileTransportOptions {
  /**
   * Path to the log file
   */
  filePath: string;

  /**
   * Whether to append to the log file
   */
  append?: boolean;
}

/**
 * File transport for the logger
 */
export class FileTransport implements Transport {
  public name = 'file';
  private filePath: string;
  private initialized = false;
  private fileStream: fs.WriteStream | null = null;
  private logQueue: string[] = [];
  private isProcessingQueue = false;

  constructor(options: FileTransportOptions) {
    this.filePath = options.filePath;
  }

  /**
   * Initialize the file transport (called lazily)
   */
  public initialize(): void {
    try {
      this.ensureLogDirectoryExists();
      this.initializeFileStream();
      this.initialized = true;
    } catch (error: any) {
      console.error(`Failed to initialize file transport: ${error.message}`);
    }
  }

  /**
   * Log a message to the file
   */
  public log(level: string, message: string, timestamp: string, context: Record<string, any>): void {
    // Initialize lazily on first log attempt
    if (!this.initialized) {
      this.initialize();
      // If initialization failed, fileStream will be null, and we can't log
      if (!this.initialized) {
        console.warn('FileTransport: Cannot log, initialization failed.');
        return;
      }
    }

    // Create a plain text version for the file - always use ISO format for machine readability
    let fileEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (Object.keys(context).length) {
      fileEntry += ` | ${safeStringify(context)}`;
    }
    
    // Add to queue and process asynchronously
    this.logQueue.push(fileEntry);
    this.processLogQueue();
  }

  /**
   * Clean up resources used by the transport
   */
  public cleanup(): void {
    if (this.fileStream) {
      // Process any remaining logs in the queue
      if (this.logQueue.length > 0) {
        for (const entry of this.logQueue) {
          this.fileStream.write(entry + '\n');
        }
        this.logQueue = [];
      }
      
      // Close the file stream
      this.fileStream.end();
      this.fileStream = null;
    }
  }

  /**
   * Ensure the log directory exists
   */
  private ensureLogDirectoryExists(): void {
    const logDir = path.dirname(this.filePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Initialize the file write stream
   */
  private initializeFileStream(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }

    try {
      this.fileStream = fs.createWriteStream(this.filePath, { flags: 'a' });
      
      // Handle stream errors
      this.fileStream.on('error', (error) => {
        console.error(`Error writing to log file: ${error.message}`);
        this.fileStream = null;
      });

      // Process any queued logs once the stream is ready
      this.fileStream.on('ready', () => {
        this.processLogQueue();
      });
    } catch (error: any) {
      console.error(`Failed to create write stream for '${this.filePath}': ${error.message}`);
    }
  }

  /**
   * Process the log queue asynchronously
   */
  private async processLogQueue(): Promise<void> {
    if (this.isProcessingQueue || this.logQueue.length === 0 || !this.fileStream) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.logQueue.length > 0) {
        const entry = this.logQueue.shift();
        if (entry && this.fileStream) {
          // Use a promise to handle backpressure
          const canContinue = this.fileStream.write(entry + '\n');
          if (!canContinue) {
            // Wait for drain event before continuing
            await new Promise<void>((resolve) => {
              if (this.fileStream) {
                this.fileStream.once('drain', resolve);
              } else {
                resolve();
              }
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`Error processing log queue: ${error.message}`);
    } finally {
      this.isProcessingQueue = false;
      
      // Check if more entries were added while processing
      if (this.logQueue.length > 0) {
        this.processLogQueue();
      }
    }
  }
}
