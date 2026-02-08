/**
 * Evidence CRUD operation tests
 *
 * Priority: CRITICAL (Rating 10/10)
 * Tests the exactly-one-parent constraint and validation logic
 */

import { createEvidence, updateEvidence, deleteEvidence } from '../queries';
import type { GoalId, StepId, EvidenceId } from '../schema';

// Mock IDs for testing
const mockGoalId = 'goal_test_123' as GoalId;
const mockStepId = 'step_test_456' as StepId;
const mockEvidenceId = 'evidence_test_789' as EvidenceId;

describe('Evidence CRUD Operations', () => {
  describe('createEvidence - Parent Attachment Validation', () => {
    test('should throw when both goalId and stepId are provided', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          stepId: mockStepId,
          type: 'photo',
          uri: 'file://photo.jpg',
        }),
      ).toThrow('Evidence must attach to exactly one of goalId or stepId');
    });

    test('should throw when neither goalId nor stepId are provided', () => {
      expect(() =>
        createEvidence({
          type: 'photo',
          uri: 'file://photo.jpg',
        }),
      ).toThrow('Evidence must attach to exactly one of goalId or stepId');
    });

    test('should succeed with only goalId', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
        }),
      ).not.toThrow();
    });

    test('should succeed with only stepId', () => {
      expect(() =>
        createEvidence({
          stepId: mockStepId,
          type: 'photo',
          uri: 'file://photo.jpg',
        }),
      ).not.toThrow();
    });
  });

  describe('createEvidence - Type Validation', () => {
    test('should throw when type is empty string', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: '',
          uri: 'file://photo.jpg',
        }),
      ).toThrow('Evidence type must be 1-1000 characters');
    });

    test('should throw when type exceeds 1000 characters', () => {
      const longType = 'a'.repeat(1001);
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: longType,
          uri: 'file://photo.jpg',
        }),
      ).toThrow('Evidence type must be 1-1000 characters');
    });

    test('should succeed with valid type', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
        }),
      ).not.toThrow();
    });
  });

  describe('createEvidence - URI Validation', () => {
    test('should throw when uri is empty string', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: '',
        }),
      ).toThrow('Evidence URI must be 1-1000 characters');
    });

    test('should throw when uri exceeds 1000 characters', () => {
      const longUri = 'file://' + 'a'.repeat(1001);
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: longUri,
        }),
      ).toThrow('Evidence URI must be 1-1000 characters');
    });

    test('should succeed with valid uri', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
        }),
      ).not.toThrow();
    });
  });

  describe('createEvidence - Optional Fields', () => {
    test('should succeed with description', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
          description: 'A beautiful sunset',
        }),
      ).not.toThrow();
    });

    test('should throw when description exceeds 1000 characters', () => {
      const longDesc = 'a'.repeat(1001);
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
          description: longDesc,
        }),
      ).toThrow('Evidence description must be 1-1000 characters');
    });

    test('should succeed with metadata', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
          metadata: '{"width": 1920, "height": 1080}',
        }),
      ).not.toThrow();
    });

    test('should throw when metadata exceeds 1000 characters', () => {
      const longMeta = 'a'.repeat(1001);
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
          metadata: longMeta,
        }),
      ).toThrow('Evidence metadata must be 1-1000 characters');
    });

    test('should succeed with both description and metadata', () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: 'photo',
          uri: 'file://photo.jpg',
          description: 'A beautiful sunset',
          metadata: '{"width": 1920, "height": 1080}',
        }),
      ).not.toThrow();
    });
  });

  describe('updateEvidence - Validation', () => {
    test('should succeed updating description to null', () => {
      expect(() =>
        updateEvidence(mockEvidenceId, {
          description: null,
        }),
      ).not.toThrow();
    });

    test('should throw when updating description to empty string', () => {
      expect(() =>
        updateEvidence(mockEvidenceId, {
          description: '',
        }),
      ).toThrow('Evidence description must be 1-1000 characters');
    });

    test('should throw when updating description exceeds 1000 characters', () => {
      const longDesc = 'a'.repeat(1001);
      expect(() =>
        updateEvidence(mockEvidenceId, {
          description: longDesc,
        }),
      ).toThrow('Evidence description must be 1-1000 characters');
    });

    test('should succeed updating metadata to null', () => {
      expect(() =>
        updateEvidence(mockEvidenceId, {
          metadata: null,
        }),
      ).not.toThrow();
    });

    test('should throw when updating metadata to empty string', () => {
      expect(() =>
        updateEvidence(mockEvidenceId, {
          metadata: '',
        }),
      ).toThrow('Evidence metadata must be 1-1000 characters');
    });

    test('should succeed updating both fields', () => {
      expect(() =>
        updateEvidence(mockEvidenceId, {
          description: 'Updated description',
          metadata: '{"updated": true}',
        }),
      ).not.toThrow();
    });
  });

  describe('deleteEvidence', () => {
    test('should succeed soft-deleting evidence', () => {
      expect(() => deleteEvidence(mockEvidenceId)).not.toThrow();
    });
  });
});
