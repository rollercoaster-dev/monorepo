import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/openbadges-ui/" : "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@composables": resolve(__dirname, "./src/composables"),
      "@services": resolve(__dirname, "./src/services"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@/types": resolve(__dirname, "./src/types"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "OpenBadgesUI",
      fileName: (format) => `openbadges-ui.${format}.js`,
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      external: ["vue", "primevue"],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
          vue: "Vue",
          primevue: "PrimeVue",
        },
        // Generate sourcemaps
        sourcemap: true,
      },
    },
    // Generate TypeScript declaration files
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    // Minify the output
    minify: "terser",
  },
});
