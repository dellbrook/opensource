import { defineConfig, type UserConfig } from "tsdown";

// Every package's tsdown.config.ts starts from this: ESM only, src/index.ts
// into dist/index.js with its .d.ts and source maps. A package with more
// entry points or a CLI passes overrides, e.g.
// `tsdownConfig({ entry: ["src/index.ts", "src/cli.ts"] })`.
export function tsdownConfig(overrides: UserConfig = {}): UserConfig {
  return defineConfig({
    entry: ["src/index.ts"],
    format: "esm",
    platform: "node",
    dts: true,
    sourcemap: true,
    clean: true,
    // dist/index.js and index.d.ts rather than .mjs and .d.mts; every
    // package is "type": "module".
    fixedExtension: false,
    ...overrides,
  });
}
