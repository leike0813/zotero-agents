# Design

## Contract

`source_paper_refs` is the canonical paper reference list in topic-level
sections. `source_papers` is the runtime/Host materialized source paper table.

Complete topic synthesis artifacts contain `source_papers` instead of legacy
evidence sections. Each `source_paper_refs` value must point to a
`source_papers[].paper_ref`.

## Runtime

Finalize materialization writes `result/sections/source-papers.json` and keeps
section references as `source_paper_refs`. Runtime fallbacks must not bind
missing references to the first workset paper. Missing references remain empty
unless a fallback section naturally describes the whole workset.

## Host

Host manifest and artifact validation use the current source paper contract.
Topic detail DTOs expose `source_papers`; markdown export renders source paper
metadata as readable text when useful.

## Skill Instruction Surface

Generated skill docs describe only the current execution model and field names.
Historical field cleanup is covered by repository tests and Host validation, not
by skill prose or runtime submit behavior.
