// @ts-check Let TS check this config file

import globals from "globals";
import zotero from "@zotero-plugin/eslint-config";

const projectIgnores = {
  name: "zotero-agents/project-ignores",
  ignores: [
    ".agents/**",
    "**/.agents/**",
    ".claude/**",
    "**/.claude/**",
    ".codex/**",
    "**/.codex/**",
    ".opencode/**",
    "**/.opencode/**",
    ".qwen/**",
    "**/.qwen/**",
    ".scaffold/**",
    "**/.scaffold/**",
    ".tmp_lit_bundle/**",
    "**/.tmp_lit_bundle/**",
    ".zotero-skills-runtime/**",
    "**/.zotero-skills-runtime/**",

    // Generated/bundled files
    "addon/content/**",
    "addon/locale/**",
    "skills_builtin/**",
    "skills_src/**",
    "workflows_builtin/**",

    // Openspec artifacts (proposals, designs, specs, tasks)
    "openspec/changes/**",
    "openspec/specs/**",

    // Documentation and reference payloads are governed by content checks.
    "doc/**",
    "reference/**",
    "site/**",
    "**/*.md",

    // Artifacts
    "artifact/**",
    "assets/**",
    "attachments/**",
    "deprecated/**",
    "mockup/**",
    "non-existing-zotero-data/**",
    "workflows/**",

    // Test fixtures
    "test/fixtures/**",
  ],
};

export default [
  projectIgnores,
  ...zotero({
    overrides: [
      {
        files: ["scripts/**/*.mjs"],
        languageOptions: {
          globals: {
            Buffer: "readonly",
            console: "readonly",
            process: "readonly",
            URL: "readonly",
            URLSearchParams: "readonly",
            TextDecoder: "readonly",
            TextEncoder: "readonly",
            setTimeout: "readonly",
            clearTimeout: "readonly",
          },
        },
      },
      {
        files: ["**/*.ts"],
        rules: {
          // We disable this rule here because the template
          // contains some unused examples and variables
          "@typescript-eslint/no-unused-vars": "off",
        },
      },
      {
        files: ["test/**/*.ts"],
        rules: {
          "mocha/consistent-spacing-between-blocks": "off",
          "mocha/no-mocha-arrows": "off",
          "mocha/no-setup-in-describe": "off",
          "mocha/no-top-level-hooks": "off",
          "mocha/max-top-level-suites": "off",
        },
      },
    ],
  }),
  {
    name: "zotero-agents/zotero-runtime-globals",
    files: ["src/**/*.ts"],
    ignores: ["src/sidebar/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "AbortController",
          message:
            "Use createCancellationController() for host-independent cancellation or resolveNativeAbortControllerConstructor() at native API boundaries.",
        },
      ],
    },
  },
  {
    name: "zotero-agents/sidebar-import-boundary",
    files: ["src/sidebar/**/*.{js,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex:
                "^(?!(\\./|(\\.{2}/)+shared/|([^/]+/)*src/shared/|preact|preact/hooks|preact/compat|@preact/signals)).+$",
              message:
                "Sidebar page bundles may only import same-directory relative paths, src/shared/** modules, or Preact entry points.",
            },
          ],
        },
      ],
      "no-unused-vars": ["error", { caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    name: "zotero-agents/sidebar-tsx",
    files: ["src/sidebar/**/*.tsx"],
    rules: {
      // Covered by @typescript-eslint/no-unused-vars; the base rule
      // double-reports and misfires on JSX automatic-runtime imports.
      "no-unused-vars": "off",
    },
  },
  {
    name: "zotero-agents/dashboard-import-boundary",
    files: ["src/dashboard/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex:
                "^(?!(\\./|(\\.{2}/)+shared/|([^/]+/)*src/shared/|preact|preact/hooks|preact/compat|@preact/signals)).+$",
              message:
                "Dashboard page bundles may only import same-directory relative paths, src/shared/** modules, or Preact entry points.",
            },
          ],
        },
      ],
      // The base rule misfires on function-type parameter names in .ts files;
      // the TS-aware variant covers both .ts and .tsx page sources here.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    name: "zotero-agents/dashboard-tsx",
    files: ["src/dashboard/**/*.tsx"],
    rules: {
      // Covered by @typescript-eslint/no-unused-vars; the base rule
      // double-reports and misfires on JSX automatic-runtime imports.
      "no-unused-vars": "off",
    },
  },
  {
    name: "zotero-agents/synthesis-import-boundary",
    files: ["src/synthesis/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex:
                "^(?!(\\./|(\\.{2}/)+shared/|([^/]+/)*src/shared/|preact|preact/hooks|preact/compat|@preact/signals)).+$",
              message:
                "Synthesis workbench page bundles may only import same-directory relative paths, src/shared/** modules, or Preact entry points.",
            },
          ],
        },
      ],
      // The base rule misfires on function-type parameter names in .ts files;
      // the TS-aware variant covers both .ts and .tsx page sources here.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    name: "zotero-agents/synthesis-tsx",
    files: ["src/synthesis/**/*.tsx"],
    rules: {
      // Covered by @typescript-eslint/no-unused-vars; the base rule
      // double-reports and misfires on JSX automatic-runtime imports.
      "no-unused-vars": "off",
    },
  },
  {
    name: "zotero-agents/synthesis-component-import-boundary",
    files: ["src/synthesis/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex:
                "^(?!(\\./|\\.\\./(?!\\.\\./)|(\\.{2}/)+shared/|preact(?:/|$))).+$",
              message:
                "Synthesis components may import page siblings, shared modules, or Preact.",
            },
          ],
        },
      ],
    },
  },
];
