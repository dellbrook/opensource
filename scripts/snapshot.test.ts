import { describe, expect, test } from "vitest";
import {
  affectedPackages,
  snapshotVersion,
  type WorkspacePackage,
} from "./snapshot.ts";

describe("snapshotVersion", () => {
  const base = {
    date: new Date("2026-10-10T23:59:00Z"),
    run: 42,
    sha: "0123456789abcdef0123456789abcdef01234567",
  };

  test("sorts after the last release and before the next", () => {
    expect({
      released: snapshotVersion({ ...base, version: "0.1.0" }),
      unreleased: snapshotVersion({ ...base, version: "0.0.0" }),
    }).toMatchObject({
      released: "0.1.1-main.20261010.42.g0123456",
      unreleased: "0.0.1-main.20261010.42.g0123456",
    });
  });

  test("rejects a version that's already a prerelease, and bad input", () => {
    expect(() => snapshotVersion({ ...base, version: "0.1.0-main.1" })).toThrow(
      /not a release version/,
    );
    expect(() =>
      snapshotVersion({ ...base, version: "1.0.0", run: -1 }),
    ).toThrow(/run/);
    expect(() =>
      snapshotVersion({ ...base, version: "1.0.0", sha: "HEAD" }),
    ).toThrow(/SHA/);
  });
});

describe("affectedPackages", () => {
  const pkg = (
    name: string,
    extra: Partial<WorkspacePackage> = {},
  ): WorkspacePackage => ({
    name: `@dellbrook/${name}`,
    version: "0.1.0",
    dir: `packages/${name}`,
    private: false,
    workspaceDependencies: [],
    ...extra,
  });
  const packages = [
    pkg("a"),
    pkg("b", { workspaceDependencies: ["@dellbrook/a"] }),
    pkg("c", { workspaceDependencies: ["@dellbrook/b"] }),
    pkg("d"),
    pkg("example", { private: true }),
  ];
  const names = (files: string[] | undefined) =>
    affectedPackages({ packages, files }).map((p) => p.name);

  test("a change to a package takes its dependents along", () => {
    expect(names(["packages/a/src/index.ts"])).toEqual([
      "@dellbrook/a",
      "@dellbrook/b",
      "@dellbrook/c",
    ]);
  });

  test("shared build inputs, or no diff at all, mean every public package", () => {
    const all = [
      "@dellbrook/a",
      "@dellbrook/b",
      "@dellbrook/c",
      "@dellbrook/d",
    ];
    expect({
      lockfile: names(["pnpm-lock.yaml"]),
      none: names(undefined),
    }).toMatchObject({ lockfile: all, none: all });
  });

  test("docs and private packages publish nothing", () => {
    expect(names(["README.md", "packages/example/src/index.ts"])).toEqual([]);
  });
});
