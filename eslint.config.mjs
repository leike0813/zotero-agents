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
    name: "zotero-agents/sidebar-import-boundary",
    files: ["src/sidebar/**/*.js"],
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
              regex: "^(?!(\\./|\\.\\./shared/|([^/]+/)*src/shared/)).+$",
              message:
                "Sidebar page bundles may only import same-directory relative paths or src/shared/** modules.",
            },
          ],
        },
      ],
      "no-unused-vars": ["error", { caughtErrorsIgnorePattern: "^_" }],
    },
  },
];
