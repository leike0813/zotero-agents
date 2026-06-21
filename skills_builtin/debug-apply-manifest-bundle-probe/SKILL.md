---
name: debug-apply-manifest-bundle-probe
description: Debug-only apply contract probe that emits an artifact manifest for Zotero workflow apply bundle tests.
---

# Debug Apply Manifest Bundle Probe

This skill is only for Zotero Skills debug workflows.
Use the current working directory as the run workspace.

Read `parameter.workflow_id`, `parameter.step_id`, and `parameter.run_key`.
Create `result/manifest-artifacts/debug-apply-artifact.txt` with a short text payload that includes those three values.
Create `result/debug-apply-artifacts.json` as a flat JSON object:

```json
{
  "debug_apply_artifact": "result/manifest-artifacts/debug-apply-artifact.txt"
}
```

Return a single JSON object matching `assets/output.schema.json` as the final output.
The output must include `artifact_manifest_path: "result/debug-apply-artifacts.json"` and must not include `artifact_path`.
