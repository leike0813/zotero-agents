## Why

The Host Bridge CLI wrapper skill and the Zotero Librarian Hermes profile are
now generated from the Host Bridge surface catalog, Rust CLI mappings, and
workflow catalog. This keeps the command surface consistent, but the final
agent-facing artifacts are too mechanical: they list commands and payloads, yet
do not give agents enough semantic guidance for choosing a safe operating path.

The gap became more visible after workflow agent-run apply-back was added. Agents
now need to distinguish Host-owned workflow runs, agent-owned handoff runs, and
one-shot apply-back handles. A rendered command table alone does not explain
when to use `workflow submit`, `workflow agent-run`, `workflow agent-apply`, run
control endpoints, or local Zotero Librarian index helpers.

Non-rendered business logic can also escape canonical CLI governance. For
example, profile cron YAML can still contain stale top-level command namespaces
even when generated references are correct.

## What Changes

- Split Host Bridge agent guidance into a manually maintained semantic
  instruction layer and a generated surface layer.
- Render the two layers together into the published `zotero-bridge-cli` wrapper
  skill, host-bridge-cli-bundle contents, and Zotero Librarian profile.
- Add current-state-only semantic guidance for command selection, safety,
  workflow lifecycle, run control, agent-run handoff, and apply-back handles.
- Extend profile guidance so agents know when to use the local SQLite index,
  direct Host Bridge reads, workflow submit, workflow agent-run, and workflow
  agent-apply.
- Add checks that protect semantic sources, generated outputs, and profile cron
  YAML from stale CLI namespaces or historical protocol wording.
- Fix the Zotero Librarian attention-queue cron command to use the canonical
  synthesis namespace.

## Capabilities

### Modified Capabilities

- `host-bridge-cli-interface`: The wrapper skill becomes a composed artifact:
  semantic agent guidance plus generated command/capability mappings.
- `host-bridge-release-pipeline`: Release checks must render and validate both
  semantic and generated layers before publishing wrapper/profile bundles.
- `zotero-librarian-profile-distribution`: The profile gains explicit librarian
  operating principles and canonical CLI checks for cron/business logic.
- `topic-synthesis-skills`: Topic synthesis skills continue to depend on the
  wrapper skill as the Host Bridge CLI authority instead of copying full
  semantic guidance.

## Impact

- No Host Bridge REST API, capability name, or Rust CLI command behavior changes
  are introduced by this change.
- Published agent artifacts become richer without sacrificing SSOT governance.
- `workflow agent-apply` is documented as apply-back only, with `agentRunId` and
  `agentRequestId` kept separate from `workflowRunId` and `skillRunId`.
- Final skill/profile text remains current-state only and must not contain
  legacy/deprecated migration notes.
