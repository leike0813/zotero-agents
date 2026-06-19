# Design

## Idle-Only Reachability

`health` remains an internal lane name for compatibility, but the user-facing and spec semantics are `reachability`. A reachability probe answers only whether the backend endpoint can currently be contacted.

Reachability probe runs only when:

- the backend has no active or queued SkillRunner connections;
- the backend is in `recovery_needed` or `idle_probing`;
- `nextProbeAt` has elapsed.

Any successful SkillRunner backend request is a reachability success signal and exits recovery probing.

Backoff is scoped to idle recovery probing:

- `15s -> 30s -> 60s -> 120s`
- success resets failure streak and the next recovery cycle starts again at `15s`

## Timeout Classification

- `local_or_transport_timeout`: non-reachability lane timeout; inconclusive and not backend-unreachable evidence by itself.
- `reachability_probe_failed`: idle probe failed; may drive backend gating after repeated failures.
- `terminal_run_client_error`: run-level `400/404/410/422`; settles only that run.
- `backend_service_pressure`: `5xx/429`; request backoff, not a Gecko starvation signal.

## Physical Connection Debt

The connection governor records per-backend debt when a timed-out task does not later settle. Debt indicates the logical slot was released but the physical connection may still be occupied. While debt is present, low-priority lanes are skipped or degraded and warm streams are reduced.

Debt is reduced by late settlement, successful critical requests, or cooldown.

## Reconciler Cadence

Request-level reconcile is a critical path and must not wait for reachability probe. Reconciler requests are bounded:

- jobs state: `reconcile` lane, `10s`
- terminal double-confirm: two independent `10s` requests
- result/bundle: `settlement` lane with a bounded longer timeout

Interval reconcile uses per-run `nextReconcileAt` instead of frequent full polling. Same-backend reconcile is serialized and same-request prompts are deduplicated.

## UI Observation

Normal UI can keep the two-stream MRU warm pool. Under physical debt or repeated timeouts, observation degrades:

- only the selected foreground stream is kept;
- warm streams are evicted;
- waiting/auth refresh uses a slower single in-flight cadence;
- background history sync is skipped unless explicitly needed.
