# Design

## Context

See proposal.md and the approved core/handoff resolutions. The current integration sets Agent systemPrompt, prepares in transformContext and rebuilds context in streamFunction. Pi 1.0.0 exposes prepareRequest/finishTurn, makes systemPrompt read-only, and supplies normalized TranscriptContext to API implementations. Its token estimator lives in pi-ai/utils/estimate.

## Goals / Non-Goals

**Goals:** One preparation per actual invocation; consistent prompt/tool declarations and executable tools; unchanged project terminals, tool accounting and physical settlement; honest versioned host evidence.

**Non-Goals:** Catalog/metadata distribution, SIWC, search changes, capacity tuning, new durable owners, release or archive. OMP and old Codex remain for their approved follow-up changes.

## Decisions

- Pin core/ai exactly to 1.0.0. Keep existing direct api imports and explicit streamFn; do not use compat/global provider registration or ambient credentials.
- Move per-invocation setup into prepareRequest. Resolve and persist the owner preparation before dispatch. Return replacement AgentContext with normalized system/messages/tool declarations and executable tools. Preserve the frozen model; remove the transformContext/pending stream-layer preparation combination. StreamFunction retains actual invocation accounting/events, transport deadlines and physical provider settlement.
- finishTurn returns end for cancellation/suspension, waits, unknown effects and LoopGuard rejection; otherwise return undefined to preserve natural SDK tool continuation without an extra context-only request. Project result settles separately from SDK turn_end.
- Normalize Context at runtime/provider boundaries with the SDK helper; system messages remain transient. Public project messages/events and persisted owner records remain unchanged. Each prepared request replaces the instructions/tool set rather than accumulating stale declarations.
- Derive runtime/provider/estimator version strings from exact root dependency declarations through the existing Pi build configuration module. Read-only JSON is valid in the existing TS/browser build. No new version registry.
- Move estimation to pi-ai/utils/estimate using normalized instructions, actual tool declarations and prepared messages. Retain the estimator port and preparation record; record the new estimator identity/version and preserve the existing budget/compaction policy.
- Retain only the proven provider-env.js→node:fs guard. New reachable builtins are admission failures; no broad shim or runtime Node code.

## Risks / Trade-offs

- System/tool normalization can duplicate or drop instructions → inspect actual request content and tool execution, including replacement between invocations.
- Estimator changes can shift compaction timing → verify mandatory budget rejection and full-unit/CAS behavior rather than old numeric equality.
- Canceled SDK loops can finish before transport work → retain the existing physical provider promises and owner settled interface.
- Current host install labels can drift → validate actual versions against the existing matrix. Linux 10.0.1 cache is available; Windows execution is not available in this Linux session and remains required evidence.

## Migration Plan

Update matched dependencies/lock, land behavior tests and adapters in vertical slices, then run focused Node/browser checks before real-host integration. No persisted schema migration is needed; new selections/preparations carry the new version facts, historical records remain unchanged. Failed admission leaves this change incomplete; no dual-version runtime fallback. C20 remains open for the complete A/B/C candidate.
