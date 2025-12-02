// Root ESLint flat config for TimeFlow monorepo
// Apps and packages can extend/override this as needed.

import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "**/*.d.ts"]
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off"
    }
  }
);


