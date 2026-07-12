## Context

Kilo exposes a session-level `thought_level` option without a model-specific
compatibility matrix. ACP Chat and ACP Skills currently send the selected value
directly; a rejected `none` response aborts before the prompt is submitted.

## Goals / Non-Goals

**Goals:**

- Continue the same Kilo session with the selected model's default reasoning
  behavior when only `none` is rejected as invalid parameters.
- Keep Chat, initial Skill execution, and recovered Skill execution consistent.
- Preserve auditability and prevent recovered runs from resending a rejected
  override.

**Non-Goals:**

- Maintain a static Kilo model-to-effort compatibility matrix.
- Retry or replay a prompt after it has started.
- Suppress authentication, transport, internal, or non-Kilo configuration
  errors.

## Decisions

1. Classify fallback by structured protocol data only: Kilo agent family,
   `thought_level`, normalized value `none`, and `RequestError` code `-32602`.
   Error text is diagnostic data, not a control signal.
2. The fallback is omission, not a substitute value. The rejected request does
   not alter the session, so the already-selected model retains its backend
   default reasoning configuration.
3. Put the predicate and fallback result in one shared internal helper. Chat
   retains its last confirmed effort; Skill runs persist no effective reasoning
   override and append a structured fallback event.
4. Apply the helper before the first prompt and during recovered-session option
   restoration. A prompt is never retried as part of this feature.

## Risks / Trade-offs

- [Kilo uses another error code] → preserve the error rather than swallowing an
  unknown fault; diagnostics retain code and data for a later targeted update.
- [Displayed Chat value could claim an unconfirmed setting] → retain the last
  confirmed selection after fallback instead of writing `none`.
- [Recovery reintroduces the rejected value] → persist the effective unset
  override, not only the requested one.

## Migration Plan

Existing records remain valid. Only runs that encounter the defined fallback
store the absence of an effective reasoning override and an audit event; no
schema migration or transcript rewrite is required.
