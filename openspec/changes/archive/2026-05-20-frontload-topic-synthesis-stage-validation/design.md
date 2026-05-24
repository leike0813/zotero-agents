# Design: Frontloaded Topic Synthesis Stage Validation

## Stage Ownership

Semantic validation is owned by the first stage that authors a content family:

- Stage 7 owns `taxonomy` and `timeline_events`.
- Stage 8 owns `positioning`, `claims`, `comparison_matrix`, `debates`, `gaps`,
  and `review_outline`.
- Stage 9 owns final section assembly, external literature, coverage,
  statistics, synthesis report, evidence materialization, source artifacts, and
  diagnostics.

Stage 10 remains a complete final validator and bundle writer. It catches
pollution, registry/hash drift, and host-parity issues, but should no longer be
the first place normal section-depth errors are found.

## Stage 9 Payload

`persist_external_statistics_report` reads
`runtime/payloads/external-statistics-report.json` and requires a top-level
`sections` object. The runtime combines those sections with validated Stage 7
and Stage 8 payloads, injects runtime-controlled evidence metadata, validates
the merged view, and then writes `result/sections/*.json`.

This preserves JSON artifacts as the semantic source while preventing the agent
from bypassing Stage 9 validation by writing final section files directly.

## Update Patch

Patch mode validates changed sections against a merged current-artifact view.
The patch payload can be partial, but the merged artifact must still satisfy
the same semantic closure rules for affected sections.
