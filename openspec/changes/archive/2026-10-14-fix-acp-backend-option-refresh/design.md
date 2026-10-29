# Design

## Context

See proposal.md. Provider-option merging currently cannot distinguish a complete form from a patch. ACP probe caches one session snapshot while reasoning selectors can depend on the selected model.

## Goals / Non-Goals

Preserve draft deletion and backend ownership across both forms; prepare truthful reasoning choices without prompts; keep runtime live metadata authoritative. Do not migrate saved profiles, invent reasoning from model names, or alter OpenCode configuration.

## Decisions

- Carry optional `providerOptionsMode: replace` in internal complete execution drafts; partial callers retain merging. Persistence stores option values, not the draft marker.
- Use optional per-context reasoning catalog entries in the existing backend cache, keyed by raw model, effective mode and existing configuration fingerprint. Bound entries to the most recent 16 contexts and invalidate them with the parent revision/configuration.
- Extend the existing probe with targeted selection and cancellation. Capture setter response updates through the adapter's existing authoritative notification path. Selected-context probes preserve backend current values and connection-test evidence.
- A per-form preparation owner serializes probes, aborts replaced selections, exposes pending/error state, and publishes only for the same owner/context. It refreshes the newest draft so edits made while waiting survive.
- Current display travels separately from explicit provider values. Unknown or absent reasoning never becomes another model's choices. Explicit unavailable choices remain visible and removable by the user.
- Runtime selection validation is staged: mode, then model, then reasoning against the latest catalog. Preserve requested values separately from backend-confirmed run state.

## Risks / Trade-offs

Unknown contexts require starting a temporary ACP session. Cache reuse and one active probe bound that cost. OpenCode 2.0.27 currently drops MiniMax effort metadata upstream; the plugin reports unavailable values instead of claiming to configure them.

## Migration Plan

Cache fields and UI fields are optional. Legacy catalogs are accepted only for their recorded current context. Existing profiles and isolation paths are retained; only newly generated modern profile IDs change.
