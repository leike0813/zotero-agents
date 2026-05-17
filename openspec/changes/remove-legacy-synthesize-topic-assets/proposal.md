# Remove Legacy Synthesize Topic Assets

## Summary

Remove the legacy single `synthesize-topic` skill and workflow now that topic
synthesis is split into `create-topic-synthesis` and `update-topic-synthesis`.
Keep the host-side apply hook by moving it to a neutral synthesis-layer hooks
location shared by the two current workflows.

## Motivation

The old mode-driven `synthesize-topic` assets are no longer valid entrypoints.
Keeping them published creates ambiguity in workflow loading, Workbench routing,
and skill discovery. The deprecated shared `topic-synthesis-runtime` package is
also no longer a supported runtime dependency because create/update skills now
carry package-local runtime scripts.

## Scope

- Move the shared topic synthesis applyResult hook out of the legacy workflow
  directory.
- Update create/update topic synthesis workflows to use the moved hook.
- Remove legacy `synthesize-topic` workflow and skill assets from builtin
  manifests and registry-visible directories.
- Remove deprecated `topic-synthesis-runtime`.
- Update active tests/specs to describe create/update topic synthesis
  workflows instead of the removed single workflow.

## Out of Scope

- Changing topic synthesis persistence semantics.
- Changing Workbench UI layout.
- Changing create/update skill runtime behavior.
