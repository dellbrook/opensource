# Releasing

Releases are automated with [Changesets](https://changesets.dev) and
`.github/workflows/release.yml`, which publishes to npm with
[trusted publishing](https://docs.npmjs.com/trusted-publishers): GitHub
Actions' OIDC token instead of a stored npm token, with a provenance
attestation on every version.

## The flow

1. A PR that changes a package adds a changeset: `mise run changeset`, pick
   the packages and the bump (patch, minor or major), write the line for the
   changelog. Commit the generated `.changeset/*.md` with the PR.
2. On merge to main, the `release` workflow opens (or updates) a PR titled
   "Version Packages" that applies every pending changeset: version bumps,
   each package's `CHANGELOG.md`, and the bump of packages that depend on
   them.
3. Merging that PR runs `release` again. It runs everything CI runs, packs
   each package whose version isn't on npm yet, publishes it, and pushes a
   `@dellbrook/<name>@<version>` tag and a GitHub release for each.

Packages with `"private": true` (like `packages/example`) are never
published.

The "Version Packages" PR is opened with the workflow's `GITHUB_TOKEN`, and
GitHub doesn't start workflows for PRs that token opens, so `ci` doesn't run
on it. The publish job runs the same checks before it packs anything.

## One-time setup (by hand)

### npm

1. Make sure the `dellbrook` organization exists on
   [npmjs.com](https://www.npmjs.com/org/create) and that your account can
   publish to it. Packages are public (`publishConfig.access`), which a free
   org allows.
2. Note: `~/.npmrc` on the dev machines maps `@dellbrook` to the private
   registry `npm.jeeyoungk.com`. Every package here sets
   `publishConfig.registry` to `https://registry.npmjs.org/`, so a publish
   goes to npmjs regardless, but `npm view` or `npm install` of an
   `@dellbrook/*` package from a dev machine asks the private registry. Pass
   `--registry https://registry.npmjs.org/` to look at the public one.

### GitHub (`dellbrook/opensource`)

1. Settings → Actions → General → Workflow permissions: check "Allow GitHub
   Actions to create and approve pull requests" (for the Version Packages
   PR).
2. Settings → Environments → New environment `npm`. The `publish` job runs
   in it; under "Deployment branches and tags" allow only `main`. Optionally
   add yourself as a required reviewer to approve each publish.

## Per package: the first release

npm only lets you configure a trusted publisher on a package that already
exists, so the first version of each new package is published by hand:

```sh
npm login --registry https://registry.npmjs.org/
mise run build
cd packages/<name>
# Provenance needs CI's OIDC token, so it's off for this one.
pnpm publish --provenance=false --no-git-checks
```

Then on npmjs.com, the package → Settings → Trusted publishing → GitHub
Actions:

| Field | Value |
| --- | --- |
| Organization or user | `dellbrook` |
| Repository | `opensource` |
| Workflow filename | `release.yml` |
| Environment | `npm` |

While there, set "Publishing access" to "Require two-factor authentication
and disallow tokens", so only the workflow can publish from then on.

Every later version goes through changesets and the workflow.

If you'd rather not publish by hand, add an npm automation token as the
`NPM_TOKEN` secret on the `npm` environment and pass it to the publish step
(`env: NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`) for the first release,
then remove it once trusted publishing is configured.
