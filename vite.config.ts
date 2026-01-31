import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      routesDirectory: "./app/routes",
      generatedRouteTree: "./app/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: "dist/client",
  },
});
