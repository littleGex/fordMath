import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { serviceWorker } from "./build/sw-plugin";

export default defineConfig({
  // GitHub Pages serves the site from /fordMath/
  base: "/fordMath/",
  plugins: [serviceWorker(resolve(__dirname, "build/sw-template.js"))],
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
        teiler: resolve(__dirname, "teiler/index.html"),
        brueche: resolve(__dirname, "brueche/index.html"),
        stellenwerte: resolve(__dirname, "stellenwerte/index.html"),
        groessen: resolve(__dirname, "groessen/index.html"),
        "punkt-vor-strich": resolve(__dirname, "punkt-vor-strich/index.html"),
    tests: resolve(__dirname, "tests/index.html"),
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "build/**/*.test.ts"],
  },
});
