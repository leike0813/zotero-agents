# Design: Stage 20 Analysis Layer Views

## Runtime Flow

Stage 20 runs after `stage_00_bootstrap` and `stage_10_source_reading_context_request`.

```text
runtime/views/source-*.json
runtime/views/*host context*.json
runtime/payloads/reading-enrichment.json
        |
        v
python scripts/deep_reading_runtime.py submit-reading-enrichment --payload runtime/payloads/reading-enrichment.json
        |
        v
runtime/views/*analysis layer*.json
runtime/literature-deep-reading.sqlite
literature-deep-reading.result.json
```

The CLI remains a single script. There is no `gate.py` / `stage_runtime.py` split.

## Agent Payload

The Stage 20 payload is a semantic writing payload. It contains only fields the agent can author from reading the paper and the runtime views:

- `preface_title`
- `preface_cards`
- `preface_reading_path`
- `preface_goal`
- `preface_concepts`
- `preface_warnings`
- `preface_questions`
- `section_notes`
- `concepts`
- `reference_digest_notes`
- `summary_fallback_enabled`
- `summary_fallback_sections`
- `extensions`

The runtime owns validation, normalization, view paths, timestamps, persistence state, and diagnostics.

## View Normalization

`preface-view.json` combines the `preface_*` payload fields with available topic, graph, and concept context. User-facing text is taken from agent-authored fields or normalized labels; internal graph role hints are not surfaced verbatim.

`section-insights-view.json` is keyed by source section anchors. Questions appear before citation notes in the data model so the later renderer can make them the primary sidebar element.

`concept-overlay-view.json` merges Host concept candidates with agent concepts. A concept is interactive only when it has a resolved concept record. Section-side keywords that cannot be resolved are retained with `status: "keyword_only"` so later renderers can display them without pretending they are overlay concepts.

`references-view.json` combines the references seed, Stage 10 reference bindings, Stage 10 reference digests, and agent reference notes. Digest modal data is exposed only for library-bound references with available digest markdown.

`summary-view.json` prefers the target paper `artifacts/digest.md` sidecar. Agent fallback summary sections are consumed only when no digest artifact is available.

`extensions-view.json` contains only agent-authored post-reading extensions.

## Persistence

Stage 20 reuses `payload_submissions` and adds or ensures:

- `concepts`
- `section_insights`

The agent never writes SQLite directly.

## Failure and Degradation

Invalid section anchors, invalid reference ids, empty concept labels, or malformed payload shape fail submission. Missing Host context views, missing target digest artifacts, or unavailable reference digest artifacts degrade to diagnostics and partial Analysis Layer views.
