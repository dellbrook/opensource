# @dellbrook/__NAME__

__DESCRIPTION__

## Install

Published to GitHub Packages, which needs a token with `read:packages` even
for public packages. Add to your project's `.npmrc`:

```ini
@dellbrook:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
npm install @dellbrook/__NAME__
```

## Usage

```ts
import { hello } from "@dellbrook/__NAME__";

hello("world"); // "hello, world"
```

## License

MIT
