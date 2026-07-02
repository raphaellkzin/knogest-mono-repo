# Blind Hunter Review Prompt

Use the `bmad-review-adversarial-general` skill. Review only this diff; do not inspect the repository, specification, or conversation.

```diff
diff --git a/main-api/src/modules/projects/projects.controller.ts b/main-api/src/modules/projects/projects.controller.ts
@@
-    success: { const: false },
+    success: { type: "boolean", const: false },
@@
-  properties: { success: { const: true }, message: { type: "string" }, data },
+  properties: {
+    success: { type: "boolean", const: true },
+    message: { type: "string" },
+    data,
+  },
diff --git a/main-api/src/modules/commercial/commercial.controller.ts b/main-api/src/modules/commercial/commercial.controller.ts
@@
-              success: { const: true },
+              success: { type: "boolean", const: true },
diff --git a/main-api/artifacts/openapi.json b/main-api/artifacts/openapi.json
@@ affected Fuel Types and Projects response schemas (10 replacements)
-                    "success": { "enum": [true or false] },
+                    "success": { "type": "boolean", "enum": [true or false] },
```
