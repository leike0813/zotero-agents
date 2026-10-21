# Design

## Context

See proposal.md for the failures. Native apply stores the resolver and Concept sidecars with less restrictive validation than `TopicRecord` reads. The existing legacy resolver normalizer already handles omitted selector arrays. Topic detail projection and public Topic lists share `project_record`; both need the same complete DTO. Browser geometry reproduces the second failure with a 5528px implicit grid column, despite non-empty rendered section text.

## Goals / Non-Goals

Restore reads of existing and newly created Topics while retaining metadata. Preserve public method names, canonical bytes and patch inheritance. No real-library repair, schema migration, Concept KB promotion changes or plugin installation is included.

## Decisions

- Reuse one resolver normalizer for legacy import, production admission and persisted reads. Supply empty omitted selectors and the existing union default, reject invalid explicit values, and keep the absent patch resolver as an inheritance marker. Do not weaken every field of the public resolver DTO.
- Model Concept evidence and relations as text-or-structured unions in contract-set, TypeScript and Rust. Keep structured object validation and preserve strings verbatim; do not infer relation targets or discard prose. Rewriting stored records or suppressing projection errors would lose evidence or hide the root cause.
- Add an explicit `minmax(0, 1fr)` column to `.topic-detail`. Keep timeline widths and scrolling intact; shrinking timeline data or rebuilding Reader rendering is unnecessary.
- Extend real production-route and Playwright tests using synthetic inputs. Verify actual visible geometry rather than jsdom dimensions or CSS source strings.

## Risks / Trade-offs

- Text relations are descriptive rather than Concept identities: preserve them in Topic reads and leave Concept KB interpretation unchanged.
- A new union must agree in Rust, TypeScript and JSON Schema: run targeted contract/native tests and the existing cross-language checks.
- Chromium geometry is not Zotero acceptance: record that limit and verify real-library reads only through a fresh isolated copy.

## Migration Plan

Deploy source-built sidecar and UI together through the existing release workflow when requested. Existing stored resolver objects are adapted at read time; no migration or content rewrite is required. This change performs no publication or installation.
