# add-host-bridge-library-readiness-queries

## Summary

Add read-only Host Bridge library readiness queries for agents that need to find Zotero items missing PDF attachments, same-stem source Markdown attachments, or the `literature-analysis` generated artifact set.

The readiness surface uses `library.readiness_audit` as the Host Bridge capability contract and exposes canonical `zotero-bridge library readiness ...` CLI commands. It reuses the Zotero `Artifacts` column artifact detection rules as the single source of truth for source Markdown and generated analysis artifact presence.

## Motivation

Agents currently have to combine item attachment queries, note queries, and local knowledge to answer maintenance questions such as which papers are missing PDFs, Markdown sources, or analysis artifacts. That creates duplicated heuristics and makes the `Artifacts` column disagree with Host Bridge answers.

## Non-Goals

- No automatic PDF retrieval.
- No automatic Markdown conversion.
- No automatic `literature-analysis` workflow submission.
- No new REST route outside `/bridge/v1/call`.
- No transcript, local path, or provider-private payload exposure.
