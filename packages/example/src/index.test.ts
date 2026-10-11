import { expect, test } from "vitest";
import { hello } from "./index.ts";

test("hello", () => {
  expect(hello("world")).toBe("hello, world");
});
