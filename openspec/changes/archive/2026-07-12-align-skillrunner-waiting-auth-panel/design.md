## Context

The backend e2e client treats `waiting_auth` as a live reconciliation state. Its 1.5-second watchdog refreshes canonical run status and reads the auth session until the backend transitions to queued, running, or terminal state. The plugin previously implemented a similar observer, but the foreground-apply migration removed the timer while intentionally moving poll/fetch/apply ownership to `continueSkillRunnerForegroundRun`. The current panel therefore has no observation path after global event sync detaches from `waiting_auth`.

The host snapshot already carries auth URL, user code, input capability, method list, and auth-session diagnostics. The shared Assistant Workspace model currently drops some of those fields and exposes a generic reply composer for every waiting state.

## Goals / Non-Goals

**Goals:**

- Restore live, request-scoped observation for browser/device authorization.
- Keep foreground continuation as the only settlement owner after auth waiting ends.
- Align the core auth card, persistent composer state, and method-selection payload with the backend contract.
- Preserve Assistant Workspace region-level rendering identity during periodic observation.

**Non-Goals:**

- Reintroducing global session sync or reconciler settlement ownership.
- Implementing the e2e client's custom-provider configuration form.
- Changing SkillRunner backend APIs, persistence formats, or the reference checkout.

## Decisions

### Panel-owned serialized watchdog

The selected run-dialog entry owns one self-scheduling 1500ms watchdog keyed by backend and request. A new tick is scheduled only after the previous tick completes, so slow requests cannot accumulate overlapping work. The existing observer generation and refresh chain prevent stale-owner writes. Close, owner change, terminal state, or terminal observer failure cancels the timer.

An interval-free self-scheduling timeout is preferred over a repeating interval plus a second in-flight flag because the timer lifecycle itself enforces serialization.

### Canonical job status gates foreground handoff

Each tick reads the run first. While canonical status remains `waiting_auth`, it refreshes pending state, auth session, and incremental chat history. An auth-session completion signal causes an immediate second run read but cannot start continuation by itself. This preserves lifecycle SSOT while still allowing the auth-session read to trigger backend reconciliation.

When canonical status leaves `waiting_auth`, the host stops the watchdog and calls the existing foreground-continuation entrypoint once, passing the observed status for immediate UI projection. The continuation's existing per-request in-flight map deduplicates races with user reply or import actions.

The alternative of restoring `ensureSkillRunnerSessionSync` is rejected because it would undo the foreground ownership migration and recreate competing settlement paths.

### Auth interaction DTO and action shapes

The first-round `reply.visible` contract is removed because SkillRunner auth must keep a stable composer footprint. Waiting-auth always renders the textarea and submit button; `enabled` and `inputEnabled` are true only for a supported text challenge. Those two flags become live reply-signature fields so state changes update disabled properties without rebuilding composer DOM.

The visual auth projection retains phase, challenge kind, prompt, hint, URL, user code, last error, and complete import-file presentation fields. It excludes auth session id, engine, and provider; raw owner state keeps them for submissions and the existing details drawer. Method choices prefer structured `ask_user.options` and otherwise normalize string/object method entries. Method selection sends only `selection.kind/value`; challenge input sends only `auth_session_id` plus `submission.kind/value`.

### External URL and auth action safety

The renderer presents an HTTP(S) auth URL as a real link but routes activation through an `open-auth-url` action. The host opens it with `Zotero.launchURL` only when it is HTTP(S) and exactly matches the selected owner's current pending auth URL. Renderer validation is convenience; host validation is authoritative.

Owner-local pending/error fields drive method, text, and import loading states. A new auth owner or phase clears stale action state. Custom-provider configuration remains unsupported and falls back to the disabled composer plus generic auth information.

The pending-auth read model owns prompt and control fields such as URL, code, input capability, hints, and import specs. Auth-session observation is a sparse lifecycle supplement, so absent session fields cannot erase pending controls. The LED row owns the fixed authentication-required status label; the card summary renders only a backend-authored prompt and has no duplicate fixed fallback.

### Auth import controls

Import-file projection preserves name, required, accept, per-file hint, overall hint, and risk notice. The child bridge validates required and empty selections before serializing files. Missing files and FileReader failures return an owner-scoped inline error without reaching the backend. Existing host-side auth import remains the only network owner.

### Region-scoped rendering

Periodic auth refreshes continue through the existing snapshot path, but stable per-region signatures remain the render gate. Auth controls belong to the interaction region, composer enablement belongs to reply live fields, and incremental conversation belongs to the transcript region. Repeated equal auth snapshots preserve selected file inputs; unchanged toolbar, banner, plan, drawers, and other managed regions retain their DOM nodes.

## Risks / Trade-offs

- [A 1.5-second observer adds management traffic while selected auth runs wait] → Scope it to the selected owner, serialize requests, and stop immediately at every lifecycle boundary.
- [Auth session can report completion before the canonical job transition is visible] → Treat it only as a hint and re-read the job before handoff.
- [User submission and automatic completion can race] → Reuse the foreground continuation's per-request in-flight deduplication.
- [Periodic snapshots could cause UI churn] → Keep auth fields in their owning region signatures and cover DOM identity with focused tests.

## Migration Plan

No persisted-data migration is required. Ship the observer and UI contract changes together; rollback consists of reverting this change without backend coordination.

## Open Questions

None.
