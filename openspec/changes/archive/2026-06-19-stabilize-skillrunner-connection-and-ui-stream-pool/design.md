# Design: SkillRunner Connection And UI Stream Pool

## Connection Governance

SkillRunner requests are routed through an application-level governor keyed by
backend and lane. The lanes are:

- `submit`: `/v1/jobs` and upload dispatch.
- `foreground-stream`: UI chat SSE streams.
- `foreground-query`: UI pending/auth/history/meta queries.
- `settlement`: terminal result and bundle fetches.
- `background`: reconciler and background short requests.
- `maintenance`: backend health and low-frequency management requests.

The backend cap remains four active connections by default. Background and
maintenance work must not consume the final submit-reserved slot.

`foreground-stream` is a special pool lane. For one backend, at most two active
foreground streams may exist, and at most one stream may exist for a given
request id. A newly focused run updates its `lastFocusedAt`. If a third run
needs a stream, the pool aborts the least-recently focused stream on that
backend before starting the new stream.

## RunDialog Stream Model

RunDialog keeps workspace selection separate from stream ownership:

- Selection records the currently displayed request id.
- Selection changes only from explicit user workspace actions, such as choosing
  a task row or opening an existing run from UI.
- Each request id may have a stream session with its own cursor, abort
  controller, retry delay, and last-focused timestamp.
- The selected run must have an active or starting stream when it is running.
- The previous run may keep its warm stream after it is no longer selected.
- Warm streams update their own session state but do not trigger full UI repaint
  unless they become selected again.

Switching A -> B starts or reuses B while keeping A warm. Switching A -> B -> C
evicts A, keeps B warm, and starts C. Switching A <-> B reuses both streams
without repeated disconnect/connect churn.

SkillRunner provider progress, request-ready events, reconciler settlement, and
session sync do not change the selected run. Newly submitted SkillRunner runs
become visible only after upload/request initialization reaches `request-ready`
and the SkillRunner run store exposes a real projection. `request-created`,
queued, running, or pre-upload job states are not user-visible run projections.
RunDialog does not synthesize temporary task rows for request ids that are not
present in the run store.

Pre-ready dispatch failures are terminal foreground dispatch failures, not
recoverable backend-owned runs. If `/v1/jobs` returns a request id but upload or
initialization fails before `request-ready`, the workflow job fails with a
request-scoped runtime log entry. It must not be converted into an invisible
recoverable pending run. Create and upload requests run in the submit lane with
bounded request timeouts so backend stalls cannot leave the plugin waiting
indefinitely.

## Stream And Query Separation

Chat stream frames update transcript state and cursor directly. They must not
call the background session sync entrypoint. Metadata, pending/auth state, and
history catch-up run as foreground queries only when explicitly needed:

- initial selected run refresh
- explicit display refresh
- cursor gap or stream error catch-up
- waiting auth/user polling

Clean stream close uses lightweight backoff reconnect and does not immediately
run the full metadata/pending/history query chain.

## Health Semantics

Foreground stream disconnects do not mark a backend unreachable. Backend health
continues to be driven by maintenance ping/reconcile probes. Terminal, waiting,
backend-gated, and workspace shutdown paths abort the associated stream
sessions explicitly.
