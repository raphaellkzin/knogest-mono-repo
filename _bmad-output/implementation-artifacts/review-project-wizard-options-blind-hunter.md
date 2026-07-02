# Blind Hunter Review Prompt

Use the `bmad-review-adversarial-general` skill. Review only the diff below. You have no product specification, conversation context, or repository access. Report concrete defects introduced by the diff, with severity and the affected hunk. Do not report style preferences.

```diff
diff --git a/main-web-app/src/features/projects/projects.server.ts b/main-web-app/src/features/projects/projects.server.ts
@@
-          state: "active",
@@
-          state: "active",
@@
-      label: item.displayName,
+      label: item.name,
@@
-      label: item.displayName,
+      label: item.name,

diff --git a/main-web-app/src/lib/api/api-client-error.ts b/main-web-app/src/lib/api/api-client-error.ts
new file mode 100644
+export class ApiClientError extends Error {
+  status?: number;
+  data?: unknown;
+  code?: string;
+
+  constructor({
+    data,
+    message,
+    status,
+  }: {
+    data?: unknown;
+    message: string;
+    status?: number;
+  }) {
+    super(message);
+    this.name = "ApiClientError";
+    this.status = status;
+    this.data = data;
+    this.code =
+      data &&
+      typeof data === "object" &&
+      "code" in data &&
+      typeof data.code === "string"
+        ? data.code
+        : undefined;
+  }
+}

diff --git a/main-web-app/src/lib/api/server-client.ts b/main-web-app/src/lib/api/server-client.ts
@@
+import { ApiClientError } from "./api-client-error";
+export { ApiClientError };
@@
-export class ApiClientError extends Error {
-  // Previous implementation accepted `cause` and called super(message, { cause }).
-}
@@
       throw new ApiClientError({
-        cause: error,
         data: error.response?.data,
         message: getErrorMessage(error),
         status: error.response?.status,
       });

diff --git a/main-web-app/src/lib/api/api-client-error.test.ts b/main-web-app/src/lib/api/api-client-error.test.ts
new file mode 100644
+// Two Vitest cases assert canonical metadata/code extraction and `cause === undefined`.
```
