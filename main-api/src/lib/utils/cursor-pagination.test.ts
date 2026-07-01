import { describe, expect, it } from "vitest";

import {
  buildCursorPage,
  invalidCursorError,
  parseBoundCursor,
} from "./cursor-pagination";

describe("canonical cursor pagination", () => {
  const scope = {
    corporationId: "00000000-0000-4000-8000-000000000001",
    companyId: "00000000-0000-4000-8000-000000000002",
  };
  const query = {
    search: "ana",
    sortBy: "createdAt",
    sortDirection: "asc",
  } as const;

  it("encodes unpadded Base64URL cursors bound to scope and query", () => {
    const page = buildCursorPage({
      items: [
        { id: "a", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "b", createdAt: "2026-01-02T00:00:00.000Z" },
      ],
      limit: 1,
      query,
      resource: "clients",
      scope,
      sortBy: "createdAt",
      sortDirection: "asc",
      getLast: (item) => ({ id: item.id, value: item.createdAt }),
    });

    expect(page.data).toEqual([
      { id: "a", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(page.pageInfo.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(page.pageInfo.nextCursor).not.toContain("=");

    expect(
      parseBoundCursor({
        cursor: page.pageInfo.nextCursor ?? undefined,
        query,
        resource: "clients",
        scope,
        sortBy: "createdAt",
        sortDirection: "asc",
      }),
    ).toEqual({ id: "a", value: "2026-01-01T00:00:00.000Z" });
  });

  it("rejects malformed, wrong-resource, wrong-scope, and stale-query cursors", () => {
    expect(() =>
      parseBoundCursor({
        cursor: "not+base64",
        query,
        resource: "clients",
        scope,
        sortBy: "createdAt",
        sortDirection: "asc",
      }),
    ).toThrow(invalidCursorError());

    const cursor = buildCursorPage({
      items: [
        { id: "a", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "b", createdAt: "2026-01-02T00:00:00.000Z" },
      ],
      limit: 1,
      query,
      resource: "clients",
      scope,
      sortBy: "createdAt",
      sortDirection: "asc",
      getLast: (item) => ({ id: item.id, value: item.createdAt }),
    }).pageInfo.nextCursor;

    for (const override of [
      { resource: "fuel-suppliers" },
      {
        scope: {
          ...scope,
          companyId: "00000000-0000-4000-8000-000000000099",
        },
      },
      { query: { ...query, search: "bia" } },
    ]) {
      expect(() =>
        parseBoundCursor({
          cursor: cursor ?? undefined,
          query: override.query ?? query,
          resource: override.resource ?? "clients",
          scope: override.scope ?? scope,
          sortBy: "createdAt",
          sortDirection: "asc",
        }),
      ).toThrow(invalidCursorError());
    }
  });
});
