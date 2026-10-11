#!/usr/bin/env node
// Scaffolds packages/<name> from templates/package, published as
// @dellbrook/<name>. Usage: mise run new <name> [--description "..."]
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = join(import.meta.dirname, "..");

// npm's rules for the part after the scope, narrowed to kebab-case.
const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** `__NAME__` and `__DESCRIPTION__` in template text, JSON-escaped in .json files. */
export function fillTemplate(options: {
  text: string;
  name: string;
  description: string;
  json: boolean;
}): string {
  const description = options.json
    ? JSON.stringify(options.description).slice(1, -1)
    : options.description;
  return options.text
    .replaceAll("__NAME__", options.name)
    .replaceAll("__DESCRIPTION__", description);
}

export function scaffold(options: {
  name: string;
  description: string;
  dest?: string;
}): string {
  const { name, description } = options;
  if (!NAME_PATTERN.test(name)) {
    throw new Error(`invalid name "${name}" (lowercase, kebab-case)`);
  }
  const dest = options.dest ?? join(root, "packages", name);
  if (existsSync(dest)) throw new Error(`${dest} already exists`);

  cpSync(join(root, "templates", "package"), dest, { recursive: true });
  for (const entry of readdirSync(dest, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const text = readFileSync(path, "utf8");
    const json = entry.name.endsWith(".json");
    writeFileSync(path, fillTemplate({ text, name, description, json }));
  }
  return dest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { description: { type: "string", short: "d", default: "" } },
  });
  const [name] = positionals;
  if (!name) {
    console.error('usage: mise run new <name> [--description "..."]');
    process.exit(1);
  }
  scaffold({ name, description: values.description });
  console.log(`created packages/${name} (@dellbrook/${name})`);
}
