/**
 * A wrapper class for sensitive values that prevents them from being accidentally logged
 */
export class SensitiveValue<T> {
  private readonly value: T;
  private readonly redactedValue: string;
  
  /**
   * Create a new SensitiveValue
   * @param value The sensitive value to wrap
   * @param redactedValue The value to show instead of the actual value (default: '[REDACTED]')
   */
  constructor(value: T, redactedValue: string = '[REDACTED]') {
    this.value = value;
    this.redactedValue = redactedValue;
  }
  
  /**
   * Get the actual sensitive value
   * Only use this method when you absolutely need the actual value for operations
   * @returns The actual sensitive value
   */
  public getValue(): T {
    return this.value;
  }
  
  /**
   * Override toString to return the redacted value
   */
  public toString(): string {
    return this.redactedValue;
  }
  
  /**
   * Override toJSON to return the redacted value
   */
  public toJSON(): string {
    return this.redactedValue;
  }
  
  /**
   * Override Node.js util.inspect custom handler to return the redacted value
   */
  public [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.redactedValue;
  }
  
  /**
   * Override valueOf to return the redacted value
   */
  public valueOf(): string {
    return this.redactedValue;
  }
  
  /**
   * Factory method to create a new SensitiveValue
   * @param value The sensitive value to wrap
   * @param redactedValue The value to show instead of the actual value
   * @returns A new SensitiveValue instance
   */
  public static from<T>(value: T, redactedValue?: string): SensitiveValue<T> {
    return new SensitiveValue(value, redactedValue);
  }
}
