/**
 * Greets a user by name.
 *
 * @param name - The name of the user to greet
 * @returns A greeting message
 */
export function greetUser(name: string): string {
  return `Hello, ${name}!`;
}

/**
 * User management service.
 * Handles user CRUD operations.
 */
export class UserService {
  /**
   * Finds a user by their unique ID.
   *
   * @param _id - The user ID to search for
   * @returns The user object or null if not found
   * @throws {Error} If the database connection fails
   */
  findById(_id: string): User | null {
    return null;
  }

  // Method without JSDoc
  deleteAll(): void {}
}

/**
 * Configuration options for the application.
 */
export interface AppConfig {
  port: number;
  host: string;
}

/**
 * Unique identifier for a user.
 */
export type UserId = string;

/**
 * User entity type.
 */
export type User = {
  id: UserId;
  name: string;
};

// Function without JSDoc (should not have jsDocContent)
export function helperFunction(): number {
  return 42;
}

/**
 * @deprecated Use greetUser instead
 */
export function oldGreet(): string {
  return "Hi";
}
