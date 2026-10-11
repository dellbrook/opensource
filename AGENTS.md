# dellbrook/opensource

A pnpm workspace of independent open-source TypeScript packages, each
published as `@dellbrook/<name>` from `packages/<name>`, for now to GitHub
Packages (npm.pkg.github.com). README.md has the overview; RELEASING.md has
the release flow and the plan for moving to npmjs.com.

## Commands

Tools come from mise (`mise.toml`); run everything through `mise run`:

- `mise run ci`: install, lint, typecheck, test, build. Run it before
  calling a change done; CI runs exactly this.
- `mise run test`, `mise run typecheck`, `mise run build`, `mise run lint`
- `mise run fix`: Biome fixes and formatting. Run it instead of
  hand-formatting.
- `mise run new <name> --description "..."`: a new package from
  `templates/package`.
- `mise run changeset`: interactive; record a release for changed packages.
  An agent can write the file itself instead: `.changeset/<slug>.md` with
  frontmatter `"@dellbrook/<name>": patch|minor|major` and a one-line
  summary.

## Layout

- `packages/<name>/`: one published package. `src/` holds the code and its
  tests (`*.test.ts` beside the file they test); `dist/` is build output
  (gitignored).
- `templates/package/`: what `mise run new` copies. `__NAME__` and
  `__DESCRIPTION__` are filled in. Change it when a convention changes, and
  apply the same change to the existing packages.
- `scripts/`: repo tooling (the scaffolder, per-commit publishing), with
  its own tests.
- Shared config at the root: `tsconfig.base.json`, `tsdown.base.ts`,
  `biome.json`, `vitest.config.ts` (one `projects` entry per package),
  `.changeset/config.json`.

## Package conventions

- ESM only, Node >= 22 (`engines`). `exports` points at `dist/`; the build
  is `tsdown` (config: `tsdown.base.ts`, overridden per package in its
  `tsdown.config.ts`, e.g. extra entry points).
- `isolatedDeclarations` is on: exported functions and values need explicit
  types, so declarations come out of the build without tsc.
- Imports inside a package use the `.ts` extension (`./util.ts`).
- Tests use vitest; prefer real implementations over mocks.
- `lint:package` (publint + attw over the packed tarball) checks what a
  consumer installs: run as part of `mise run lint`.
- Every package keeps its own README.md (install and usage) and LICENSE
  (MIT), and `publishConfig` with `access: public` and the GitHub Packages
  registry. Shared dev tools (typescript, vitest, tsdown, biome)
  are root devDependencies; a package lists only what it needs at runtime,
  plus devDependencies specific to it.
- A package that depends on another one here uses `workspace:^`; changesets
  rewrites it to a version range on publish. It reads the other package's
  `dist/`, so build first (`mise run build`).
- `"private": true` keeps a package out of releases and per-commit versions.

## Adding a package

1. `mise run new <name> --description "..."`
2. Write `src/`, its tests and the README's usage section.
3. Add it to the package table in the root README.md.
4. Add a changeset (`minor` for a first `0.1.0`). The release workflow
   publishes it; a new package needs no registry setup.

## CI

- `.github/workflows/ci.yml`: `mise run ci` on every PR and push to main.
- `.github/workflows/release.yml`: on every other main push, `snapshot`
  publishes a per-commit version (`<next patch>-main.<date>.<run>.g<sha>`,
  dist-tag `main`) of the packages it changed (`scripts/snapshot.ts`).
  Changesets' version/pack/publish jobs handle real releases,
  publishing with the job's `GITHUB_TOKEN`
  (`.github/actions/registry-auth`). Never publish from a local machine.
- `main` is protected by a ruleset in `dellbrook/iac` (`github.ts`): pull
  requests only, and `ci` must pass. Repository settings live there.
- Actions are pinned by commit SHA with the version in a comment;
  `mise run lint` runs actionlint and zizmor over them.
