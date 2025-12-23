import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
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
    "next-env.d.ts",
    // Utility scripts
    "test-query.js",
    "check-clickhouse-data.js",
    "debug-snapshot-storage.js",
    "diagnose-duplicates.js",
    "test-snapshot-api.js",
    "check-max-depths.js",
    "check-total-sessions.js",
    "test-new-query.js",
    "test-scroll-query-updated.js",
    "test-scroll-query.js",
  ]),
]);

export default eslintConfig;
