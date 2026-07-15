## Context

Recorder and Replay already have independent debug source switches and share a diagnostic-mode mutex. The Dashboard currently renders them as separate selected surfaces. Replay path input is iframe-local, the button disabled state is computed only once, the host action awaits the whole matrix before refreshing, and the controller has no abort owner. Recorder terminal states have no supported reset path outside shutdown/test helpers.

## Goals / Non-Goals

**Goals:**

- Present capture and replay as one local two-step workflow.
- Make typed and native-selected traces usable and auditable before replay.
- Publish progress outside profile windows and support prompt cancellation with full cleanup.
- Permit repeated saved, canceled, incomplete, and failed recording rounds without deleting artifacts.

**Non-Goals:**

- Combining Recorder and Replay into one runtime state machine.
- Relaxing source-kind comparison, backend isolation, or raw-trace sensitivity constraints.
- Uploading, copying, or automatically deleting trace artifacts.

## Decisions

### One surface, two independent views

The Dashboard uses one `acp-trace-replay` tab and selected-surface signature containing the Recorder and Replay views. Each subsection is independently gated by its source switch. Saving a trace calls Replay preflight with the final path, but never starts replay automatically.

### Recorder terminal reset preserves files

Cancel finalizes the current partial as incomplete with `user-canceled`, releases the mutex, and leaves the partial file in place. Reset is accepted only from frozen or saved states and clears in-memory ownership without deleting files. Arm failures release the mutex and expose a recoverable terminal state.

### Trace selection has one validation SSOT

The privileged host owns native file selection through a shared FilePicker seam. Manual input updates button availability locally and triggers host preflight on blur or Enter. Browse and Run also preflight. The controller exposes schema, source kind, digest, creation time, event count, bytes, and completion from `loadAcpRuntimeSemanticTrace`.

### Progress and cancellation stay outside profiles

The matrix invokes an awaited record-complete callback only after profiler finish and target cleanup. The controller updates progress and the Dashboard posts a selected-surface refresh before the next profile starts. A controller-owned, host-independent cancellation source interrupts recorded waits, ends the outer matrix loop, saves an incomplete result, and restores Workspace state in `finally`. Replay does not assume that Zotero exposes the browser `AbortController` global. The Dashboard awaits the controller promise so unexpected startup failures cannot become unobserved rejections.

### Workspace readiness uses rendered publication acknowledgement

Opening the Assistant Workspace is not a readiness boundary. Before an open-surface profile starts, Replay waits for the shell handshake, active child readiness, matching target owner, and a replay-tagged snapshot acknowledgement sent only after the child render frame completes. After trace/R2 consumption, the same publication drain runs inside the profile window before profiler finish so delayed R3 work remains attributed to that run. Waits are cancelable and bounded to ten seconds; restore uses the same drain without inheriting the canceled run signal. The first Workflow request maps to the stable `${syntheticRootId}-request` owner selected by `target-active`.

Child readiness belongs to the shell iframe document lifetime, not the active
library/reader target or publication scope. Target commits reset baseline
publication state but retain readiness while the shell window is unchanged.
The shell requests a fresh idempotent ready declaration from every child on
initialization and frame load; initialized children forward every declaration
to the host, so an early declaration rejected before target activation cannot
become a permanent lost edge.

### Replay measurement uses an explicit run scope

Replay matrix v2 separates execution completion from measurement completion.
Each profile has one matrix-root scope and an allowlist of synthetic owner
aliases registered by that replay only. Projection/store metrics from those
owners aggregate into the root; unknown owners never fall back to the active
profile. Adapter and wire metrics remain not-applicable because replay has no
transport, while semantic event/projection metrics are measured at the replay
and shared projection seams. The fixed R2 workload uses a measured parser and
safe no-op response seam without exposing mutation dispatch.

R3 attribution uses the replay source kind and matrix surface as its SSOT.
Closed has no R3. Open-inactive waits for publication idle without forcing the
opposite active tab to render and expects zero target publication. Target-active
requires matching Chat or Skills prepare, signature, post, and rendered
acknowledgement. The report aggregates only the two formal runs and labels the
result descriptive rather than statistically significant.

## Risks / Trade-offs

- [Progress refresh contaminates profiles] -> Await Dashboard refresh only after each profile window and cleanup.
- [Cancel loses evidence] -> Preserve and expose incomplete trace/matrix artifacts; never auto-delete.
- [Unified UI defeats independent elision] -> Gate each dynamic import and section independently and retain zero-byte bundle checks.
- [Typed path changes after preflight] -> Revalidate on Run and display metadata only for the exact normalized path.
- [Shell or child loads after profiler start] -> Require rendered publication acknowledgement before profile start and before profile finish.
- [One-shot child ready is lost or cleared on reopen] -> Probe children on host initialization and scope readiness to the shell document lifetime.
- [Execution succeeds with empty performance evidence] -> Persist separate execution and measurement completion plus required R1/R2/R3 coverage.
- [Synthetic owner aliases absorb unrelated work] -> Register only owners emitted by the current replay mapper and release aliases with the root profile.

## Migration Plan

Replace the two tab keys with `acp-trace-replay`. Semantic traces remain
unchanged. New results use `zotero-agents.acp-runtime-replay-matrix.v2`; v1
results load as legacy measurement-incomplete evidence and cannot be governed
against v2. Old selected tab keys normalize to the new surface when the
corresponding feature is available.

## Open Questions

None.
