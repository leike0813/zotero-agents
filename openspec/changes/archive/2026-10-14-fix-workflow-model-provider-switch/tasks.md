# Tasks

## 1. Shared selection and host actions

- [x] 1.1 Preserve ACP UI provider and build model enums from UI options; verify provider-only descriptor regression tests.
- [x] 1.2 Implement shared explicit-provider first-model transition and wire both hosts; verify roundtrip tests cover raw identifiers, save/read/execute, no candidates and unchanged reasoning.
- [x] 1.3 Bind submit descriptor completions to their initiating draft; verify delayed refresh cannot overwrite newer choices.
- [x] 1.4 Document switching and ordinary-refresh behavior in workflow settings SSOT and AGENTS.md; check consistency with the delta specification.

## 2. Provider and field behavior

- [x] 2.1 Keep valid explicit SkillRunner providers authoritative over old model prefixes; verify public normalization/profile tests reject unavailable model selections.
- [x] 2.2 Preserve unset/unavailable ACP control values without changing generic defaults; verify both Preact surfaces using actual field interactions and real settings projections.

## 3. Integration acceptance

- [x] 3.1 Run affected UI, Dashboard, provider-profile and SkillRunner catalog tests, plugin/page TypeScript checks, changed-file lint/format checks and strict OpenSpec validation; record results.

## Validation

- Node regression command below: 149 passing. The suites cover real provider catalogs/descriptors, field clicks, Dashboard save, confirmed values, delayed replies and confirmation before the provider echo.
- `node node_modules/typescript/bin/tsc --noEmit -p <config>`: passed for `tsconfig.json`, `tsconfig.dashboard.json`, `tsconfig.sidebar.json` and `tsconfig.synthesis.json`.
- ESLint and Prettier checks on changed source/tests, Prettier on change artifacts, `git diff --check`, and `openspec validate fix-workflow-model-provider-switch --strict`: passed.
- RED evidence: provider-only ACP drafts reverted to anthropic; first-model selection retained the old model; late replies published a mixed snapshot; quick confirmation carried the old model; SkillRunner old prefixes changed the explicit provider; an empty provider model list accepted unknown models; identical model names prevented submit-dialog echo adoption. Each corresponding behavioral test passed after its fix.
- No dependency installation, branch change, commit, XPI build or real Zotero acceptance was performed.

```powershell
node --import tsx node_modules/mocha/bin/mocha tests/dashboard/242-dashboard-workflow-options.test.ts tests/dashboard/250-dashboard-workflow-settings-dialog.test.ts tests/ui/35-workflow-settings-execution.test.ts tests/ui/50-workflow-settings-dialog-model.test.ts tests/runtime/181-provider-profile-selection.test.ts tests/runtime/33-provider-backend-registry.test.ts tests/skillrunner/36-skillrunner-model-catalog.test.ts tests/shared/customSelect.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --reporter dot --exit
```

## Workflow follow-up

- Review the uncommitted change before separately requested archive or commit.
