# Change: Render Literature Deep Reading Final HTML

## Summary

Implement `stage_40_final_review_and_render` for the built-in `literature-deep-reading` skill. This stage accepts a lightweight final review payload, aggregates the existing runtime views, and renders a fully self-contained `result/deep-reading.html`.

The renderer uses the debugged DETR sample artifact as the UI and interaction template source. This change does not add a workflow.

## Motivation

Stages 00, 10, 20, and 30 now produce source structure, Host context, reading analysis views, and block translations. The skill still lacks the final reader artifact. The DETR sample already established the desired seamless-reader layout and interactions, so this stage should migrate that template into the runtime instead of redesigning the UI.

## Scope

- Add the Stage 40 `final-review.json` schema.
- Extend `scripts/deep_reading_runtime.py` with `submit-final-review` and `validate-final-output`.
- Add local renderer template assets derived from the DETR sample structure.
- Generate `result/sections/sections.json`, `source-images.json`, `diagnostics.json`, `deep-reading.html`, `final-output.candidate.json`, and `deep-reading-manifest.json`.
- Inline CSS, JavaScript, JSON data, and images into `deep-reading.html`.
- Update built-in package generation and focused tests.

## Out of Scope

- No user-visible workflow.
- No source bundle construction hook.
- No Zotero UI entrypoint.
- No external CDN dependencies.
- No browser-side force layout recomputation.
