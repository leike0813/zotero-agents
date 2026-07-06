## Context

The existing `mineru` workflow is a single-file `generic-http.steps.v1` pipeline: request an upload URL, upload one PDF, poll one result, download one zip, and materialize `full.md` plus `images/`. The workflow runtime already supports preflight replacement units with `single-apply` aggregates, so long-PDF support can stay workflow-local.

## Approach

- Add `hooks/preflight.js` to inspect the selected PDF and decide whether it needs page-range splitting.
- Add `hooks/buildRequest.js` to build the same Generic HTTP steps currently declared in `workflow.json`, with optional `files[0].page_ranges` for split units.
- Keep `provider: "generic-http"` and continue returning `generic-http.steps.v1`; do not extend the provider or generic request compiler.
- Update `hooks/applyResult.js` so single-bundle and aggregate-bundle paths both flow through one materialization helper.

## Split Planning

Preflight resolves the source attachment path from the selection context. It attempts PDF metadata extraction in this order:

1. A test/runtime helper hook if supplied through `runtime.helpers`, used for deterministic tests and future host integration.
2. Zotero/Firefox PDF.js module locations available in the Zotero runtime, to read page count and outline/bookmark destinations.
3. A dependency-free fallback that reads the PDF text enough to estimate page count from page objects/page tree counts. This fallback does not produce outline data.

If page count is unavailable, preflight returns `continue` with diagnostics. If page count is `<=200`, it returns `continue`. If page count is `>200`, it returns `replace-units` with an aggregate and ordered units. Each unit context includes `page_ranges`, `partIndex`, `partCount`, `pageStart`, `pageEnd`, and split diagnostics.

The split algorithm computes `partCount = ceil(pageCount / 200)` and a balanced target size. For each boundary, it chooses an outline/bookmark next-start page when that page is inside the allowed window, keeps the previous part at or below 200 pages, and looks like a chapter/section boundary by title or low outline level. Otherwise it uses the balanced boundary.

## Request And Apply

`buildRequest` emits the same four MinerU HTTP steps as the current manifest. When `preflight.context.page_ranges` is present, the upload URL request includes that page range in the one file descriptor. The binary upload remains the original source PDF.

`applyResult` detects `resultContext.aggregate.children`. For aggregate applies, it reads each child bundle in order, requires each `full.md`, copies all child `images/` entries into one staged `Images_<attachmentKey>/` directory, joins Markdown parts with exactly one blank line between non-empty parts, rewrites image paths once, and then replaces the final outputs. Staging completes before old outputs are removed so a failed merge does not leave partial files.

## Edge Cases

- Missing `full.md` in any child bundle fails the aggregate apply and preserves existing outputs.
- Missing `images/` is allowed for a child; the final image directory is only written if at least one child has images.
- Image names are kept flat because MinerU returns hash-named images; unexpected conflicting names fail during staging.
- A PDF above the API upload-size limit remains unsupported because page ranges do not reduce uploaded bytes.
