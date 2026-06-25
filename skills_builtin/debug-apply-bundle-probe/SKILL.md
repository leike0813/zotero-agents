---
name: debug-apply-bundle-probe
description: Debug-only apply contract probe that writes a bundle result and artifact for Zotero workflow apply tests.
---

# Debug Apply Bundle Probe

This skill is only for Zotero Agents debug workflows.
Use the current working directory as the run workspace.

Read `parameter.workflow_id`, `parameter.step_id`, and `parameter.run_key`.
Create `result/debug-apply-artifact.txt` with a short text payload that includes those three values.
Return a single JSON object matching `assets/output.schema.json` as the final output;
`artifact_path` must be `result/debug-apply-artifact.txt`.
