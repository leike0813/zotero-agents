## Context

The shared counter DTO distinguishes complete cumulative data from unavailable
legacy data. ACP Chat always restores a missing DTO as unavailable, including
for an empty new conversation. A later user prompt resets only the current
triplet, so the UI never receives an available denominator for that owner.

## Goals / Non-Goals

**Goals:**

- Render ACP Chat counters as `current/cumulative` from the first observed
  execution of a new or upgraded conversation.
- Keep unrecoverable historical silent activity out of the new denominator.
- Preserve owner-scoped persistence and independent counter-region rendering.

**Non-Goals:**

- Rebuild historical transcript counts or change transcript JSONL/index data.
- Change ACP Skills or SkillRunner legacy-count behavior.

## Decisions

1. Restore a missing ACP Chat count DTO as complete zero data only when the
   conversation has no transcript history. This fixes new conversations without
   claiming a historical total.
2. Let the ACP Chat user-prompt boundary explicitly promote an unavailable
   legacy state. Promotion clears the cumulative baseline and marks it complete
   before counting new protocol activity. The denominator is therefore the
   persisted observed epoch beginning with that prompt.
3. Keep promotion opt-in on the shared execution-progress reset API. ACP
   Skills retains its existing unavailable legacy semantics rather than gaining
   a Chat-specific side effect.
4. Persist the promoted snapshot through the existing conversation state; the
   renderer needs no format branch because it already renders complete DTOs as
   `x/y`.

## Risks / Trade-offs

- [A promoted legacy denominator is not a lifetime conversation total] → begin
  it only at an explicit user request and never reconstruct omitted history.
- [A shared reset option could affect other owners] → make the option opt-in
  and cover the default and ACP Chat paths separately.
- [High-frequency updates might rebuild panel chrome] → reuse the existing
  counter-only managed-region publication path and DOM-identity coverage.

## Migration Plan

Existing persisted owners remain readable. Empty owners receive complete
zero-valued metadata on restoration; legacy owners become complete only when
the user sends the next prompt. Removing the change is safe because the added
metadata uses the existing optional persisted field.
