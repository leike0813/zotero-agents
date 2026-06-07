---
name: debug-sequence-probe-finalize
description: Debug-only ACP sequence probe step that summarizes previous probe checks.
---

# Debug Sequence Probe Finalize

This skill is only for Zotero Skills debug workflows. Do not write Zotero items,
notes, preferences, or external files. Use the current working directory as the
ACP run workspace.

Read the provided `input` and `parameter` values from the run prompt. Produce a
single JSON object on stdout.

Rules:

1. Set `probe_id` from `parameter.probe_id`.
2. Read previous check data from `input.handoff` when present.
3. If `input.handoff.status` is `failed`, return `status: "failed"`.
4. If `parameter.expected_sentinel` is provided, check
   `parameter.sentinel_path` under the current working directory using the same
   present/absent semantics as `debug-sequence-probe-check`.
5. Return `status: "ok"` only if all checks pass.
6. Include the previous step checks and finalizer checks in `checks`.
7. Return JSON matching `assets/output.schema.json`.
