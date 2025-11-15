---
"@rollercoaster-dev/rd-logger": patch
---

Enable strict TypeScript checks (noUncheckedIndexedAccess and isolatedModules)

- Removed TypeScript compiler overrides from tsconfig.json
- Fixed 13 noUncheckedIndexedAccess violations using optional chaining in tests
- Fixed 12 isolatedModules violations by converting to `export type` syntax
- Removed all `as any` type casts in favor of proper types and @ts-expect-error
- Updated Jest configuration with better documentation
- Created MockLogContext type for cleaner test assertions

All changes improve type safety and align with monorepo's strict TypeScript standards.
