import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // GitHub Pages serves the site from /fordMath/
  base: "/fordMath/",
  define: {
    // commit shown on the Tests page; GitHub Actions sets GITHUB_SHA
    __BUILD_SHA__: JSON.stringify(process.env.GITHUB_SHA ?? "local"),
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        stats: resolve(__dirname, "stats/index.html"),
        quadratic: resolve(__dirname, "quadratic/index.html"),
        function: resolve(__dirname, "function/index.html"),
        einmaleins: resolve(__dirname, "einmaleins/index.html"),
        schriftlich: resolve(__dirname, "schriftlich/index.html"),
        tests: resolve(__dirname, "tests/index.html"),
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
