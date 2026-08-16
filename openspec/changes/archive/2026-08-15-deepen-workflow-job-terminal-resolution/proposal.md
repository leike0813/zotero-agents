## Why

Workflow terminal interpretation is split between the run and apply seams. The
run seam imports a helper owned by the apply seam, then re-derives queue,
sequence, SkillRunner, and ACP fallbacks around it. This weakens locality,
leaves the two consumers vulnerable to semantic drift, and can leave terminal
observation waiting forever when an expected queue job is missing.

## What Changes

- Introduce one synchronous, read-only Workflow Job Terminal Resolution module
  shared by the run and apply seams.
- Resolve missing, pending, local-ready, and canonical-ready states from queue,
  sequence-root, SkillRunner, ACP, and apply evidence without accepting a
  caller-supplied request-id override.
- Preserve lifecycle-store write ownership, apply reduction, subscriptions,
  cleanup, and submission-slot status sampling in their current modules.
- Settle terminal observation for a missing queue job so the apply seam can
  report the existing explicit job-missing failure instead of waiting forever.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Require one terminal-resolution seam and define
  its evidence priority, readiness classes, and missing-job liveness behavior.

## Impact

- Adds a focused module under `src/modules/workflowExecution` and injects its
  resolver into the run and apply seams.
- Reuses the existing workflow-execution seam test suite for the resolution
  decision table and caller integration coverage.
- Updates the workflow execution architecture document and project glossary.
- Does not change persistence formats, lifecycle-store write ownership,
  workflow manifests, provider protocols, or subscription ownership.

## Post-hoc Disclosure

The landing commit (`fa962b39`) carried payload beyond this record's declared
Impact section:

- Host Bridge skill version bumps: `addon/content/host-bridge-skills/manifest.json`
  plus the seven `runner.json` assets under `addon/content/host-bridge-skills/`
  and their mirrors under `profiles/hermes/zotero-librarian/skills/`, and
  `profiles/hermes/zotero-librarian/distribution.yaml` (0.5.3→0.5.4 and
  0.5.4→0.5.5 lines).
- A citation-graph synthesis UI feature: Audit Aliases / Keep Alias /
  Remove Alias i18n keys in
  `skills_src/literature-deep-reading/renderer/templates/citation-graph-synthesis-i18n.json`
  and the rebuilt `citation-graph-synthesis-app.js` bundle.
- A `CONTEXT.md` note.

These changes were already effective on the shared branch when the omission was
identified during review, so the history was left intact and recorded here
instead. Release-material version bumps and unrelated features should ship in
their own declared changes, not ride a refactor commit.

