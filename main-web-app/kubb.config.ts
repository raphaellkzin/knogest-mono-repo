import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginClient } from "@kubb/plugin-client";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig({
  root: ".",
  input: {
    path: "../main-api/artifacts/openapi.json",
  },
  output: {
    path: "./src/generated",
    clean: true,
  },
  plugins: [
    pluginOas(),
    pluginTs({
      output: { path: "models" },
    }),
    pluginClient({
      output: { path: "clients" },
      dataReturnType: "data",
      importPath: "@/lib/api/server-client",
      parser: "zod",
      paramsType: "object",
    }),
    pluginZod({
      output: { path: "zod" },
    }),
  ],
});
