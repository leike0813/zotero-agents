# Change: Bound Large Host Bridge Read Payloads

## Summary

Host Bridge and CLI read commands must not return payloads that grow without
bound as the Zotero library or Synthesis citation graph grows. This change
keeps existing command and capability names while tightening high-cardinality
read responses to page-sized JSON objects.

## Motivation

Some read commands can return complete library, topic, index, or citation graph
collections. Once stdout or transport output is truncated, callers cannot parse
the JSON response. Agents need deterministic page boundaries and cursor
metadata instead of relying on unbounded single-call dumps.

## Scope

- Add pagination or explicit bounds to high-cardinality Host Bridge read
  capabilities.
- Make `citation_graph.get_overview` return paged graph arrays with summary
  counts.
- Update CLI help, generated surface docs, wrapper guidance, and profile
  guidance.
- Add governance metadata so public high-cardinality capabilities declare their
  response sizing policy.

## Non-Goals

- No streaming, watch mode, transcript cursor, or multi-part stdout.
- No new CLI command names.
- No automatic CLI-side full collection download loop.
