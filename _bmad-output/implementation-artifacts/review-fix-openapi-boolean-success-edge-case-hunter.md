# Edge Case Hunter Review Prompt

Use the `bmad-review-edge-case-hunter` skill. Review the complete change since baseline `55ee5f43ae29518cb062a285aa96e54ea295223c` by running:

```sh
git diff 55ee5f43ae29518cb062a285aa96e54ea295223c -- main-api/src/modules/projects/projects.controller.ts main-api/src/modules/commercial/commercial.controller.ts main-api/artifacts/openapi.json
```

Use repository access only to resolve code directly referenced by those hunks. Return only the skill's required JSON array.
