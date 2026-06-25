---
name: debug-apply-result-probe
description: Debug-only apply contract probe that returns a direct JSON result for Zotero workflow apply tests.
---

# Debug Apply Result Probe

This skill is only for Zotero Agents debug workflows.
Do not write Zotero items, notes, preferences, or external files.

Read `parameter.workflow_id`, `parameter.step_id`, and `parameter.run_key`.
Return one JSON object matching `assets/output.schema.json` as the final output.
Set `tag` to `debug-result:<run_key>` unless `parameter.tag` is provided.
