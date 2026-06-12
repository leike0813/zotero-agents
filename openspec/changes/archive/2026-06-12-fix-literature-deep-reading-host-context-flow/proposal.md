# Fix Literature Deep Reading Host Context Flow

## Why

Real ACP runs show related failures in `literature-deep-reading`: the workflow can miss generated digest/references/citation-analysis sidecars, Stage 10 asks the agent for a context request before exposing Host information, Stage 20 creates `keyword_only` concepts after the agent has already submitted enrichment, and Stage 30 accepts lazy or source-copied translations.

## What Changes

- Prefer Host `readPaperArtifacts` when constructing the workflow source bundle, with note payload parsing retained only as fallback.
- Run a best-effort Host preflight during bootstrap so the agent can inspect target paper artifacts, reference-index rows, topic candidates, and concept needs before writing `context-request.json`.
- Consume the existing `topics.find_by_paper_ref` capability to produce `topic-candidates-view.json`; use a single candidate automatically and require `selected_topic_id` when candidates are ambiguous.
- Normalize current Host Bridge return shapes for `reference-index get`, `concepts query`, and `paper-artifacts export-filtered`.
- Keep unresolved reading-aid terms as plain keywords instead of turning them into interactive concepts after the agent payload is submitted.
- Add generic Stage 30 translation quality gates for copied source text, placeholders, suspiciously short translations, repeated template translations, target-script mismatch, and broken table structure.

## Impact

- Affected specs: `literature-deep-reading-skill`, `literature-deep-reading-workflow`.
- Affected source: `skills_src/literature-deep-reading/`, generated `skills_builtin/literature-deep-reading/`, and `workflows_builtin/literature-workbench-package/`.
- Agent-facing payload schemas remain flat; Stage 10 adds only `selected_topic_id` for ambiguous Host topic candidates.
