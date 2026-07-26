## Context

The shared Assistant panel deliberately keeps managed regions stable across publications. Commit `36df9366` moved the interaction token into the payload captured by the reply region's long-lived listener, so a later `waiting_user` publication updates visible reply state without updating the token that the listener sends. ACP Skills rejects that stale token and SkillRunner silently drops it in its guarded submit path.

SkillRunner also retains the child-frame consumer across ordinary panel navigation. Commit `745adb0a` added consumer-side stale revision protection, but the existing detach path still resets the producer revision and published transcript cache. A producer restart below the retained consumer revision makes the first valid reattach snapshot look stale.

The change must preserve region-level DOM identity, stale-action validation, history cursors, foreground observation, and the distinction between transcript page readiness and complete mirror hydration.

## Goals / Non-Goals

**Goals:**

- Keep a stable reply mount while resolving the current action token and payload when the user clicks.
- Preserve a monotonic SkillRunner transcript publication clock across temporary host detach/reattach.
- Reserve publication-clock/cache reset for complete runtime destruction.
- Cover same-owner and A→B→A reactivation without weakening transcript stale-revision guards.

**Non-Goals:**

- Change reply DTOs, wire schemas, backend aliases, or token validation.
- Change `runDialog.js` response conversion, ACP stores/orchestrators, transcript storage, locale, or CSS.
- Refactor terminal observer leases or make cold full-mirror cache a correctness dependency.

## Decisions

### Keep dynamic action payload outside structural signatures

The reply mount will own a small mutable action state. Every reply publication updates that state, while the stable click listener reads it at dispatch time. Structural signatures continue to describe only visible structure and enabled state, so token-only changes do not rebuild the textarea or button.

Capturing the new token in a replacement listener was rejected because listener replacement either requires DOM reconstruction or introduces lifecycle bookkeeping that duplicates the managed-region owner.

### Split host detachment from runtime teardown

Temporary detach will release only host bindings, temporary workspace materialization, and timers. It will retain transcript revision and the last published transcript state because the consumer document and owner lifecycle may survive the host switch. Complete teardown paths used by plugin shutdown, test reset, and destruction of a standalone dialog will additionally reset the publication clock and cache.

Removing the child stale-revision guard was rejected because it would allow genuinely out-of-order publications to overwrite newer transcript state.

### Test observable lifecycle invariants

The reply regression test will reuse the same managed DOM across token N and N+1, assert DOM identity, and inspect the emitted action. The SkillRunner harness will expose detach/reattach controls around one runtime and capture so tests can verify revision monotonicity, first-reattach convergence, unique order, and continuous cursor behavior.

## Risks / Trade-offs

- [A teardown caller is classified incorrectly as temporary] → Keep a distinct complete teardown entry point and exercise shutdown/test-reset call sites.
- [Mutable action state leaks stale payload after reply becomes unavailable] → Update or clear the state on every reply publication and retain existing action/token guards at dispatch.
- [Tests accidentally lock implementation details] → Assert emitted action payload, DOM identity, revision monotonicity, ordered visible history, and cursor continuity only.
- [Retained publication state grows beyond its intended lifetime] → Complete runtime teardown remains responsible for clearing the cache and revision.
