# Design: Literature Deep Reading Workflow

## Architecture

The workflow is intentionally thin:

1. `filterInputs` selects one source attachment per Zotero parent.
2. `buildRequest` materializes a `source_bundle.zip` and submits the existing skill.
3. The skill runs its internal stages and writes a self-contained HTML result.
4. `applyResult` attaches that HTML to the same Zotero parent.

The workflow does not duplicate skill stages or run semantic analysis itself.

## Source Selection

Source selection follows the literature workflow policy already used by `literature-digest`: prefer Markdown/MinerU source attachments, fall back to PDF when no Markdown source is available, and generate only one run unit per parent.

Unlike `literature-digest`, this workflow does not skip items that already have digest/references/citation-analysis notes. Those notes are optional sidecars for deep reading.

## Source Bundle

`source_bundle.zip` contains:

- `source.md` when Markdown is available.
- `original.pdf` when the workflow falls back to PDF.
- `images/` for local Markdown images copied from the source directory.
- `source-manifest.json` for source metadata, parameters, image manifest, sidecar availability, and diagnostics.
- `artifacts/` for optional decoded sidecar payloads:
  - `digest.md`
  - `references.json`
  - `citation_analysis.json`
  - `artifact-manifest.json`

Image copying is best effort. Remote, inline, missing, or path-escaping images remain in diagnostics and do not block the request.

## ACP Request

The workflow manifest uses `provider: "acp"` and submits a `skillrunner.job.v1` shaped request so the existing ACP preparation seam can map uploaded files into the skill input. The request input stays narrow:

```json
{
  "source_bundle_path": "<uploaded-source-bundle-path>"
}
```

`upload_files` carries the local absolute bundle path under the same key.

## Result Application

`applyResult` reads `result/deep-reading.html` from the result bundle, writes it to a local temporary file, and calls `runtime.hostApi.attachments.createFromPath` with `mimeType: "text/html"`.

The first version never overwrites existing deep-reading attachments. The created attachment title includes the paper title and a timestamp.

## Failure and Degradation

The source bundle builder records best-effort failures in diagnostics:

- missing Markdown images
- remote or inline images
- image paths outside the source directory
- missing or undecodable sidecar artifacts
- PDF fallback

Only the absence of a usable Markdown/PDF source or a missing final HTML artifact should fail the workflow.
