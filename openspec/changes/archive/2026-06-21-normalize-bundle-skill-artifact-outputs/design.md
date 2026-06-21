# Design

## Artifact Manifest Contract

The flat artifact manifest is a JSON object whose values are workspace-relative artifact paths:

```json
{
  "topic_analysis": "result/topic-analysis.json",
  "summary_section": "result/sections/summary.json"
}
```

Rules:

- The manifest MUST be a JSON object.
- Every value MUST be a non-empty string.
- Values MUST be workspace-relative paths.
- Values MUST NOT be absolute paths or contain `..` path traversal.
- Nested objects and arrays are invalid.

## Output Schema Roles

Output schemas mark path fields with existing Skill Runner-compatible annotations:

- Core artifact path: `x-type: "artifact"` plus a specific `x-role`.
- Flat manifest path: `x-type: "artifact"` plus `x-role: "artifact-manifest"`.

No new `x-type` value is introduced because the current schema meta-validation only accepts `artifact` and `file`.

## Compatibility

Topic synthesis apply resolves artifacts in this order:

1. Explicit legacy path field in the result bundle.
2. Path looked up from `artifact_manifest_path` using stable keys.
3. Existing fallback behavior for pre-split or no-context bundles.

New runtimes generate the manifest path, while old result bundles remain accepted.
