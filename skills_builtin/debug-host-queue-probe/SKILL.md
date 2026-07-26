---
name: debug-host-queue-probe
description: Debug-only probe that immediately returns a fixed result for Host queue management testing.
---

# Debug Host Queue Probe

This skill is only for Zotero Agents debug workflows.
Do not write Zotero items, notes, preferences, or external files.

Return one JSON object matching `assets/output.schema.json` as the final output.
Set `ok` to `true` and include the current Unix timestamp in `completed_at`.
