# Tasks

- [x] Mark this change as superseded by the split-skill runtime completion
  change; do not use the existing artifact as the gate-truth baseline.

- [x] Create the OpenSpec change scaffold and delta spec.
- [x] Run read-only Zotero Bridge commands for the DETR seed.
- [x] Build the DETR playbook artifact with real intermediate runtime files.
- [x] Add schema-valid stage examples and handoff manifests.
- [x] Add focused tests for the playbook baseline.
- [x] Run focused Mocha test.
- [x] Run `npx tsc --noEmit` and record the existing unrelated failure in
  `src/modules/workflowExecution/sequenceRuntime.ts`.
- [x] Run strict OpenSpec validation.
- [x] Run targeted Prettier check.
