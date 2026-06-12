## Design Source

This change implements the first phase of:

- `artifact/literature-deep-reading-workflow-design.md`
- `artifact/literature-deep-reading-skill-runtime-contract.md`

The phase is intentionally limited to the skill package and `stage_00_bootstrap`. It does not make the workflow user-visible and does not generate `result/deep-reading.html`.

## Source and Render Boundary

`skills_src/literature-deep-reading/` is the editing source. The generated built-in package under `skills_builtin/literature-deep-reading/` is render output and should not become the long-term editing surface.

The renderer copies:

- `SKILL.md`
- `scripts/deep_reading_runtime.py`
- `assets/runner.json`
- `assets/input.schema.json`
- `assets/parameter.schema.json`
- `assets/output.schema.json`

The generated package is self-contained: runtime execution must not import or read `skills_src/`.

## Single-Script Runtime

The first-phase runtime exposes one agent-facing CLI:

```text
python scripts/deep_reading_runtime.py bootstrap --input runtime/input.json
python scripts/deep_reading_runtime.py status
python scripts/deep_reading_runtime.py validate-bootstrap
```

There is no `gate.py + stage_runtime.py` split. Future stages may add subcommands to the same script, but should not introduce a second agent-facing execution entrypoint.

`bootstrap` performs deterministic work only:

- resolve and unzip `source_bundle.zip`;
- read `source.md`, `source-manifest.json`, and optional artifact manifests;
- parse Markdown headings, blocks, image references, tables, formulas, and References boundary;
- initialize `runtime/literature-deep-reading.sqlite`;
- write bootstrap views under `runtime/views/`;
- write `literature-deep-reading.result.json` as the first-phase business result.

## Bootstrap Scope

Markdown parsing is conservative and deterministic. It is sufficient to prove stable block ids, section anchors, image mapping, and References boundary detection. It is not a full academic Markdown renderer and does not attempt semantic enrichment.

PDF fallback is diagnostic-only in this phase. A bundle without `source.md` can be recorded as `pdf_fallback`, but high-quality PDF text extraction is deferred.

## Non-Goals

- No workflow registration or workflow package manifest update.
- No `buildRequest` hook for source bundle materialization.
- No Host Bridge calls.
- No context request, reference digest collection, concept overlay, translation, reading enrichment, or final self-contained HTML.

