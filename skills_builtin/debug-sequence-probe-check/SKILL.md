---
name: debug-sequence-probe-check
description: Debug-only ACP sequence probe step that validates handoff and workspace sentinel expectations.
---

# Debug Sequence Probe Check

This skill is only for Zotero Skills debug workflows. Do not write Zotero items,
notes, preferences, or external files. Use the current working directory as the
ACP run workspace.

Read the provided `input` and `parameter` values from the run prompt. Produce a
single JSON object on stdout.

Rules:

1. Set `probe_id` from `parameter.probe_id`.
2. Check handoff presence:
   - If `parameter.expect_handoff_present` is true, `input.handoff` must exist.
   - If `parameter.expect_handoff_present` is false, `input.handoff` must be
     absent.
3. Check public marker:
   - Prefer `input.public_marker` when present.
   - Otherwise read `input.handoff.public_marker` when `input.handoff` exists.
   - Compare it with `parameter.expected_public_marker` when provided.
4. Check secret marker:
   - If `parameter.forbid_secret_marker` is true, `input.secret_marker` and
     `input.handoff.secret_marker` must both be absent.
   - Otherwise compare the discovered secret marker with
     `parameter.expected_secret_marker` when provided.
5. Check sentinel:
   - Use `parameter.sentinel_path` when provided.
   - If `parameter.expected_sentinel` is `present`, that file must exist under
     the current working directory.
   - If it is `absent`, that file must not exist.
6. Return `status: "ok"` only if all checks pass. Otherwise return
   `status: "failed"` and include failing checks in `checks` and `diagnostics`.
7. Return JSON matching `assets/output.schema.json`.
