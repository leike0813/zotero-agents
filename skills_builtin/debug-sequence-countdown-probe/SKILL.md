---
name: debug-sequence-countdown-probe
description: Debug-only ACP sequence probe step that runs a 2-minute countdown script before producing a structured result with handoff verification.
---

# Debug Sequence Countdown Probe

This skill is only for Zotero Agents debug workflows. Do not write Zotero items,
notes, preferences, or external files. Use the current working directory as the
ACP run workspace.

Read the provided `input` and `parameter` values from the run prompt. Produce a
single JSON object on stdout.

## Procedure

Follow these steps in order:

### 1. Handoff verification (skip for the first step)

If `input.handoff` exists (i.e. this is step `bravo` or `charlie`):

- Verify that `input.handoff.step_id` is present.
- Verify that `input.handoff.marker` is present and starts with the expected
  previous step id followed by a hyphen (e.g. step `bravo` expects a marker
  starting with `alpha-`; step `charlie` expects a marker starting with
  `bravo-`).
- Record the verification outcome in `handoff_checks`.

If `input.handoff` is absent (i.e. this is the first step `alpha`), skip this
phase and set `handoff_checks` to an empty array.

### 2. Countdown

Run a 2-minute (120-second) countdown script via bash. The script must print
one line per second in the format `Countdown: Ns remaining` where N counts down
from 120 to 1. Example:

```bash
for i in $(seq 120 -1 1); do echo "Countdown: ${i}s remaining"; sleep 1; done; echo "Countdown complete!"
```

Wait for the script to finish before proceeding.

### 3. Produce result

After the countdown completes, generate a single JSON object on stdout with the
following fields:

- `kind`: always `"debug_countdown_probe_result"`.
- `step_id`: copy from `parameter.step_id`.
- `status`: `"ok"` if all handoff checks passed (or there were none); otherwise
  `"failed"`.
- `marker`: a string in the format `<step_id>-<unix-timestamp-ms>` that uniquely
  identifies this step's execution.
- `previous_marker`: the `marker` value received from `input.handoff`, or `null`
  if this is the first step.
- `countdown_seconds`: `120`.
- `countdown_completed`: `true`.
- `handoff_checks`: array of check objects from phase 1.
- `checks`: array summarising all checks performed in this step.
- `diagnostics`: array of diagnostic objects (may be empty).

Return JSON matching `assets/output.schema.json`.
