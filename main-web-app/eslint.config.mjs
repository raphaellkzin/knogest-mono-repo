import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/stores/**/*.{ts,tsx}",
    ],
    ignores: ["src/app/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message:
                "Use Server Actions e o client server-only em src/lib/api/server-client.ts.",
            },
            {
              name: "@/lib/api/server-client",
              message:
                "O client da API externa é server-only e não deve ser usado em componentes.",
            },
          ],
          patterns: [
            {
              group: ["@/generated/clients", "@/generated/clients/*"],
              message:
                "Clients gerados pelo Kubb só podem ser usados em Server Actions ou código server-only.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Use Server Actions para chamar APIs externas.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "src/generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
