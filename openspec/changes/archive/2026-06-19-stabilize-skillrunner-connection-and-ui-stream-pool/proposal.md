# Change: Stabilize SkillRunner Connection And UI Stream Pool

## Why

SkillRunner connection governance now prevents stuck runs from exhausting the
frontend/backend connection budget, but the RunDialog foreground chat stream can
still become unstable during UI task switching. The current selected-run stream
model disconnects too eagerly, mixes stream pumping with metadata/history
refreshes, and lets stream events trigger additional background session sync.

For normal operator behavior, users often switch between the same one or two
runs. Disconnecting and reconnecting on every A/B switch creates avoidable
stream churn and makes the dialog transcript feel unreliable.

## What Changes

- Capture the completed SkillRunner connection governor contract in OpenSpec.
- Replace selected-run singleton chat stream ownership with a per-backend UI
  stream pool of at most two warm foreground streams.
- Keep the currently selected run on a stream while retaining the most recently
  selected previous run as warm state.
- Evict the least-recently focused stream only when a third run on the same
  backend needs a stream.
- Make SkillRunner workspace selection user-driven: provider progress and
  request-ready events no longer auto-focus newly submitted runs.
- Remove temporary request placeholder rows so task lists only show real
  SkillRunner run-store projections.
- Decouple chat stream pumping from metadata, pending-state, and history
  refreshes.
- Keep background observation as short requests; do not restore one SSE per run.
- Fix SSE frame parsing for LF and CRLF frame boundaries.

## Impact

- `provider-adapter`: documents lane-based connection governance and stream
  pooling semantics.
- `task-dashboard-skillrunner-observe`: replaces the selected-run singleton
  stream requirement with the MRU two-stream pool.
- `task-runtime-ui`: documents UI stream pool ownership and task projection
  stability.
- Implementation touches the SkillRunner connection governor, management
  client SSE parsing, RunDialog observer lifecycle, and focused tests.
