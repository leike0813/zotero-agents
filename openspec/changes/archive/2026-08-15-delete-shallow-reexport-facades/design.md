## Context

`acpSkillRunDashboardFacade.ts` is a one-line re-export used only by dynamic
imports. `workflowSelectionPolicy.ts` re-exports two trigger-policy functions,
but only `canWorkflowRunWithoutSelection` has callers. `synthesisWorkbenchDialog.ts`
remains a deliberate compatibility alias pinned by source-level tests and is out
of scope.

## Goals / Non-Goals

**Goals:**

- Remove zero-depth modules whose interface exactly mirrors implementation.
- Preserve dynamic import timing and all owning-module exports.
- Rename imported module variables so they match the owning module.

**Non-Goals:**

- Removing `requiresWorkflowSelection` from `triggerPolicy.ts`.
- Touching `synthesisWorkbenchDialog.ts` or its source-contract test.
- Changing bundle-splitting, capability behavior, or public call surfaces.

## Decisions

### Dynamic imports target the owning store directly

Host bridge and hooks replace `import("./...acpSkillRunDashboardFacade")` with
direct dynamic imports of `acpSkillRunStore`. Local variables are renamed from
`acpSkillRunDashboard`/`acpSkillRuns` to `acpSkillRunStore`; the returned
`acpSkillRuns` object key remains unchanged.

### Static selection imports target triggerPolicy directly

All six `canWorkflowRunWithoutSelection` callers import `workflows/triggerPolicy`
with the correct relative path. The unused `requiresWorkflowSelection` export
stays in the owning module.

### Source-contract test pins the shape

A source-contract test asserts both facade files are absent and the import sites
contain direct owning-module paths. This mirrors existing source-assertion tests
and prevents the facades from reappearing.

## Risks / Trade-offs

- [Source assertions are brittle] -> They only assert import targets and file absence, not formatting or unrelated code.
- [Dynamic import bundle behavior changes] -> The previous facade already pulled the owning module when loaded; direct import preserves lazy timing and reduces one module hop.
- [Other shallow aliases remain] -> Only test-pinned or deliberate compatibility aliases stay; the preventive spec stops new one-line facades.

## Migration Plan

Add the failing source-contract test, migrate the nine import sites, delete the
two facade files, run focused integration suites and type checks, then archive
the OpenSpec change. Rollback is restoring the two files and reverting import paths.
