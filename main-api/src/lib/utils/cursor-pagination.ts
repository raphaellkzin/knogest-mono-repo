import { createHash } from "node:crypto";

import { z } from "zod";

import { AppError } from "./appError";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export const cursorPayloadSchema = z
  .object({
    v: z.literal(1),
    resource: z.string().min(1).max(64),
    scopeHash: z.string().regex(/^[a-f0-9]{64}$/),
    queryHash: z.string().regex(/^[a-f0-9]{64}$/),
    sortBy: z.string().min(1).max(64),
    sortDirection: z.enum(["asc", "desc"]),
    last: z
      .object({
        value: z.union([z.string().max(512), z.number().finite(), z.boolean()]),
        id: z.string().min(1).max(128),
      })
      .strict(),
  })
  .strict();

export type CursorPayload = z.infer<typeof cursorPayloadSchema>;
export type SortDirection = CursorPayload["sortDirection"];
export type CursorBoundary = CursorPayload["last"];

export interface PageInfo {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface CursorPage<T> {
  data: T[];
  pageInfo: PageInfo;
}

function normalizeForCanonicalJson(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeForCanonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .flatMap(([key, nested]) => {
          const normalized = normalizeForCanonicalJson(nested);
          return normalized === undefined ? [] : [[key, normalized]];
        }),
    );
  }
  return value;
}

export function hashCanonicalValue(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeForCanonicalJson(value)), "utf8")
    .digest("hex");
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(cursorPayloadSchema.parse(payload)), "utf8")
    .toString("base64url")
    .replace(/=+$/u, "");
}

export function decodeCursor(cursor: string): CursorPayload {
  if (
    cursor.length === 0 ||
    cursor.length > 2048 ||
    !BASE64URL_PATTERN.test(cursor) ||
    cursor.includes("=")
  ) {
    throw invalidCursorError();
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    if (Buffer.from(decoded, "utf8").toString("base64url") !== cursor) {
      throw invalidCursorError();
    }
    return cursorPayloadSchema.parse(JSON.parse(decoded));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalidCursorError();
  }
}

export function invalidCursorError(): AppError {
  return new AppError({
    code: "VALIDATION_ERROR",
    message: "Invalid cursor",
    statusCode: 400,
  });
}

export function parseBoundCursor({
  cursor,
  query,
  resource,
  scope,
  sortBy,
  sortDirection,
}: {
  cursor?: string;
  query: unknown;
  resource: string;
  scope: unknown;
  sortBy: string;
  sortDirection: SortDirection;
}): CursorBoundary | null {
  if (!cursor) return null;
  const payload = decodeCursor(cursor);
  const expectedScopeHash = hashCanonicalValue(scope);
  const expectedQueryHash = hashCanonicalValue(query);

  if (
    payload.resource !== resource ||
    payload.scopeHash !== expectedScopeHash ||
    payload.queryHash !== expectedQueryHash ||
    payload.sortBy !== sortBy ||
    payload.sortDirection !== sortDirection
  ) {
    throw invalidCursorError();
  }

  return payload.last;
}

export function buildCursorPage<T>({
  items,
  limit,
  query,
  resource,
  scope,
  sortBy,
  sortDirection,
  getLast,
}: {
  items: T[];
  limit: number;
  query: unknown;
  resource: string;
  scope: unknown;
  sortBy: string;
  sortDirection: SortDirection;
  getLast: (item: T) => CursorBoundary;
}): CursorPage<T> {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;
  const lastItem = data.at(-1);
  return {
    data,
    pageInfo: {
      hasNextPage,
      nextCursor:
        hasNextPage && lastItem
          ? encodeCursor({
              v: 1,
              resource,
              scopeHash: hashCanonicalValue(scope),
              queryHash: hashCanonicalValue(query),
              sortBy,
              sortDirection,
              last: getLast(lastItem),
            })
          : null,
    },
  };
}
