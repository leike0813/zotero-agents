# Design

## Runtime Entry

Each generated package exposes one execution CLI:

```text
scripts/gate.py --db runtime/topic-synthesis.sqlite
scripts/gate.py --db runtime/topic-synthesis.sqlite --action run
scripts/gate.py --db runtime/topic-synthesis.sqlite --action submit --payload <payload>
```

Omitting `--action` is equivalent to `--action gate`. The gate writes
`runtime/gate-transcript/*.json`, and every run/submit action writes SQLite
receipts.

## Create Flow

`create-topic-synthesis-prepare` owns runtime setup, topic context, resolver
cascade, paper workset, paper triage, cross-paper context, and prepare handoff.
Stage 20 calls Host Bridge through package-local runtime code and writes
resolver, citation metrics, and artifact export manifests from the locked
run root.

`topic-synthesis-core-enrichment` verifies the prepare handoff, records core
synthesis, materializes concept/relation/topic sidecars, and writes the core
handoff.

`topic-synthesis-finalize` verifies the core handoff, records coverage and
summary payloads, and materializes `result/topic-analysis.json` plus
`result/final-output.candidate.json`.

## Boundaries

The implementation borrows the legacy runtime responsibilities but does not
call or copy the legacy monolithic scripts at execution time. Generated package
scripts remain self-contained and do not import `skills_src`.

The first implementation pass focuses on create. Update remains a rendered
schema/gate skeleton and is not promoted as an end-to-end runtime path.
