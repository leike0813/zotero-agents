## Context

Current runtime diagnostics export `RuntimeDiagnosticBundleV1`, which mirrors retained logs into `timeline`, `incidents`, and `entries`. This is useful for developer debugging but poor as a user issue artifact because it defaults toward volume rather than explanation. The log viewer also defaults to selecting `debug`, while the write pipeline only retains debug in diagnostic mode; once diagnostic mode is enabled, copied diagnostics can become noisy.

## Goals / Non-Goals

Goals:

- Make `Copy Diagnostic Bundle` produce a single redacted JSON issue artifact with high triage value.
- Keep raw retained-log export available for developers without making it the user default.
- Hide debug by default in the log viewer.
- Add missing backend setup/cache refresh evidence for ACP and SkillRunner.

Non-goals:

- Do not add a ZIP bundle or multiple files.
- Do not change backend protocols or result/workspace artifacts.
- Do not copy full raw transcripts, request bodies, tokens, cookies, or unbounded protocol streams into the issue bundle.

## Coverage Assessment

Current high-value coverage:

- Workflow execution seams, job queue, provider dispatch, SkillRunner task reconciliation, ACP run orchestration, and Host Bridge/MCP paths emit structured runtime logs with request/job/run/backend correlation in many critical paths.
- The pipeline sanitizes secret-bearing keys and truncates large values before storage/export.

Current gaps:

- ACP backend runtime options refresh calls `probeAcpBackendRuntimeOptions` but does not append runtime logs for probe start, success, failure, runtime directory, workspace directory, or cache counts.
- SkillRunner model cache refresh writes cache state and UI status but does not append runtime logs for manual refresh start, success, failure, request paths, engine/model counts, or fetch/runtime availability.
- The default issue action exports all retained raw rows, including info/debug when present, instead of a curated issue summary.
- The log viewer spec and implementation select debug by default, even though debug is not a normal-mode write level.

## Design

- Add `RuntimeIssueDiagnosticBundleV1` with schema version `runtime-issue-diagnostic-bundle/v1`.
- Build the issue bundle from retained logs and lightweight runtime/backend cache summaries; do not include full raw `entries` by default.
- Use a curated high-signal timeline: include `warn`/`error` plus allowlisted `info` stages for backend probes, cache refreshes, terminal states, and explicit lifecycle boundaries.
- Compute evidence gaps from the selected context, for example missing request/job correlation, no ACP probe events for an ACP backend, no SkillRunner model cache events for a SkillRunner backend, or all retained logs evicted.
- Keep existing `RuntimeDiagnosticBundleV1` builder unchanged as the developer raw export unless a focused compatibility adjustment is needed.
- Change the log viewer default filter to `debug: false`.
- Change `runtime-logs-copy-diagnostic-bundle` to call the issue bundle builder. Leave visible/raw log copy actions intact.

## Interfaces

- `RuntimeIssueDiagnosticBundleV1`:
  - `schemaVersion`
  - `generatedAt`
  - `environment`
  - `context`
  - `backendHealth`
  - `incidents`
  - `timeline`
  - `evidenceGaps`
  - `redaction`
- `buildRuntimeIssueDiagnosticBundle({ filters?, includeDebug?, includeRawEntries? })`
  - Default `includeDebug: false`
  - Default `includeRawEntries: false`
  - If raw entries are explicitly requested, include only sanitized export entries under a clearly named developer field.

## Risks

- The issue bundle may omit details needed for deep debugging. Mitigation: keep raw log copy/export actions and the existing raw diagnostic builder available.
- Backend health summaries may be partial if the relevant cache has never been refreshed. Mitigation: emit evidence gaps instead of implying success or failure.
- Additional info logs could increase noise. Mitigation: issue bundle timeline uses an allowlist, and debug remains gated.
