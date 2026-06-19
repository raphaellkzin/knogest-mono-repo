# Cursor Pagination

**Status:** Proposed canonical contract. Do not ship a paginated module until the shared helpers, types, validation, Swagger schema, and authenticated request context are aligned with this document.

## Applicability

Every endpoint that powers a table or returns a potentially unbounded collection must use cursor pagination.

The only exception is a fixed, immutable system catalog with a documented hard maximum of 100 records. This exception overrides the table rule only when users cannot create records in that catalog and the module documents the bound.

## Request Contract

```http
GET /api/v1/employees?limit=25&cursor=<opaque-cursor>&search=ana&sortBy=name&sortDirection=asc
```

Canonical query parameters:

- `limit`: optional integer from 1 to 100; defaults to 25.
- `cursor`: optional unpadded Base64URL string returned by the previous response; maximum 2048 characters.
- `search`: optional trimmed search term; maximum 120 characters. Modules define its normalization and searchable fields.
- `sortBy`: optional module-allowlisted field; each module documents its default.
- `sortDirection`: optional `asc` or `desc`; each module documents its default.
- Module-specific filters are allowed only through an explicit Zod allowlist.

Changing search, filters, `sortBy`, or `sortDirection` invalidates the cursor. Clients must restart from the first page. Changing only `limit` does not invalidate it.

## Response Contract

The pagination payload lives inside the standard HTTP response envelope:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "5f20b2ac-fd84-4a55-98ac-d901ddc05642",
        "name": "Ana Souza"
      }
    ],
    "pageInfo": {
      "hasNextPage": true,
      "nextCursor": "eyJ2IjoxLC4uLn0"
    }
  }
}
```

Rules:

- Inner `data` is always an array, including when no records match.
- `pageInfo.hasNextPage` is always present.
- `pageInfo.nextCursor` is an opaque string when another page exists and `null` otherwise.
- Do not return a total count by default. Counts require a separate, explicitly justified query.
- Do not expose `prevCursor`. The web client keeps loaded pages for backward navigation.

The list handler returns `successHandlerResponse({ data, pageInfo })`. Only the controller applies the outer `{ success, message, data }` HTTP envelope through `jsonResponse`.

## Cursor Format

Encode UTF-8 JSON with unpadded Base64URL, never standard Base64. Clients treat the result as opaque.

The shared cursor decoder must validate one strict, versioned representation equivalent to:

```ts
const cursorPayloadSchema = z
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
```

Dates use ISO 8601 strings and decimals use normalized decimal strings in `last.value`. Paginated sort fields must be non-nullable. A module that needs nullable ordering must first extend this shared contract with explicit null placement semantics.

## Query And Scope Binding

`queryHash` is the lowercase SHA-256 hex digest of canonical JSON built from the validated query after defaults are applied, excluding only `cursor` and `limit`.

Canonical JSON rules:

1. Recursively sort object keys lexicographically.
2. Omit `undefined` values; preserve explicit `null` when a filter allows it.
3. Serialize dates as UTC ISO 8601 and decimals as normalized decimal strings.
4. Preserve array order by default. Modules must sort an array before hashing when that filter is semantically order-insensitive.
5. Hash the UTF-8 bytes of `JSON.stringify(canonicalValue)` with SHA-256.

`scopeHash` uses the same canonicalization and hashing algorithm over:

- Every trusted authenticated scope used by the module, as defined by its authentication and tenancy contract.
- Every validated path parameter that identifies the listed parent resource.

Scope values never come from the cursor. The server recomputes `scopeHash` from trusted request context and validated path parameters, then compares it with the cursor. This prevents replay against another tenant, company, parent resource, or route instance.

Reject cursors with invalid length or Base64URL syntax, decoding or JSON errors, unsupported schema versions, wrong resource, scope mismatch, query mismatch, unsupported sorting, or invalid boundary values with `400 Bad Request`.

## Deterministic Boundaries

Every ordering appends unique `id` as its final tie-breaker. For a non-null primary sort field `s`, resume after `(lastS, lastId)` with:

```text
ASC:  s > lastS OR (s = lastS AND id > lastId)
DESC: s < lastS OR (s = lastS AND id < lastId)
```

Apply the same direction to the primary field and `id`. When `id` is the only sort field, use only the corresponding `id > lastId` or `id < lastId` boundary.

Prefer immutable sort fields such as `createdAt` and `id`. Pagination over mutable fields provides best-effort traversal: concurrent inserts, deletes, or changes to the active sort value may move records between pages. Each list module must test insertion, deletion or soft deletion, duplicate primary sort values, and mutation of any allowlisted mutable sort field between page requests.

## Query Execution

Handlers fetch `limit + 1` rows. The extra row determines `hasNextPage`; it is not returned to the client.

```text
controller -> validate query -> service -> list handler -> Prisma -> response
```

Layer responsibilities:

- **DTO:** strictly validates pagination query keys, values, module filters, and allowlisted sorting.
- **Controller:** applies `validateQuery`, declares success and `400` Swagger responses, and forwards authenticated context.
- **Service:** enforces list-specific business rules without parsing persistence details.
- **Handler:** validates and decodes the cursor, applies every authenticated scope required by the module, applies soft-delete filters only when the model implements that policy, performs the deterministic query, and builds the next cursor.

Tenant-aware modules additionally follow `TENANCY.md`. The pagination contract does not invent authentication fields: corporation, company, or other scopes may be required only after their trusted request-context contract exists.

Canonical `400` response:

```json
{
  "success": false,
  "message": "Validation error",
  "data": {}
}
```

Paginated controllers must expose this response in Swagger. Shared query validation must produce the same envelope through `jsonResponse.error`.

## Implementation Gate

The current code is only a partial foundation and is incompatible with this contract:

- `cursor-pagination.ts` uses standard Base64, accepts arbitrary decoded JSON, and has no scope/query binding.
- `swaggerSchemas.ts` exposes flat pagination metadata instead of `pageInfo` and does not include the required `400` response.
- `handler.dto.ts` types `nextCursor` as an object while the cursor utility returns a string.
- `zodResolver.ts` query validation does not currently use the documented error envelope.
- Authentication currently exposes only `userId`; tenant/company scopes require their own documented and implemented request context before tenant-aware lists ship.

Align the shared implementation and add contract tests before creating the first paginated module controller. Do not create module-local cursor formats or response adapters.
