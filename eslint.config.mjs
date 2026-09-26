// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "apps/web/vite.config.ts",
      "apps/web/vitest.config.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Guardrail: kode mesin tidak boleh dirender apa adanya ke UI.
      // Kolom action/resource/approverRoleCode berasal dari backend sebagai kode
      // (mis. AUTH.LOGIN_SUCCESS, PROCUREMENT_MANAGER) dan wajib dilewatkan
      // humanizer dari @aec/ui (labelAction / labelResource / labelRole).
      // Sengaja membatasi ke properti ini saja agar tidak menandai .code yang
      // sering berisi kode bisnis sah (mata uang, nomor akun).
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXElement > JSXExpressionContainer > MemberExpression[property.name='action']",
          message: "Jangan render kode aksi mentah. Pakai labelAction() dari @aec/ui.",
        },
        {
          selector: "JSXElement > JSXExpressionContainer > MemberExpression[property.name='resource']",
          message: "Jangan render resource mentah. Pakai labelResource() dari @aec/ui.",
        },
        {
          selector: "JSXElement > JSXExpressionContainer > MemberExpression[property.name='approverRoleCode']",
          message: "Jangan render role code mentah. Pakai labelRole() dari @aec/ui.",
        },
      ],
    },
  },
  {
    files: ["apps/api/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/web/**/*.test.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.vitest },
    },
  },
);
