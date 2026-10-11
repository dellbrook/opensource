# @dellbrook/example

Example package: proves the build, test and release setup works. Not published.

## Install

Published to GitHub Packages, which needs a token with `read:packages` even
for public packages. Add to your project's `.npmrc`:

```ini
@dellbrook:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
npm install @dellbrook/example
```

## Usage

```ts
import { hello } from "@dellbrook/example";

hello("world"); // "hello, world"
```

## License

MIT
