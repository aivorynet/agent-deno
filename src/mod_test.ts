import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";

Deno.test("module loads", () => {
  assertEquals(typeof Deno, "object");
});
