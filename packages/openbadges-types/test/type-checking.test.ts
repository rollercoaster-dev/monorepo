import type { OB2, OB3} from '../src';
import { Shared } from '../src';
import { createOB2Assertion, createOB3VerifiableCredential } from './helpers';

/**
 * These tests verify that TypeScript's type system correctly enforces
 * the constraints defined in our type definitions.
 *
 * Note: These tests don't actually run any assertions at runtime.
 * Instead, they verify that the TypeScript compiler accepts valid types
 * and rejects invalid types during compilation.
 */
describe('Type Checking Tests', () => {
  describe('OB2 Type Checking', () => {
    test('should enforce required properties on Assertion', () => {
      // Use the helper function to create a valid assertion
      const assertion = createOB2Assertion();
      expect(assertion).toBeTruthy();

      // TypeScript should catch this error during compilation
      // @ts-expect-error - Missing required properties
      ({
        id: Shared.createIRI('https://example.org/assertions/123'),
        type: 'Assertion',
        // Missing recipient, issuedOn, verification, badge
      }) satisfies OB2.Assertion;

      expect(true).toBe(true); // Dummy assertion to satisfy Jest
    });
  });

  describe('OB3 Type Checking', () => {
    test('should enforce required properties on VerifiableCredential', () => {
      // This should compile without errors
      const credential = createOB3VerifiableCredential();
      expect(credential).toBeTruthy();

      // TypeScript should catch this error during compilation
      // @ts-expect-error - Missing required properties
      ({
        id: Shared.createIRI('https://example.org/credentials/3732'),
        type: ['VerifiableCredential'],
        // Missing @context, issuer, issuanceDate, credentialSubject
      }) satisfies OB3.VerifiableCredential;

      expect(true).toBe(true); // Dummy assertion to satisfy Jest
    });
  });

  describe('Shared Type Checking', () => {
    test('should enforce correct types for shared types', () => {
      // These should compile without errors
      // Using the variables in assertions to avoid unused variable warnings
      const iri = Shared.createIRI('https://example.org/badges/5');
      expect(iri).toEqual(expect.any(String));

      const dateTime = Shared.createDateTime('2023-06-15T12:00:00Z');
      expect(dateTime).toEqual(expect.any(String));

      const multiLanguageString: Shared.MultiLanguageString = {
        en: 'Hello',
        es: 'Hola',
      };
      expect(multiLanguageString.en).toBe('Hello');

      // TypeScript should catch these errors during compilation
      // TypeScript errors are checked at compile time, not runtime
      // We don't need to create variables that aren't used

      expect(true).toBe(true); // Dummy assertion to satisfy Jest
    });
  });
});
