# Open Badges Types Examples

This directory contains examples of how to use the Open Badges Types package in various scenarios.

## Examples

- [Basic Usage](./basic-usage.ts): Simple examples of creating and working with Open Badges 2.0 and 3.0 types
- [Type Guards](./type-guards.ts): Examples of using type guards for runtime validation
- [Version Conversion](./version-conversion.ts): Examples of converting between Open Badges 2.0 and 3.0
- [Express Integration](./express-integration.ts): Example of using Open Badges Types with Express
- [React Integration](./react-integration.ts): Example of using Open Badges Types with React

## Running Examples

To run an example:

```bash
# Compile the example
npx tsc examples/basic-usage.ts --esModuleInterop --target es2020 --module commonjs

# Run the compiled JavaScript
node examples/basic-usage.js
```

## Contributing Examples

If you have a useful example that you'd like to contribute, please:

1. Create a new TypeScript file in this directory
2. Add appropriate comments and documentation
3. Update this README.md to include your example
4. Submit a pull request

Please ensure your example is well-documented and demonstrates a practical use case.
