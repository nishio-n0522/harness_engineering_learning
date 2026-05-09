import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";

// あなたが書く ESLint 設定。
// fixtures/ 配下の bad.ts を、各 fixture の README に記載された件数だけ検出できるように。
export default defineConfig([
  globalIgnores([]),
  js.configs.recommended,
  {
    basePath: "../fixtures",
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {},
  },
]);
