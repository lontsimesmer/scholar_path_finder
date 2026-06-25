import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import { cloudflare } from "@cloudflare/vite-plugin";

const manualChunks = (id: string) => {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (
    id.includes("react-dom") ||
    id.includes("react-router-dom") ||
    id.includes("react/")
  ) {
    return "react-vendor";
  }

  if (id.includes("@supabase") || id.includes("@tanstack/react-query")) {
    return "data-vendor";
  }

  if (
    id.includes("@radix-ui") ||
    id.includes("class-variance-authority") ||
    id.includes("clsx") ||
    id.includes("tailwind-merge") ||
    id.includes("lucide-react") ||
    id.includes("cmdk") ||
    id.includes("vaul") ||
    id.includes("embla-carousel-react")
  ) {
    return "ui-vendor";
  }

  if (id.includes("recharts")) {
    return "charts-vendor";
  }

  return "vendor";
};

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), cloudflare()],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));