# Design

## Context

See proposal.md. A synthetic sequence of two production `literatureArtifacts.applyAnalysis` calls reproduces the user's exact error: the second digest write omits matchingMetadata, resets visible HTML, and reattaches only the primary payload. The old auxiliary attachment survives with a missing anchor. The collection copy contains this same shape; no personal content is needed in fixtures.

## Goals / Non-Goals

Preserve logical auxiliary data during replacement and transfer. Keep public source health accurate. Do not repair the real library on read, weaken primary artifact validation, or modify Content Package sources.

## Decisions

- Reuse canonical payload decoding and logical-payload upsert for omitted auxiliary types during parent-set preflight. Supplied values override retained values. Migration uses only its declared conversion entries.
- Share the private transfer eligibility rule between retained payload preparation and bundle export. Only unknown-to-managed-primary types with one candidate and a missing anchor can be projected as transferable. The attachment and decoded value must still be valid. A mismatched existing anchor is not recoverable by this rule.
- Public summary remains stale. The detached private summary describes a valid transferable logical value, and the detached HTML receives the missing anchor so image materialization preserves its physical payload attachment. Auxiliary types need no new Agent text projection. Importing uses the existing upsert path to create an anchor. No source mutation occurs during export.
- Extend existing bundle tests at production Host API and export/import seams. Use synthetic fixtures matching the historical shape; retain the original diagnosis only under ignored `.scaffold/test`.

## Risks / Trade-offs

- Retaining stale semantic metadata: omission is not deletion; preserve bytes without interpreting them as current evidence.
- Ambiguous attachments: reject duplicate payload identities instead of selecting a candidate.
- Malformed auxiliary data: keep fail-closed behavior and existing byte budgets.

## Migration Plan

Ship in the XPI. Existing affected notes become exportable without a migration or content release. A later successful managed replacement restores their anchors through the normal transaction.
