# Releasing

Releases are automated with [Changesets](https://changesets.dev) and
`.github/workflows/release.yml`. For now, packages publish to
**GitHub Packages** (`npm.pkg.github.com`) with the workflow's own
`GITHUB_TOKEN`: there's no stored secret, and a new package needs no setup
before its first release. Moving to npmjs.com is described at the end.

## The flow

1. A PR that changes a package adds a changeset: `mise run changeset`, pick
   the packages and the bump (patch, minor or major), write the line for the
   changelog. Commit the generated `.changeset/*.md` with the PR.
2. On merge to main, the `release` workflow opens (or updates) a PR titled
   "Version Packages" that applies every pending changeset: version bumps,
   each package's `CHANGELOG.md`, and the bump of packages that depend on
   them.
3. Merging that PR runs `release` again. It runs everything CI runs, packs
   each package whose version isn't in the registry yet, publishes it, and
   pushes a `@dellbrook/<name>@<version>` tag and a GitHub release for each.

Packages with `"private": true` (like `packages/example`) are never
published.

The "Version Packages" PR is opened with the workflow's `GITHUB_TOKEN`, and
GitHub doesn't start workflows for PRs that token opens, so `ci` doesn't run
on it. The `pack` job runs the same checks before it packs anything.

## One-time setup (by hand)

In `dellbrook/opensource` → Settings → Actions → General → Workflow
permissions, check "Allow GitHub Actions to create and approve pull
requests", for the Version Packages PR.

That's all. A package published by the workflow is linked to this repository
by its `repository` field, so it inherits the repository's visibility
(public) and access. To check: github.com/dellbrook → Packages.

## Installing from GitHub Packages

GitHub's npm registry needs a token to install any package, public ones
included. Consumers need a classic personal access token with
`read:packages` and an `.npmrc`:

```ini
@dellbrook:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

In a GitHub Actions workflow, the job's `GITHUB_TOKEN` with
`permissions: packages: read` is enough.

Your dev machines map `@dellbrook` to `npm.jeeyoungk.com` in `~/.npmrc`; a
project `.npmrc` like the one above overrides that for the project.

## Moving to npmjs.com later

npm's trusted publishing (GitHub Actions' OIDC token instead of a stored npm
token) can only be configured on a package that already exists on npm
([npm trust docs](https://docs.npmjs.com/cli/v11/commands/npm-trust)), so
each package's first npm release is published by hand. To move:

1. Make sure the `dellbrook` org exists on npmjs.com.
2. In every package and `templates/package/package.json`, set
   `publishConfig.registry` to `https://registry.npmjs.org/` and add
   `"provenance": true`.
3. In `release.yml`, drop the `registry-auth` steps, and give the `publish`
   job `id-token: write` (it can then drop `packages: write`) and an
   environment, e.g. `npm`, limited to `main`.
4. For each package, once: `npm login`, `mise run build`, then in
   `packages/<name>`: `pnpm publish --provenance=false --no-git-checks`.
   Then on npmjs.com, the package → Settings → Trusted publishing → GitHub
   Actions: `dellbrook` / `opensource` / `release.yml` / environment `npm`.
   Set "Publishing access" to "Require two-factor authentication and
   disallow tokens". (`npm trust github` does the same from the CLI with npm
   11.15 or later.)
