import { defineConfig } from "vitest/config";

export default defineConfig({
  // GitHub Pages serves the site from /fordMath/
  base: "/fordMath/",
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
