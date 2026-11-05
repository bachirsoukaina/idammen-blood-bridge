import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Single-page app: `npm run build` writes a static site to dist/, served by Nginx in Docker.
export default defineConfig({
  plugins: [
    // Generates src/routeTree.gen.ts from the files in src/routes/. Must run before react().
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  // 5173 avoids a clash with the API gateway on 8080.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
