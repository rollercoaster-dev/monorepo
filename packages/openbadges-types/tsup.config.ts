import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  // `ignoreDeprecations: "6.0"` is needed because TS 6 promotes the deprecated
  // `baseUrl` option (injected by tsup's internal dts pipeline) to a hard
  // error. `composite: false` is needed because the package's tsconfig sets
  // `composite: true` for project references, but tsup's dts emit doesn't run
  // in a composite-aware way.
  dts: {
    compilerOptions: {
      composite: false,
      ignoreDeprecations: "6.0",
    },
  },
  format: ["cjs", "esm"],
  sourcemap: true,
  outDir: "dist",
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
      dts: format === "cjs" ? ".d.cts" : ".d.ts",
    };
  },
});
