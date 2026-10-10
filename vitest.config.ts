import { defineConfig } from "vitest/config";

// `vitest run` at the root runs every package (and scripts/) in one process.
// A package needs no config of its own; add a vitest.config.ts to it only to
// change its environment (e.g. browser) or setup.
export default defineConfig({
  test: {
    projects: [
      "packages/*",
      { test: { name: "scripts", include: ["scripts/**/*.test.ts"] } },
    ],
  },
});
