# dellbrook/opensource

Open-source TypeScript packages, published as `@dellbrook/<name>`. Each
package lives in `packages/<name>` and is versioned and released on its own.
For now they publish to GitHub Packages; installing one needs a token (see
[RELEASING.md](RELEASING.md#installing-from-github-packages)).

| Package | Description |
| --- | --- |
| [`@dellbrook/example`](packages/example) | Example of the package layout; published to prove the release pipeline |

## Development

Tools are pinned with [mise](https://mise.jdx.dev) (`mise.toml`): Node,
pnpm and the workflow linters.

```sh
mise install          # node, pnpm, actionlint, zizmor
mise run ci           # install, lint, typecheck, test, build: what CI runs
mise run test         # vitest over every package
mise run fix          # Biome fixes and formatting
mise tasks            # everything else
```

## Adding a package

```sh
mise run new my-thing --description "One line on what it does"
```

This copies `templates/package` to `packages/my-thing`: a package.json for
`@dellbrook/my-thing`, a README, the MIT LICENSE, `src/index.ts` and a test.
Write the code, add a row to the table above, and record a release with
`mise run changeset`.

## Releasing

[Changesets](https://changesets.dev): each PR that changes a package adds a
changeset (`mise run changeset`) naming the packages and the bump. On main,
the `release` workflow keeps a "Version Packages" PR open with the bumps and
changelogs; merging it publishes those packages to GitHub Packages. Every
other merge publishes a per-commit version of the packages it changed under
the `main` dist-tag (`npm install @dellbrook/<name>@main`). See
[RELEASING.md](RELEASING.md).

## License

MIT; each package carries its own LICENSE.
