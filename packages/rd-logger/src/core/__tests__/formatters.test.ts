/// <reference types="jest" />

import { JsonFormatter, TextFormatter } from '../formatters';

describe('Logger Formatters', () => {
  const testLevel = 'info';
  const testMessage = 'Test message';
  const testTimestamp = '2023-01-01T12:00:00.000Z';
  const testContext = { userId: 123, action: 'test' };

  it('should format logs as text with TextFormatter', () => {
    const formatter = new TextFormatter();
    const formatted = formatter.format(testLevel, testMessage, testTimestamp, testContext);
    
    expect(formatted).toContain('[2023-01-01T12:00:00.000Z]');
    expect(formatted).toContain('INFO:');
    expect(formatted).toContain('Test message');
    expect(formatted).toContain('"userId": 123');
    expect(formatted).toContain('"action": "test"');
  });

  it('should format logs as JSON with JsonFormatter', () => {
    const formatter = new JsonFormatter();
    const formatted = formatter.format(testLevel, testMessage, testTimestamp, testContext);
    
    const parsed = JSON.parse(formatted);
    expect(parsed).toEqual({
      level: testLevel,
      message: testMessage,
      timestamp: testTimestamp,
      userId: 123,
      action: 'test'
    });
  });

  it('should handle empty context', () => {
    const textFormatter = new TextFormatter();
    const jsonFormatter = new JsonFormatter();
    
    const textFormatted = textFormatter.format(testLevel, testMessage, testTimestamp, {});
    const jsonFormatted = jsonFormatter.format(testLevel, testMessage, testTimestamp, {});
    
    expect(textFormatted).not.toContain('|');
    
    const parsed = JSON.parse(jsonFormatted);
    expect(Object.keys(parsed)).toHaveLength(3); // level, message, timestamp
  });

  it('should handle complex nested objects', () => {
    const complexContext = {
      user: {
        id: 123,
        profile: {
          name: 'Test User',
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      },
      metadata: {
        tags: ['test', 'formatter']
      }
    };
    
    const textFormatter = new TextFormatter();
    const jsonFormatter = new JsonFormatter();
    
    const textFormatted = textFormatter.format(testLevel, testMessage, testTimestamp, complexContext);
    const jsonFormatted = jsonFormatter.format(testLevel, testMessage, testTimestamp, complexContext);
    
    expect(textFormatted).toContain('"user":');
    expect(textFormatted).toContain('"profile":');
    
    const parsed = JSON.parse(jsonFormatted);
    expect(parsed.user.profile.name).toBe('Test User');
    expect(parsed.metadata.tags).toEqual(['test', 'formatter']);
  });
});
