import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const LOCAL_DEV_PORT = 47174;
const LOCAL_PREVIEW_PORT = 45175;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: LOCAL_DEV_PORT,
    strictPort: true,
  },
  preview: {
    port: LOCAL_PREVIEW_PORT,
    strictPort: true,
  },
});
