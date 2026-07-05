## Context

SkillRunner capability resolution currently calls `SkillRunnerManagementClient`
without lane options. The management client defaults `handshake()` and legacy
`probeReachability()` to `health`, and the connection governor may skip health
lane work while the backend has active or queued connections or physical debt.

## Decision

Treat provider execution preflight as part of the submission path, not as a
background health probe. The resolver accepts request options and forwards them
to both the handshake request and legacy reachability fallback. The provider
passes `lane: "submit"` when resolving capabilities before job submission.

## Consequences

- Execution preflight handshake is no longer locally skipped by health-lane
  busy/degraded gating.
- Background reachability probes keep their current low-priority behavior.
- The capability cache remains keyed only by backend id and base URL because
  the negotiated capabilities are independent of the connection lane.
- No SkillRunner backend protocol or model cache behavior changes.
