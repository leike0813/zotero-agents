## 1. Workflow Protocol

- [x] Allow buildRequest-driven `skillrunner.sequence.v1` manifests without static steps.
- [x] Add simple workflow parameter `visible_if` support to settings descriptors/dialogs.
- [x] Expose sequence per-step provider results and apply contexts to applyResult hooks.

## 2. Literature Workbench

- [x] Extract reusable tag-regulator request helper logic.
- [x] Convert `literature-digest` manifest to ACP `skillrunner.sequence.v1`.
- [x] Add literature-digest sequence buildRequest for one-step/two-step execution.
- [x] Extend literature-digest applyResult to apply digest-only and digest+tag sequence results.

## 3. Verification

- [x] Add focused schema/runtime tests.
- [x] Add focused literature-digest/tag-regulator sequence tests.
- [x] Run focused mocha tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run `openspec validate`.
