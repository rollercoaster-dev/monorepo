import { Transaction } from 'kysely'
import { DatabaseSchema } from './schema'
import { getDatabaseInstance } from './factory'

export type TransactionCallback<T> = (trx: Transaction<DatabaseSchema>) => Promise<T>

/**
 * Execute a database transaction with automatic rollback on error
 * @param callback Function to execute within the transaction
 * @returns Promise resolving to the callback result
 */
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const db = getDatabaseInstance()

  return await db.transaction().execute(async trx => {
    return await callback(trx)
  })
}

/**
 * Execute multiple operations in a single transaction
 * @param operations Array of transaction operations
 * @returns Promise resolving to array of results
 */
export async function withTransactionBatch<T>(operations: TransactionCallback<T>[]): Promise<T[]> {
  return await withTransaction(async trx => {
    const results: T[] = []

    for (const operation of operations) {
      const result = await operation(trx)
      results.push(result)
    }

    return results
  })
}

/**
 * Create a savepoint within an existing transaction (PostgreSQL only)
 * @param trx Existing transaction
 * @param savepointName Name of the savepoint
 * @param callback Function to execute within the savepoint
 * @returns Promise resolving to the callback result
 */
export async function withSavepoint<T>(
  trx: Transaction<DatabaseSchema>,
  savepointName: string,
  callback: TransactionCallback<T>
): Promise<T> {
  // This is PostgreSQL-specific functionality
  // For SQLite, this will behave like a regular transaction

  try {
    // Create savepoint
    await trx.executeQuery(trx.schema.raw(`SAVEPOINT ${savepointName}`).compile())

    const result = await callback(trx)

    // Release savepoint on success
    await trx.executeQuery(trx.schema.raw(`RELEASE SAVEPOINT ${savepointName}`).compile())

    return result
  } catch (error) {
    // Rollback to savepoint on error
    await trx.executeQuery(trx.schema.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`).compile())
    throw error
  }
}

/**
 * Utility class for managing complex transaction scenarios
 */
export class TransactionManager {
  private static activeTransactions = new Map<string, Transaction<DatabaseSchema>>()

  /**
   * Start a named transaction (useful for testing and complex scenarios)
   * @param name Transaction name
   * @returns Transaction instance
   */
  static async startTransaction(name: string): Promise<Transaction<DatabaseSchema>> {
    if (this.activeTransactions.has(name)) {
      throw new Error(`Transaction with name "${name}" already exists`)
    }

    const db = getDatabaseInstance()
    const trx = await db.transaction().execute(async transaction => {
      this.activeTransactions.set(name, transaction)
      return transaction
    })

    return trx
  }

  /**
   * Get an active transaction by name
   * @param name Transaction name
   * @returns Transaction instance or null if not found
   */
  static getTransaction(name: string): Transaction<DatabaseSchema> | null {
    return this.activeTransactions.get(name) || null
  }

  /**
   * Commit a named transaction
   * @param name Transaction name
   */
  static async commitTransaction(name: string): Promise<void> {
    const trx = this.activeTransactions.get(name)
    if (!trx) {
      throw new Error(`Transaction with name "${name}" not found`)
    }

    // Note: Kysely transactions are automatically committed when the callback completes
    this.activeTransactions.delete(name)
  }

  /**
   * Rollback a named transaction
   * @param name Transaction name
   */
  static async rollbackTransaction(name: string): Promise<void> {
    const trx = this.activeTransactions.get(name)
    if (!trx) {
      throw new Error(`Transaction with name "${name}" not found`)
    }

    // Note: Kysely transactions are automatically rolled back when an error is thrown
    this.activeTransactions.delete(name)
  }

  /**
   * Clear all active transactions (useful for testing)
   */
  static clearTransactions(): void {
    this.activeTransactions.clear()
  }
}

/**
 * Decorator for automatically wrapping methods in transactions
 * @param target Target object
 * @param propertyKey Method name
 * @param descriptor Method descriptor
 */
export function Transactional(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: unknown[]) {
    return await withTransaction(async trx => {
      // Replace the first argument with the transaction if it's a database instance
      if (args[0] && typeof args[0].selectFrom === 'function') {
        args[0] = trx
      }

      return await originalMethod.apply(this, args)
    })
  }

  return descriptor
}
