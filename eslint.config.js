import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import importX from "eslint-plugin-import-x";
import nPlugin from "eslint-plugin-n";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import prettierConfig from "eslint-config-prettier/flat";

const nodeConfigFiles = ["vite.config.ts", "eslint.config.js"];

export default tseslint.config(
  { ignores: ["dist", "data", "node_modules"] },
  {
    // The browser app itself. n's Node-runtime checks (deprecated APIs,
    // process.exit, require() resolution, Node version support) don't
    // apply here, so only its package.json-hygiene rules are kept.
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      unicorn.configs.recommended,
      sonarjs.configs.recommended,
    ],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: "latest", globals: globals.browser },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      n: nPlugin,
    },
    settings: {
      "import-x/resolver": { typescript: true },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // These are React Compiler readiness checks; this project doesn't use
      // the compiler, so they'd just flag ordinary manual-memoization code.
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/gating": "off",
      "react-hooks/config": "off",
      "react-hooks/unsupported-syntax": "off",
      "react-hooks/incompatible-library": "off",

      // False positives on packages with esModuleInterop-style default
      // exports (e.g. react, react-dom/client); tsc already catches
      // genuine default-import mistakes.
      "import-x/default": "off",
      "import-x/no-named-as-default-member": "off",

      // Catches importing a package that isn't declared in package.json;
      // useful for any bundled app, not just Node runtime code. Everything
      // else n offers (require()/process.exit()/deprecated Node APIs/Node
      // version support) doesn't apply to browser code, so it's left off
      // here and only enabled below for the actual Node config files.
      "n/no-extraneous-import": "error",
      "n/no-extraneous-require": "error",

      // Filenames follow the existing PascalCase (components) / camelCase
      // (everything else) convention, not unicorn's default kebab-case.
      "unicorn/filename-case": "off",
      // Overly rigid for this codebase's style.
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-null": "off",
      "unicorn/numeric-separators-style": "off",

      // The engine's core month-by-month projection function is
      // irreducibly branchy (job loss, second income, HSA, PMI, mortgage
      // payoff, etc. all interact in one pass). Satisfying this would mean
      // a large, risky rewrite of financial calculation code well beyond a
      // lint-tooling change; flagged separately rather than done blind.
      "sonarjs/cognitive-complexity": "off",
    },
  },
  {
    // Test files hand-verify exact computed values (see invariants.test.ts
    // and projection.test.ts's doc comments) and compare exact migrated
    // values byte-for-byte; both patterns are deliberate here, not the
    // fragile-test smells these rules otherwise catch.
    files: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    rules: {
      "sonarjs/no-trivial-assertions": "off",
      "sonarjs/no-floating-point-equality": "off",
    },
  },
  {
    // Tooling config that actually runs under Node: the full n recommended
    // set (deprecated APIs, process.exit misuse, resolution, etc.) applies.
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      nPlugin.configs["flat/recommended"],
    ],
    files: nodeConfigFiles,
    languageOptions: { ecmaVersion: "latest", globals: globals.node },
  },
  prettierConfig,
);
