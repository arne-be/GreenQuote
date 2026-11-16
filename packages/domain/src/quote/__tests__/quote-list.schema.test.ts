import { describe, expect, it } from "vitest";

import { quoteListQuerySchema } from "../quote-list.schema.ts";

describe("quoteListQuerySchema", () => {
  it("defaults to the first 20 quotes", () => {
    expect(quoteListQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it("reads limit and offset from query strings and trims q", () => {
    expect(
      quoteListQuerySchema.parse({ q: "  ada ", limit: "100", offset: "40" }),
    ).toEqual({ q: "ada", limit: 100, offset: 40 });
  });

  it.each([
    { limit: "0" },
    { limit: "101" },
    { limit: "1.5" },
    { limit: "abc" },
    { offset: "-1" },
    { q: "x".repeat(101) },
  ])("rejects %o", (query) => {
    expect(quoteListQuerySchema.safeParse(query).success).toBe(false);
  });
});
