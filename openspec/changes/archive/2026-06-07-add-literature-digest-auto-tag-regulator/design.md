# Design

`literature-digest` remains the user-facing workflow entrypoint. Its manifest
declares `provider: "acp"` and `request.kind: "skillrunner.sequence.v1"`.
The workflow uses a `buildRequest` hook because the step list depends on
`auto_tag_regulator`.

When automatic tagging is disabled, the hook emits a one-step sequence whose
final step is `digest`. The provider result is still a sequence result, but the
apply hook delegates to the existing digest apply implementation so observable
behavior stays compatible.

When automatic tagging is enabled, the hook prepares tag-regulator inputs before
execution: parent metadata, current tags, canonical Synthesis vocabulary, and a
temporary `valid_tags.yaml`. The digest step creates the workflow workspace and
returns `digest_path`. The tag step reuses that workspace and maps
`digest_path` to `input.digest_markdown`, so the tag skill reads the digest
artifact directly from the shared workspace.

Sequence execution records each step provider result in the final run result.
The UI-facing `responseJson.sequence` remains lightweight, while the in-memory
run result exposes an apply-only `sequence.steps[].result`. The apply seam
materializes per-step bundle readers and result contexts, then passes them to
`literature-digest` applyResult. The digest hook applies the digest step first
and, when present, calls the tag-regulator apply hook with the tag step context.

Parameter visibility is intentionally simple: workflow parameter schema supports
same-workflow boolean `visible_if` dependencies. Hidden parameters are UI-only;
runtime normalization still applies schema defaults so hooks can safely read
defaults.
