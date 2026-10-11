#!/usr/bin/env node
// Publishes a per-commit version of each package a main commit changed, under
// the `main` dist-tag: release.yml's `snapshot` job runs it after every merge
// that isn't a release. Real releases stay with changesets (and `latest`).
//
//   node scripts/snapshot.ts [--since <commit>] [--dry-run]
//
// --since: only packages changed since that commit, plus the packages that
// depend on them (CI: the previous main commit); without it, every package.
// --dry-run: print what would be published, changing nothing.
//
// Registry and credentials come from npm config (.github/actions/registry-auth
// in CI). Versions already in the registry are skipped, so re-running a run
// is harmless.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = join(import.meta.dirname, "..");

export interface WorkspacePackage {
  name: string;
  version: string;
  /** From the repo root, e.g. packages/example. */
  dir: string;
  private: boolean;
  /** Names of the workspace packages it depends on (any dependency field). */
  workspaceDependencies: string[];
}

/**
 * `<next patch>-main.<YYYYMMDD>.<run>.g<sha>`: above `version` (the last
 * release) and below any next release. The commit's UTC date and the CI run
 * number order versions; the "g" keeps an all-digit short SHA a valid
 * prerelease identifier (numeric ones can't have leading zeros).
 */
export function snapshotVersion(options: {
  version: string;
  date: Date;
  run: number;
  sha: string;
}): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(options.version);
  if (!match) throw new Error(`not a release version: ${options.version}`);
  if (!Number.isInteger(options.run) || options.run < 0) {
    throw new Error(`run must be a non-negative integer: ${options.run}`);
  }
  if (!/^[0-9a-f]{7,40}$/.test(options.sha)) {
    throw new Error(`not a commit SHA: ${options.sha}`);
  }
  const [, major, minor, patch] = match;
  const ymd = options.date.toISOString().slice(0, 10).replaceAll("-", "");
  const sha = options.sha.slice(0, 7);
  return `${major}.${minor}.${Number(patch) + 1}-main.${ymd}.${options.run}.g${sha}`;
}

/** Changes outside packages/ that change what every package publishes. */
const SHARED_INPUTS: ((file: string) => boolean)[] = [
  (f) => f === "pnpm-lock.yaml" || f === "package.json",
  (f) => f === "tsconfig.base.json" || f === "tsdown.base.ts",
  (f) => f === "scripts/snapshot.ts",
];

/**
 * The publishable packages a change to `files` (from the repo root) affects:
 * the ones it touched, and every package that depends on one of those.
 * `files` undefined means every package.
 */
export function affectedPackages(options: {
  packages: WorkspacePackage[];
  files: string[] | undefined;
}): WorkspacePackage[] {
  const { packages, files } = options;
  const publishable = packages.filter((p) => !p.private);
  if (!files || files.some((f) => SHARED_INPUTS.some((shared) => shared(f)))) {
    return publishable;
  }
  const affected = new Set(
    packages
      .filter((p) => files.some((f) => f.startsWith(`${p.dir}/`)))
      .map((p) => p.name),
  );
  // Dependents of dependents too: until nothing new is added.
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of packages) {
      if (affected.has(p.name)) continue;
      if (p.workspaceDependencies.some((d) => affected.has(d))) {
        affected.add(p.name);
        grew = true;
      }
    }
  }
  return publishable.filter((p) => affected.has(p.name));
}

function readPackages(): WorkspacePackage[] {
  const dirs = readdirSync(join(root, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`);
  const manifests = dirs.map((dir) => ({
    dir,
    json: JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8")),
  }));
  const names = new Set(manifests.map((m) => m.json.name as string));
  return manifests.map(({ dir, json }) => {
    const deps = [
      json.dependencies,
      json.peerDependencies,
      json.optionalDependencies,
    ].flatMap((field) => Object.keys(field ?? {}));
    return {
      name: json.name,
      version: json.version,
      dir,
      private: json.private === true,
      workspaceDependencies: deps.filter((d) => names.has(d)),
    };
  });
}

const git = (...args: string[]): string =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

/** Whether `name@version` is in the registry npm config points its scope at. */
function isPublished(name: string, version: string): boolean {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch (err) {
    // E404 is "not there"; anything else (auth, network) is a real failure.
    const stderr = String((err as { stderr?: unknown }).stderr ?? "");
    if (stderr.includes("E404")) return false;
    throw err;
  }
}

function main() {
  const { values } = parseArgs({
    options: {
      since: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const files = values.since
    ? git("diff", "--name-only", values.since, "HEAD").split("\n")
    : undefined;
  const targets = affectedPackages({ packages: readPackages(), files });
  if (targets.length === 0) {
    console.log("no publishable package changed");
    return;
  }

  const date = new Date(
    Number(git("show", "-s", "--format=%ct", "HEAD")) * 1000,
  );
  const run = Number(process.env.GITHUB_RUN_NUMBER ?? 0);
  const sha = git("rev-parse", "HEAD");
  const versions = new Map(
    targets.map((p) => [
      p.name,
      snapshotVersion({ version: p.version, date, run, sha }),
    ]),
  );

  if (values["dry-run"]) {
    for (const [name, version] of versions) {
      console.log(`would publish ${name}@${version} (tag main)`);
    }
    return;
  }

  // Every target's version first, so a target that depends on another one
  // gets that one's snapshot version when pnpm rewrites `workspace:`.
  for (const p of targets) {
    const path = join(root, p.dir, "package.json");
    const json = JSON.parse(readFileSync(path, "utf8"));
    json.version = versions.get(p.name);
    writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  }

  const failed: string[] = [];
  for (const p of targets) {
    const version = versions.get(p.name) as string;
    const label = `${p.name}@${version}`;
    if (isPublished(p.name, version)) {
      console.log(`${label} is already published`);
      continue;
    }
    try {
      execFileSync(
        "pnpm",
        ["publish", "--tag", "main", "--no-git-checks", "--access", "public"],
        { cwd: join(root, p.dir), stdio: "inherit" },
      );
      console.log(`published ${label} (tag main)`);
    } catch {
      // Keep going: one package's failure shouldn't hold back the others.
      failed.push(label);
    }
  }
  if (failed.length > 0) {
    throw new Error(`failed to publish: ${failed.join(", ")}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
