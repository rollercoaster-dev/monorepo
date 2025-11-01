/// <reference types="jest" />

import { formatDate } from '../utils';

describe('Timestamp Format', () => {
  it('should format dates with precise timestamps instead of relative time', () => {
    // Create a date in local time to avoid timezone issues
    const testDate = new Date(2023, 5, 7, 19, 1, 33, 484); // June 7, 2023, 19:01:33.484 local time

    // Test 24-hour format
    const formatted24 = formatDate(testDate, true);
    expect(formatted24).toBe('Jun 7, 19:01:33.484');

    // Test 12-hour format
    const formatted12 = formatDate(testDate, false);
    expect(formatted12).toBe('Jun 7, 7:01:33.484 PM');
  });

  it('should never return relative time strings like "just now"', () => {
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const formatted1 = formatDate(now);
    const formatted2 = formatDate(fiveSecondsAgo);
    const formatted3 = formatDate(oneMinuteAgo);

    // None should contain relative time strings
    expect(formatted1).not.toContain('just now');
    expect(formatted1).not.toContain('ago');
    expect(formatted2).not.toContain('just now');
    expect(formatted2).not.toContain('ago');
    expect(formatted3).not.toContain('just now');
    expect(formatted3).not.toContain('ago');

    // All should match the precise timestamp format
    const timestampRegex = /[A-Z][a-z]{2} \d{1,2}, \d{2}:\d{2}:\d{2}\.\d{3}/;
    expect(formatted1).toMatch(timestampRegex);
    expect(formatted2).toMatch(timestampRegex);
    expect(formatted3).toMatch(timestampRegex);
  });

  it('should handle edge cases correctly', () => {
    // Test midnight (local time)
    const midnight = new Date(2023, 0, 1, 0, 0, 0, 0); // January 1, 2023, 00:00:00.000 local time
    const formattedMidnight = formatDate(midnight, true);
    expect(formattedMidnight).toBe('Jan 1, 00:00:00.000');

    // Test noon (local time)
    const noon = new Date(2023, 0, 1, 12, 0, 0, 0); // January 1, 2023, 12:00:00.000 local time
    const formattedNoon12 = formatDate(noon, false);
    expect(formattedNoon12).toBe('Jan 1, 12:00:00.000 PM');
  });
});
