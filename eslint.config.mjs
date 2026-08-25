import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // OpenNext と wrangler が吐く生成物。lint の対象にすると数千件の指摘が出る
    ".open-next/**",
    ".wrangler/**",
    // wrangler types が生成する。手で直さないので lint しない
    "cloudflare-env.d.ts",
  ]),
]);

export default eslintConfig;
