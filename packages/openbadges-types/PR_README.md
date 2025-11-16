# Fix OB3 Validation for Nested Objects

## Problem

The current implementation of the OB3 type guards has limitations when validating nested objects:

1. **Nested objects without `@context`**: The `isJsonLdObject` function requires both `@context` and `type` properties to be present, which causes validation to fail for nested objects like `issuer` and `achievement` that don't typically include the `@context` property when embedded in a parent object.

2. **Array types handling**: The validation functions don't properly handle both string and array types for the `type` field, despite the interfaces allowing both formats.

This causes validation to fail for valid OB3 badges that:
- Have nested objects without `@context` properties
- Use array types (e.g., `type: ['Profile']` instead of `type: 'Profile'`)

## Solution

This PR modifies the type guards for nested objects to be more flexible:

1. For the `isIssuer` function:
   - Removed the dependency on `isJsonLdObject`
   - Check for required properties directly (id, name, url)
   - Handle both string and array types for the `type` property

2. For the `isAchievement` function:
   - Removed the dependency on `isJsonLdObject`
   - Check for required properties directly (id, name)
   - Handle both string and array types for the `type` property

## Changes

- Modified `isIssuer` function in `src/v3/guards.ts`
- Modified `isAchievement` function in `src/v3/guards.ts`
- Added tests in `test/ob3-nested-validation.test.ts` to verify the behavior

## Testing

The new tests verify that:
1. Badges with nested objects that include `@context` properties validate correctly
2. Badges with nested objects that don't include `@context` properties now validate correctly
3. Badges with array types for the `type` field now validate correctly

## Impact

This change makes the package more robust when dealing with real-world OB3 badges, which often have nested objects without `@context` properties and may use array types for the `type` field.
