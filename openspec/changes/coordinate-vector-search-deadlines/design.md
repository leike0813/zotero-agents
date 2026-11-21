# Design

## Context

The three mixed searches use the same published vector index as the dedicated
semantic surfaces. Source identity, current version and UTF-16 ranges govern
which vector hits can be returned.

## Decisions

- The production operation manifest supplies foreground deadlines across the
  sidecar, Broker and Bridge transports. A search has separate 30-second
  encoding, scoring and source verification budgets inside a 120-second
  foreground envelope. Lexical scans keep their existing work bounds.
- Start vector candidate selection independently of the lexical scan after
  resolving hard scope. Use bounded concurrency and keep existing ranking,
  source validation, result paging and publication identity.
- Persist maintenance progress through the existing durable operation owner.
  Keep 60-second document batches and propagate cancellation to outstanding
  encoding and retry delays. Keep the published index when cleanup or
  Discovery fails.

## Risks

Slow or unavailable providers still require bounded waits. Partial replies
carry coverage and the relevant timeout phase. Use delayed local fixtures to
exercise the old transport cutoffs and record phase timings on isolated Zotero.
