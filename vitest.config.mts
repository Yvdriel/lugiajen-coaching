import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Don't let Vitest pick up Playwright/e2e or node_modules specs.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
