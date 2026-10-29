# Design

## Context

See proposal.md. Private transfer is coupled to managed detail validation; Workflow Host stages images while reading a paper, and the materializer cleans every staged resource on any exception. Existing missing-file handling already supports issues and incomplete results.

## Goals / Non-Goals

Recover readable export material within existing bounded host reads and resource stores. Public semantic operations remain strict; no source-library repair, dependency change, or automatic publication is included.

## Decisions

- Extend existing materialization requests with optional `failurePolicy` (`fail_fast` default, `record_partial` for exports) and `includeNotes` (false for source-only export). Preserve `missingFilePolicy` independently.
- Keep one private transfer capture for HTML, payloads and raw recoverable attachments. Validate actual payload content and ownership; reconstruct only unique valid associations in detached HTML. Invalid main semantics are represented only in recovery material.
- Use existing issues/completeness with structured unit identity, stage, error code and outcome. Recovered-only issues leave completeness complete. Cancellation, timeout, shutdown, destination write failure and resource exhaustion propagate regardless of local policy.
- Isolate resource ownership per paper/note; release only resources belonging to failed units. Keep successful resources until caller disposal. Progress counts processed requests, not successful papers.
- Package recovery resources separately from importable notes. Render `export-report.md` from the same issue array and include report/recovery in the existing integrity inventory. Match successful papers to metadata by portable identity.

## Risks / Trade-offs

- Damaged raw material cannot guarantee structured re-import → normal import consumes only validated semantics.
- Local input failures and global failures share exception transport → classify stable codes and cancellation state, with tests for fatal propagation.
- Workflow content and plugin contracts ship separately → preflight must verify both release identities before building a candidate; no publication is authorized.

## Migration Plan

No stored-data migration. Deploy plugin and workflow content together after governed preflight. Existing callers keep strict default behavior. Revert code/content together if candidate verification fails.
