# Change: Restore Topic Synthesis Split Context View Generation

## Why

The split topic synthesis runtime currently materializes
`runtime/views/cross-paper-context.md` as a thin list of paper triage
`core_digest` values and writes `runtime/views/external-literature-context.md`
as a placeholder. This is a major regression from the legacy monolithic topic
synthesis skill, whose runtime built two distinct LLM-facing contexts from
resolver cascade outputs, filtered digests, references, citation analysis, graph
metrics, and paper triage.

The split runtime should keep the newer minimal contract, but it must restore
the useful context view generation quality.

## What Changes

- Replace split `write_prepare_views()` with deterministic context rendering
  based on runtime-owned SQLite/workspace sources.
- Generate a rich `cross-paper-context.md` for core synthesis using workset
  metadata, paper triage, citation graph metrics, and selected filtered digests.
- Generate `external-literature-context.md` for finalize using compact
  references and citation analysis reports, not placeholder text.
- Generate `cross-paper-context.manifest.json` with paths, selection constants,
  selected paper refs, and artifact availability only.
- Keep `source-paper-evidence-index.json`, enriched from triage, workset
  metadata, and digest locators.
- Update generated split skill packages from the suite source.

## Impact

This change does not switch workflows, revive the legacy monolithic skill, or
restore audit/hash/receipt contracts. It only restores content quality for
runtime-owned context views consumed by the split skills.
