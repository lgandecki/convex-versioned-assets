import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      provider: "v8",
      include: ["src/component/**/*.ts"],
      exclude: [
        "src/component/**/*.test.ts",
        "src/component/_generated/**",
        "src/component/test.setup.ts",
      ],
      reporter: ["text", "json-summary", "json"],
    },
  },
});
