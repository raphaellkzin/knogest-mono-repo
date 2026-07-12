# Blind Hunter Review Prompt

Use the `bmad-review-adversarial-general` skill. Review only the diff below. Do not inspect the repository, specification, history, or conversation. Find at least ten concrete issues or improvements, then return only a Markdown list of finding descriptions.

## Diff

```diff
diff --git a/main-api/artifacts/openapi.json b/main-api/artifacts/openapi.json
index 6eaef2a..9937d49 100644
--- a/main-api/artifacts/openapi.json
+++ b/main-api/artifacts/openapi.json
@@ -1957,7 +1957,7 @@
                   "type": "object",
                   "required": ["success", "message", "data"],
                   "properties": {
-                    "success": { "enum": [true] },
+                    "success": { "type": "boolean", "enum": [true] },
                     "message": { "type": "string" },
                     "data": {
                       "type": "array",
@@ -5195,7 +5195,7 @@
                   "type": "object",
                   "required": ["success", "message", "data"],
                   "properties": {
-                    "success": { "enum": [true] },
+                    "success": { "type": "boolean", "enum": [true] },
                     "message": { "type": "string" },
                     "data": {
                       "type": "object",
@@ -5224,7 +5224,7 @@
                     "requestId"
                   ],
                   "properties": {
-                    "success": { "enum": [false] },
+                    "success": { "type": "boolean", "enum": [false] },
                     "code": { "type": "string" },
                     "message": { "type": "string" },
                     "details": {
@@ -5252,7 +5252,7 @@
                     "requestId"
                   ],
                   "properties": {
-                    "success": { "enum": [false] },
+                    "success": { "type": "boolean", "enum": [false] },
                     "code": { "type": "string" },
                     "message": { "type": "string" },
                     "details": {
@@ -5280,7 +5280,7 @@
                     "requestId"
                   ],
                   "properties": {
-                    "success": { "enum": [false] },
+                    "success": { "type": "boolean", "enum": [false] },
                     "code": { "type": "string" },
                     "message": { "type": "string" },
                     "details": {
@@ -5308,7 +5308,7 @@
                     "requestId"
                   ],
                   "properties": {
-                    "success": { "enum": [false] },
+                    "success": { "type": "boolean", "enum": [false] },
                     "code": { "type": "string" },
                     "message": { "type": "string" },
                     "details": {
@@ -5368,7 +5368,7 @@
                   "type": "object",
                   "required": ["success", "message", "data"],
                   "properties": {
-                    "success": { "enum": [true] },
+                    "success": { "type": "boolean", "enum": [true] },
                     "message": { "type": "string" },
                     "data": {
                       "type": "object",
@@ -5429,7 +5429,7 @@
                     "requestId"
                   ],
                   "properties": {
-                    "success": { "enum": [false] },
+                    "success": { "type": "boolean", "enum": [false] },
                     "code": { "type": "string" },
                     "message": { "type": "string" },
                     "details": {
@@ -5467,7 +5467,7 @@
                   "type": "object",
                   "required": ["success", "message", "data"],
                   "properties": {
-                    "success": { "enum": [true] },
+                    "success": { "type": "boolean", "enum": [true] },
                     "message": { "type": "string" },
                     "data": {
                       "type": "object",
@@ -5510,7 +5510,7 @@
                     "requestId"
                   ],
                   "properties": {
-                    "success": { "enum": [false] },
+                    "success": { "type": "boolean", "enum": [false] },
                     "code": { "type": "string" },
                     "message": { "type": "string" },
                     "details": {
diff --git a/main-api/src/modules/commercial/commercial.controller.ts b/main-api/src/modules/commercial/commercial.controller.ts
index ac131ab..c74d577 100644
--- a/main-api/src/modules/commercial/commercial.controller.ts
+++ b/main-api/src/modules/commercial/commercial.controller.ts
@@ -458,7 +458,7 @@ export const v1CommercialController = async (app: FastifyInstance) => {
             type: "object",
             required: ["success", "message", "data"],
             properties: {
-              success: { const: true },
+              success: { type: "boolean", const: true },
               message: { type: "string" },
               data: {
                 type: "array",
diff --git a/main-api/src/modules/projects/projects.controller.ts b/main-api/src/modules/projects/projects.controller.ts
index 4f68dbe..27bf7b6 100644
--- a/main-api/src/modules/projects/projects.controller.ts
+++ b/main-api/src/modules/projects/projects.controller.ts
@@ -11,7 +11,7 @@ const errorSchema = {
   type: "object",
   required: ["success", "code", "message", "details", "requestId"],
   properties: {
-    success: { const: false },
+    success: { type: "boolean", const: false },
     code: { type: "string" },
     message: { type: "string" },
     details: { type: "object", nullable: true, additionalProperties: true },
@@ -21,7 +21,11 @@ const errorSchema = {
 const successSchema = (data: object) => ({
   type: "object",
   required: ["success", "message", "data"],
-  properties: { success: { const: true }, message: { type: "string" }, data },
+  properties: {
+    success: { type: "boolean", const: true },
+    message: { type: "string" },
+    data,
+  },
 });
 const projectItemSchema = {
   type: "object",
diff --git a/main-api/tests/app.test.ts b/main-api/tests/app.test.ts
index e5b82ef..8188fc3 100644
--- a/main-api/tests/app.test.ts
+++ b/main-api/tests/app.test.ts
@@ -52,4 +52,49 @@ describe("app", () => {
 
     expect(spec.paths).toHaveProperty("/api/v1/auth/login");
   });
+
+  it.each([
+    ["post", "/api/v1/projects", "201", true],
+    ["post", "/api/v1/projects", "400", false],
+    ["post", "/api/v1/projects", "409", false],
+    ["post", "/api/v1/projects", "413", false],
+    ["post", "/api/v1/projects", "429", false],
+    ["get", "/api/v1/projects", "200", true],
+    ["get", "/api/v1/projects", "400", false],
+    ["get", "/api/v1/projects/{projectId}", "200", true],
+    ["get", "/api/v1/projects/{projectId}", "404", false],
+    ["get", "/api/v1/fuel-types", "200", true],
+  ] as const)(
+    "documents %s %s response %s success as boolean %s",
+    (method, path, status, success) => {
+      type Operation = {
+        responses?: Record<
+          string,
+          {
+            content?: {
+              "application/json"?: {
+                schema?: {
+                  properties?: {
+                    success?: { type?: string; enum?: unknown[] };
+                  };
+                };
+              };
+            };
+          }
+        >;
+      };
+
+      const spec = app.swagger();
+      const paths = spec.paths as Record<
+        string,
+        Record<string, Operation> | undefined
+      >;
+      const successSchema =
+        paths[path]?.[method]?.responses?.[status]?.content?.[
+          "application/json"
+        ]?.schema?.properties?.success;
+
+      expect(successSchema).toEqual({ type: "boolean", enum: [success] });
+    },
+  );
 });

diff --git a/_bmad-output/implementation-artifacts/spec-fix-works-boolean-openapi-contract.md b/_bmad-output/implementation-artifacts/spec-fix-works-boolean-openapi-contract.md
new file mode 100644
index 0000000..7be6279
--- /dev/null
+++ b/_bmad-output/implementation-artifacts/spec-fix-works-boolean-openapi-contract.md
@@ -0,0 +1,75 @@
+---
+title: 'Fix Works boolean OpenAPI response contracts'
+type: 'bugfix'
+created: '2026-07-07'
+status: 'in-review'
+baseline_commit: '55ee5f44a53f0d8b22cb32cd3d45a545d8824429'
+context:
+  - '{project-root}/_bmad-output/planning-artifacts/architecture.md'
+  - '{project-root}/_bmad-output/implementation-artifacts/spec-project-wizard-options-safe-api-errors.md'
+---
+
+<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">
+
+## Intent
+
+**Problem:** Opening `/home/obras` fails while parsing the successful `GET /api/v1/projects` response because the API returns the boolean `success: true`, but its incomplete OpenAPI schema makes Kubb generate `z.enum(["true"])`. The same defect affects every Project response and the `GET /api/v1/fuel-types` success response loaded in parallel by the page, so fixing only the first generated validator would expose another failure.
+
+**Approach:** Correct the canonical Fastify response schemas by declaring the existing boolean discriminators with both `type: "boolean"` and `const`, regenerate the OpenAPI artifact and local Kubb client, and add contract regression coverage for every affected response.
+
+## Boundaries & Constraints
+
+**Always:** Keep Fastify route schemas as the contract source of truth; preserve the existing JSON response envelopes and boolean runtime values; cover Project success and error responses plus the Fuel Type success response; regenerate artifacts through the repository scripts; keep generated clients server-only.
+
+**Ask First:** Any runtime payload change, API version change, Kubb dependency/configuration change, broad response-schema refactor, or modification outside the affected Project and Fuel Type contracts.
+
+**Never:** Manually edit `main-web-app/src/generated`; coerce strings or booleans in the frontend; weaken or bypass Zod parsing; introduce a handwritten duplicate transport type; change Project, Fuel Type, pagination, authentication, or Company-scope behavior.
+
+## I/O & Edge-Case Matrix
+
+| Scenario | Input / State | Expected Output / Behavior | Error Handling |
+|----------|---------------|----------------------------|----------------|
+| Works registry load | Authenticated Company workspace with any number of Projects | `GET /projects` returns `success: true`; generated Zod accepts the boolean and `/home/obras` continues loading | Existing API errors continue through `ApiClientError` |
+| Wizard catalog load | Fuel Types are loaded in parallel with registry options | `GET /fuel-types` returns and validates `success: true` as a boolean | Existing 401/403 contracts remain unchanged |
+| Project failures | Project create, list, or detail returns a documented error | OpenAPI describes `success: false` as a boolean for all affected statuses | Generated error types retain the false discriminator and canonical envelope |
+| Empty Projects | Project list data is empty | The response validates and the registry renders its existing empty state | No fabricated records or validation fallback |
+
+</frozen-after-approval>
+
+## Code Map
+
+- `main-api/src/modules/projects/projects.controller.ts` -- shared success and error response schemas used by all Project routes.
+- `main-api/src/modules/commercial/commercial.controller.ts` -- inline `GET /fuel-types` success schema used by Project wizard options.
+- `main-api/tests/app.test.ts` -- Fastify/Swagger contract regression tests.
+- `main-api/artifacts/openapi.json` -- committed canonical OpenAPI artifact consumed by Kubb.
+- `main-web-app/src/generated` -- ignored local Kubb output regenerated from the canonical artifact.
+
+## Tasks & Acceptance
+
+**Execution:**
+- [x] `main-api/src/modules/projects/projects.controller.ts` and `main-api/src/modules/commercial/commercial.controller.ts` -- add `type: "boolean"` beside the existing boolean `const` values without changing runtime handlers.
+- [x] `main-api/tests/app.test.ts` -- add table-driven assertions for the ten affected route/method/status response schemas, requiring the Swagger output to retain boolean `success` discriminators.
+- [x] `main-api/artifacts/openapi.json` -- regenerate from Fastify after source and tests are corrected.
+- [x] `main-web-app/src/generated` -- regenerate locally through Kubb and confirm affected Zod schemas use `z.literal(true/false)` rather than string enums.
+
+**Acceptance Criteria:**
+- Given the canonical Project and Fuel Type route schemas, when Swagger emits OpenAPI, then all ten affected responses declare `success.type` as `boolean` with the correct true or false enum value.
+- Given the regenerated OpenAPI artifact, when Kubb generates frontend validators, then Project list/detail/create and Fuel Type success validators accept the boolean envelopes returned by `jsonResponse`.
+- Given an authenticated user entering `/home/obras`, when registry and wizard options load concurrently, then no `ZodError` is raised for `success`.
+- Given generation and validation commands run twice, when drift checks compare the outputs, then the committed OpenAPI artifact is current and Kubb generation is reproducible.
+
+## Spec Change Log
+
+## Design Notes
+
+Fastify Swagger normalizes `const: true/false` into a one-value OpenAPI `enum`. Kubb needs the accompanying primitive `type: "boolean"` to select `z.literal(true/false)`; without it, Kubb 4.38.1 stringifies the enum for the Zod generator even though its TypeScript generator retains boolean values.
+
+## Verification
+
+**Commands:**
+- `pnpm exec vitest run tests/app.test.ts && pnpm typecheck && pnpm generate:openapi && pnpm check:openapi` from `main-api` -- expected: contract tests pass and the committed OpenAPI artifact has no drift.
+- `pnpm generate:api && pnpm validate:api && pnpm check:api && pnpm test && pnpm typecheck` from `main-web-app` -- expected: Kubb validators regenerate reproducibly and frontend checks pass.
+- `git diff --check` from the repository root -- expected: no whitespace errors.
+
+**Manual checks (when the authenticated local stack is available):**
+- Open `/home/obras` and confirm the registry and wizard options load without a `success`-path `ZodError`.

```

