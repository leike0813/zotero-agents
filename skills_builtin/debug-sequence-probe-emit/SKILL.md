---
name: debug-sequence-probe-emit
description: Debug-only ACP sequence probe step that emits structured markers and optionally writes a workspace sentinel.
---

# Debug Sequence Probe Emit

This skill is only for Zotero Skills debug workflows. Do not write Zotero items,
notes, preferences, or external files. Use the current working directory as the
ACP run workspace.

Read the provided `input` and `parameter` values from the run prompt. Produce a
single JSON object on stdout.

Rules:

1. Set `probe_id` from `parameter.probe_id`.
2. Set `public_marker` from `parameter.public_marker`.
3. Set `secret_marker` from `parameter.secret_marker`.
4. If `parameter.write_sentinel` is true, create the relative file named by
   `parameter.sentinel_path` under the current working directory. Create parent
   directories as needed. The file content must be JSON containing `probe_id`,
   `public_marker`, `secret_marker`, and `sentinel_path`.
5. When a sentinel is created, set `artifact_path` to the absolute local path of
   that file.
6. Do not create a sentinel when `parameter.write_sentinel` is not true.
7. Return JSON matching `assets/output.schema.json`.

Output example:

```json
{
  "kind": "debug_sequence_probe_result",
  "probe_id": "linear",
  "status": "ok",
  "public_marker": "linear-public",
  "secret_marker": "linear-secret",
  "sentinel_path": "",
  "checks": [{ "name": "emit", "ok": true }],
  "diagnostics": []
}
```
