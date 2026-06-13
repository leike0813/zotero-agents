# Namespace ACP Runner Files in Reused Workspaces

## Summary

ACP SkillRunner-compatible runs currently use fixed runner-owned files such as
`result/result.json` and `.audit/input_manifest.json`. When sequence steps reuse
one workflow workspace, later steps can overwrite earlier step result and audit
files.

This change gives every ACP skill run an internal provider-side file namespace
under the shared workspace:

- `result/<skillId>.n/result.json`
- `.audit/<skillId>.n/input_manifest.json`

The namespace is derived from the requested skill id and a per-workspace
1-based counter. Host/workflow request protocols do not gain new fields; the
existing `resultJsonPath` and `inputManifestPath` records continue to carry the
actual absolute paths.

## Why

- Preserve reusable ACP workflow workspaces without losing earlier step outputs.
- Keep runner-owned result envelope ownership separate from package fallback
  files.
- Avoid exposing provider-internal namespace allocation as a workflow authoring
  concern.

## Impact

- ACP runner workspace preparation, run records, prompt text, and docs.
- No workflow schema, Host Bridge CLI, or apply-result interface change.
