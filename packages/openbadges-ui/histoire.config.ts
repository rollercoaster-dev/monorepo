import { defineConfig } from "histoire";
import { HstVue } from "@histoire/plugin-vue";

export default defineConfig({
  // Configuration for GitHub Pages deployment

  // Use hash router mode for better compatibility with GitHub Pages
  routerMode: "hash",
  // Use a custom index.html template
  vite: {
    base: "/openbadges-ui/",
    server: {
      host: true,
    },
    resolve: {
      alias: {
        "@": "/src",
        "@components": "/src/components",
        "@composables": "/src/composables",
        "@services": "/src/services",
        "@utils": "/src/utils",
        "@types": "/src/types",
      },
    },
    build: {
      rollupOptions: {
        output: {
          assetFileNames: "assets/[name].[ext]",
          chunkFileNames: "assets/[name].js",
          entryFileNames: "assets/[name].js",
        },
      },
    },
  },
  plugins: [HstVue()],
  theme: {
    title: "OpenBadges UI",
    // Removed logo configuration as the file doesn't exist
    colors: {
      primary: {
        50: "#eef2ff",
        100: "#e0e7ff",
        200: "#c7d2fe",
        300: "#a5b4fc",
        400: "#818cf8",
        500: "#6366f1",
        600: "#4f46e5",
        700: "#4338ca",
        800: "#3730a3",
        900: "#312e81",
      },
    },
  },
  tree: {
    groups: [
      {
        id: "design-system",
        title: "Design System",
        include: (file) => file.title?.startsWith("Design System/"),
      },
      {
        id: "components",
        title: "Components",
      },
      {
        id: "badges",
        title: "Badges",
        include: (file) => file.title?.startsWith("Components/Badges/"),
      },
      {
        id: "issuing",
        title: "Issuing",
        include: (file) => file.title?.startsWith("Components/Issuing/"),
      },
    ],
  },
  setupFile: "./histoire.setup.ts",
  outDir: "histoire-dist",
});
