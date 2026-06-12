# Change: Fix Literature Deep Reading Renderer Parity

## Summary

Repair the `literature-deep-reading` workflow and skill output so real ACP runs match the validated DETR sample behavior. The workflow must preserve source bundle image bytes and collect sidecar artifacts best-effort. The skill runtime must normalize corrupt bundle data and render the final self-contained HTML with paragraph-aligned bilingual reading, dynamic section guidance, local math rendering, structured references, and interactive citation graph behavior.

## Motivation

An ACP run showed source bundle images were written as zero-byte files and digest/references/citation-analysis artifacts were not collected. The generated HTML also diverged from the reviewed DETR sample: translations were not paragraph-aligned, the reading guide was static, LaTeX was not pre-rendered, citation graph behavior was static and visually inconsistent, references fell back to raw Markdown, and citation clues were not visible.

## Scope

- Harden `source_bundle.zip` byte handling and diagnostics.
- Collect digest, references, and citation-analysis sidecars from inline or embedded workbench payloads.
- Treat zero-byte bundle images as corrupt/missing in runtime views.
- Parameterize the DETR sample renderer behavior in the built-in skill.
- Preserve existing agent-facing payload schemas.
- Add focused workflow, runtime, and browser regression coverage.

## Out of Scope

- No new workflow or skill stage.
- No changes to agent-facing payload schema.
- No browser-side force layout fallback for citation graphs.
- No dependency on remote CDN or Host Bridge at final HTML runtime.
