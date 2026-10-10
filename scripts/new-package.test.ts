import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { fillTemplate, scaffold } from "./new-package.ts";

test("fillTemplate escapes the description only in JSON", () => {
  const text = '"__NAME__: __DESCRIPTION__"';
  const filled = { name: "x", description: 'a "b"' };
  expect({
    json: fillTemplate({ text, ...filled, json: true }),
    other: fillTemplate({ text, ...filled, json: false }),
  }).toMatchObject({ json: '"x: a \\"b\\""', other: '"x: a "b""' });
});

test("scaffold writes a package named @dellbrook/<name>", () => {
  const dest = join(mkdtempSync(join(tmpdir(), "new-package-")), "pkg");
  scaffold({ name: "my-lib", description: 'Does "things"', dest });
  const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
  expect(pkg).toMatchObject({
    name: "@dellbrook/my-lib",
    description: 'Does "things"',
    publishConfig: { access: "public" },
    repository: { directory: "packages/my-lib" },
  });
  expect(readFileSync(join(dest, "README.md"), "utf8")).toContain(
    "# @dellbrook/my-lib",
  );
});

test("scaffold rejects names that aren't kebab-case", () => {
  expect(() => scaffold({ name: "MyLib", description: "" })).toThrow(
    /invalid name/,
  );
});
