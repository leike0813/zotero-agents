# Design

## Context

See proposal.md. The canonical schema is the mutation fact source; Bridge and Rust CLI project it. Native Zotero item readers have type constraints.

## Goals / Non-Goals

Use existing preparation, durable authority and transport seams. No new destination sentinel, raw-write fallback, dependency, real-library repair or publication.

## Decisions

- Capture libraryId during ingest preparation. Collection requests derive it and reject explicit conflicts. Root requests use explicit libraryId or the personal library, never ambient selection. Revalidate the captured destination even when observations are empty. Only requested membership is added or compensated; reused metadata remains curated.
- Enumerate removal descendants by native item type, include trashed children, bound the whole scope, and remove deepest children first so native cascade does not erase unaccounted targets. Preserve reader failures.
- Remove redundant parent.url from metadata snapshot; fields.url remains the canonical identifier source. Test real preflight and ACP validation.
- Effective runtime approval includes auto-approved. Transport callers prompt only for zotero-ui-required; previews remain none and existing scoped grants remain separate.
- Baseline c4dd65c24a5a6df726a000ccc58ff4cfaf6600c4; authorized deletion inventory empty. Preserve every governed instruction in place, add current guidance at its owner, render contracts/surfaces and refresh the Chinese mirror.

## Risks / Trade-offs

- Embedded CLI schemas require a new local binary; shipped seven-platform assets need separately governed publication.
- Removal is permanent, so test bounded complete preview and native type behavior before effects.
- Mock checks do not substitute for real Zotero acceptance.
