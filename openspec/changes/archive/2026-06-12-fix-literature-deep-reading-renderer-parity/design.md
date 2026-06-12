# Design: Literature Deep Reading Renderer Parity

## Source Bundle Integrity

The workflow ZIP writer will normalize all byte-like values before writing entries. It must support `Uint8Array`, `ArrayBuffer`, typed-array/DataView values, arrays, and strings. Markdown image bundling will record byte count and a best-effort SHA-256 hash when WebCrypto is available. A copied image with zero bytes is treated as corrupt and remains referenced in diagnostics rather than being marked available.

Sidecar artifacts are resolved from the target parent notes by note kind and payload type. The resolver first tries embedded workbench payload attachments, then falls back to inline payload blocks. Available payloads are written into `artifacts/` and listed in `artifact-manifest.json`; missing or undecodable artifacts are diagnostic-only.

## Runtime Views

Runtime image views only expose data URIs for non-empty files. Empty files become `status: "corrupt"` and contribute diagnostics. References continue to prefer `artifacts/references.json`; Markdown references remain a fallback and are explicitly marked as such.

## Renderer

The final renderer uses the DETR sample as the visual and interaction baseline. The runtime embeds the same self-contained data contract, CSS, and JS behavior, adapted to generic Stage 00-40 views.

Body reading blocks before References are rendered as paragraph-level `aligned-block-pair` rows. Original and translated blocks share a `block_id` and section anchor, so compare mode aligns each natural paragraph at the top. Summary, References, Citation Graph, and Extensions are full-width post-reading sections.

The right reading guide is driven by scroll position through `IntersectionObserver`, with mouse hover as a secondary update path. It renders section Q&A before citation clues, and resolves referenced IDs against the structured references view.

Math is rendered locally in the final HTML. The runtime emits stable math HTML wrappers for inline and display math; the final HTML does not load KaTeX or any CDN.

Citation graph rendering consumes only the Host Bridge layout coordinates. Hover/select styling, labels, legend, filters, and detail drawer follow the DETR sample rules. The renderer never computes a replacement force layout.

## Compatibility

The change keeps existing runtime commands and payload schemas. Existing runs without sidecars still complete, but the final HTML shows fallback references and diagnostics remain available in result JSON.
