# Design: Final Review and Self-Contained Renderer

## Template Source

The runtime renderer SHALL parameterize the structure and interactions from the DETR sample:

- `artifact/literature-deep-reading-detr-sample/result/deep-reading.html`
- `artifact/literature-deep-reading-detr-sample/result/assets/deep-reading.css`
- `artifact/literature-deep-reading-detr-sample/result/assets/deep-reading.js`
- `artifact/literature-deep-reading-detr-sample/result/sections/sections.json`

The skill package stores local template assets under `renderer/templates/`, and generated built-in packages copy them into the package. The implementation may simplify details for v1, but it must keep the same reader surfaces: navigation, concept rail, mode switch, preface, paper flow, translation paper, summary, structured references, citation graph, extensions, and digest modal.

## Runtime Flow

```text
runtime/views/*.json
runtime/payloads/final-review.json
        |
        v
python scripts/deep_reading_runtime.py submit-final-review --payload runtime/payloads/final-review.json
        |
        v
result/deep-reading.html
```

The HTML is self-contained. Runtime writes debug JSON files under `result/sections/`, but the HTML uses only its inline data.

## Payload

`final-review.json` contains:

- `overall_assessment`: `ready`, `ready_with_notes`, or `needs_revision`
- `quality_observations[]`: `severity`, `kind`, `block_id`, `section_anchor`, `message`

The runtime owns deterministic checks, final paths, manifest values, and render status.

## Rendering Behavior

The renderer aggregates:

- source structure and reading blocks
- image manifest and source images
- analysis views
- translation view
- citation graph snapshot and layout
- final review observations

References and later post-reading content remain full width. Body reading blocks use block ids for original/translation alignment. Citation graph nodes render only when layout coordinates exist; otherwise the graph area shows a degraded state. No fake graph layout is generated.

## Output

`literature-deep-reading.result.json` returns `kind: "literature_deep_reading_finalized"`, `status: "completed"`, `final_html_available: true`, and `html_path: "result/deep-reading.html"`.
