// ESLint config for the web app (Next.js)
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    ignores: [".next/**", "node_modules/**", "dist/**"],
    plugins: {
      "@next/next": nextPlugin
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname
      }
    },
    settings: {
      next: {
        rootDir: ["./"]
      }
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/explicit-function-return-type": "off"
    }
  }
);
