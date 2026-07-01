## Why

Host Bridge CLI has accumulated implementation-oriented top-level command groups
(`item`, `note`, `topics`, `citation-graph`, `paper-artifacts`, `task`,
`skill-run`, and others). This makes Hermes and the `zotero-librarian-profile`
depend on a wide and inconsistent command surface even though the underlying
Host Bridge endpoint and capability contracts are already stable.

The previous workflow-control work also introduced a two-level runtime handle
model (`workflowRunId` and `skillRunId`), but the CLI still exposes those
operations through legacy workflow/task/skill-run namespaces. That creates a
routing ambiguity for agents: workflow definition operations and runtime control
operations look like one command family.

## What Changes

- Upgrade the Rust `zotero-bridge` CLI by one minor version.
- Replace legacy top-level CLI namespaces with canonical task-oriented groups:
  `bridge`, `library`, `synthesis`, `workflow`, `run`, `mutation`, `file`,
  `debug`, and `call`.
- Keep Host Bridge REST endpoints and capability names unchanged.
- Move runtime control operations to `run`:
  `run get`, `run cancel`, `run list`, `run active`, and
  `run skill get|reply|connect`.
- Move Zotero library read operations under `library`, including
  `library items list`, `library item ...`, and `library note ...`.
- Move Synthesis read/cache commands under `synthesis`.
- Move write-capable mutation entrypoints under `mutation`.
- Remove legacy CLI aliases instead of preserving backward compatibility.
- Update the surface catalog, generated Host Bridge wrapper skill, generated
  profile references, topic synthesis generated skills, and all workflow skill
  instructions that invoke Host Bridge CLI.

## Out Of Scope

- Renaming Host Bridge capability names.
- Renaming Host Bridge REST endpoints.
- Adding watch, cursor event streams, transcript output, or advanced task-level
  cancellation.
- Publishing CLI prebuilds or updating external release repositories in this
  implementation change.

## Impact

- `cli/zotero-bridge`: CLI parser, dispatch, tests, and version metadata.
- `scripts/host-bridge-surface-catalog.ts`: canonical CLI mapping SSOT.
- `scripts/render-host-bridge-surface.ts` and
  `scripts/render-zotero-librarian-profile.ts`: generated surface output.
- `scripts/check-host-bridge-doc-sync.ts` and
  `scripts/check-zotero-librarian-profile.ts`: governance checks.
- `skills_src/topic-synthesis` and `skills_src/literature-deep-reading`:
  source instructions/runtime command invocation updates before rendering.
- `skills_builtin/*` and `profiles/hermes/zotero-librarian/*`: generated or
  profile-local instructions updated to canonical commands.
