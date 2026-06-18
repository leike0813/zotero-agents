# Design

## Packet boundary

Packets are runtime-owned views under `runtime/views/`. They are not
agent-authored payloads and do not require new submission schemas. Their purpose
is to make each stage handoff small, deterministic, and easy to resume.

Every packet includes:

- `schema_version`
- `stage_id`
- `payload_path`
- `submit_command`
- `validate_command`
- `required_next_action`
- `summary`
- `work_items`
- `diagnostics_summary`
- `trace_paths`

`summary`, `work_items`, and `diagnostics_summary` contain only deterministic
counts, identifiers, short titles, statuses, and file paths. They must not
contain full paper text, full block arrays, full translation views, graph
models, or rendered HTML.

## Generation points

- Bootstrap writes `stage-10-agent-packet.json` after the bootstrap views and
  result JSON are written.
- Stage 10 writes `stage-20-agent-packet.json` after Host context views are
  materialized.
- Stage 20 writes `stage-30-translation-worklist.json` after translation batch
  preparation or translator-alignment reuse.
- Stage 30 writes `stage-40-review-packet.json` after the translation view and
  translation diagnostics are materialized.

## Validation

Each `validate-*` command checks the packet that should exist at that point:

- `validate-bootstrap` checks `stage-10-agent-packet.json`.
- `validate-context-request` checks `stage-20-agent-packet.json`.
- `validate-reading-enrichment` checks `stage-30-translation-worklist.json`.
- `validate-block-translations` checks `stage-40-review-packet.json`.

If a packet is missing or invalid JSON, validation fails like other missing
runtime views.

## Instruction contract

The skill instructions define a strict gate:

1. Write only the current stage payload.
2. Run the matching submit command.
3. Immediately run the matching validate command.
4. If validation fails, repair only the current payload and repeat this stage.
5. Continue to the next stage only after validation returns `ok: true`.

Stage instructions use the packet as the default read surface. Larger runtime
views remain in `trace_paths` and are read only when needed to inspect evidence
or repair a payload.
