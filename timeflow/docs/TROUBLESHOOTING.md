# Troubleshooting Guide

This guide provides solutions to common issues encountered in TimeFlow.

---

## UI and Component Errors

### Problem: Categories page is blank or crashes

**Symptoms**:
The `/categories` page is blank and a React error is shown in the browser's developer console:
```
Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
```

**Cause**:
This error typically happens when a component is imported incorrectly. For example, trying to use a named import for a component that was exported as a default, or vice-versa. It can also happen if a component file doesn't export anything at all. The issue is likely within the `apps/web/src/app/categories/page.tsx` file or a component it imports.

**Solution**:
1.  **Investigate Imports**: Check all `import` statements in `apps/web/src/app/categories/page.tsx`.
2.  **Verify Exports**: Ensure that all components being imported (e.g., `ColorPicker`, `Layout`) have a correct `export` statement in their respective files.
3.  **Check for Mismatches**: Correct any mismatches between default and named imports/exports (e.g., change `import { MyComponent } from './MyComponent'` to `import MyComponent from './MyComponent'` if it uses a default export).
4.  This issue needs to be investigated and fixed by a developer.

---
Last Updated: 2025-12-05
