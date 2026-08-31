## Context

See [proposal.md](./proposal.md) for the motivation and affected surfaces. The
runtime log manager currently owns admission, in-memory retention, persistence,
read APIs, diagnostic bundles, and retention summaries. Those consumers must
continue to observe one ordered stream even though retention policy needs to
distinguish `debug`/`info` traffic from `warn`/`error` evidence.

The persisted runtime-log document is already consumed across plugin versions
and by external diagnostic tooling. Its single `entries` array is therefore a
compatibility boundary. The change may alter in-memory organization and add
summary fields, but it cannot require a file-format migration or make queue
membership visible in persisted data.

Assistant Workspace action names are defined by the shared shell/child wire
contract. Audit-level classification must reuse that vocabulary so message
routing and logging cannot silently diverge. The log viewer and readonly
harness consume snapshots produced by the runtime log manager; neither should
reimplement retention policy.

The detailed behavioral requirements are defined in
[log-retention-control](./specs/log-retention-control/spec.md) and
[log-viewer-window](./specs/log-viewer-window/spec.md).

## Goals / Non-Goals

**Goals:**

- Isolate high-volume `debug`/`info` traffic from diagnosis-critical
  `warn`/`error` entries while retaining bounded memory usage.
- Preserve one stable global append order across read APIs, persistence, and
  diagnostic exports despite using two in-memory queues.
- Keep retention accounting, eviction reasons, and serialized-byte estimates
  consistent regardless of which queue owns an entry.
- Make the active important-entry budget observable through existing runtime
  log snapshot and summary boundaries.
- Derive Assistant Workspace audit levels from the shared action vocabulary
  through one explicit policy function.

**Non-Goals:**

- Changing the persisted runtime-log schema, log entry schema, retention age,
  or diagnostic bundle version.
- Introducing per-component queues, dynamic quotas, new user preferences, or
  backend-specific logging rules.
- Changing the log viewer's level-filter model or making `debug` visible by
  default.
- Reclassifying actions beyond the shell and child control-plane actions named
  in the delta spec.

## Decisions

### 1. Store entries in two severity queues with shared accounting

The manager keeps `debug` and `info` entries in an info queue and keeps `warn`
and `error` entries in an important queue. Queue membership is derived only
from the four-level log type; it is not copied into `RuntimeLogEntry` or the
persisted document.

Serialization cache, serialized byte size, retention ordinal, estimated byte
total, and dropped-entry counters remain manager-wide. Both queues use the
same retain and release paths, so an eviction cannot update one accounting
structure while leaving another stale.

This is preferred over priority flags in one FIFO because a single queue would
need repeated scans or index manipulation to find the next low-priority entry.
Independent queues make FIFO eviction within each class direct and keep the
severity boundary easy to audit. More granular per-level queues were rejected:
the requirements distinguish two retention classes, and four queues would add
coordination without improving policy.

### 2. Track global order independently from queue order

Each retained entry receives a monotonically increasing in-memory ordinal when
it is appended or hydrated. Read, snapshot, export, and persistence paths merge
the two queues and order the union by this ordinal. Eviction removes the entry's
ordinal together with its serialized representation and byte size.

Hydration processes the persisted `entries` array in its existing order, so
reconstructed ordinals preserve the order seen on disk even when timestamps
are equal, malformed, or not monotonic. This also avoids treating timestamps
or generated IDs as ordering authorities when the persisted array already
contains the authoritative sequence.

Sorting the bounded union at a read boundary is preferred over maintaining a
third mutable array. A third array would duplicate membership state and make
every retain/evict/reset path responsible for synchronizing three collections.
The maximum union is 3,000 entries, so the bounded sort cost is acceptable for
the comparatively infrequent read and persistence paths.

### 3. Enforce retention in explicit severity-aware phases

One coordinator applies retention in this order:

1. Remove expired entries from both queues.
2. Reduce the important queue to the active important-entry cap.
3. Reduce total entry count by evicting the info queue first, falling back to
   the important queue only when no info entries remain.
4. In diagnostic mode, reduce serialized bytes with the same info-first,
   important-last policy.

Normal mode uses a total cap of 2,000 and an important cap of 500. Diagnostic
mode uses a total cap of 3,000, an important cap of 1,000, and a 20 MiB byte
cap. The normal byte cap remains disabled, matching the existing mode
semantics.

The important cap is enforced before the total cap so a warn/error-only stream
cannot consume the entire buffer. Total and byte enforcement then protect the
overall resource bound while preserving important entries whenever lower-level
entries are available to evict. Weighted scoring and adaptive quotas were
rejected because they would make retention dependent on traffic history and
harder for users and tests to predict.

Existing drop reasons remain `expired`, `entry_limit`, and `byte_budget`.
Queue origin is deliberately not added to the public counters: it is an
implementation detail, while the reason remains stable and meaningful to
diagnostic consumers.

### 4. Preserve the persistence contract and migrate only in memory

Persistence continues to write one document with one globally ordered
`entries` array. Hydration accepts the existing document (including the legacy
top-level array form), parses rows through the existing entry normalizer,
routes each parsed entry to its severity queue, assigns ordinals in file order,
and then applies the active budgets.

Persisting queue-specific arrays was rejected because it would create a schema
migration, force older builds and external readers to reconstruct order, and
expose an internal policy that may evolve independently of the storage
contract.

### 5. Centralize Assistant Workspace audit-level classification

The Assistant Workspace host owns two named sets: shell actions downgraded to
`debug` and child actions downgraded to `debug`. Set members are imported from
the shared wire constants rather than repeated as string literals. A single
resolver applies the precedence `error result -> warn`, `listed successful
control action -> debug`, and `all other successful actions -> info`.

This keeps lifecycle events such as `ready` at `info` by default and ensures a
failed control-plane action is still visible as `warn`. Classification inside
individual message handlers was rejected because the same policy would be
distributed across routing branches and could drift as the wire vocabulary
changes.

### 6. Extend existing snapshot boundaries additively

`maxImportantEntries` and `importantEntryCount` are added beside the existing
total and byte budget fields in runtime snapshots, summaries, and both
diagnostic bundle retention-budget blocks. The Dashboard adapter forwards
those values, and the readonly harness exposes the same shape. The viewer
formats the important and total usage together using its existing budget UI.

The runtime log manager remains the single source of budget values and current
counts. Computing the important count from filtered viewer rows was rejected
because viewer filters and result limits do not represent retained capacity.
Adding a separate endpoint or component was also unnecessary for two additive
fields on an existing internal snapshot.

## Risks / Trade-offs

- [Risk] Merging two queues requires sorting on read and persistence paths. →
  The input is bounded to at most 3,000 entries, while append and eviction stay
  constant-time at the queue boundary; no high-frequency UI render path owns
  the merge.
- [Risk] Ordinals are not persisted explicitly and are lost on restart. →
  Hydration reconstructs them from the persisted array, which is already the
  compatibility contract for global order.
- [Risk] Switching from diagnostic to normal mode can immediately discard
  entries above the lower caps. → Budget enforcement runs when settings change,
  uses the documented severity priority, and records the existing drop reason.
- [Risk] An important-only stream can still evict warn/error entries. → The
  dedicated cap is intentional to preserve a hard memory bound; eviction is
  FIFO so the most recent diagnostic evidence remains available.
- [Risk] Additive snapshot fields can drift between production and the readonly
  harness. → Both surfaces consume the same names and are covered by focused
  contract tests.
- [Risk] A future wire action may be noisy but remain at `info`. → The default
  is intentionally conservative; only actions explicitly added to a named set
  are downgraded, and wire-drift tests review the shared vocabulary.

## Migration Plan

1. Deploy the runtime log manager and audit-level policy together with the
   additive Dashboard and harness readers.
2. On first hydration, read the existing single-array document, reconstruct
   ordinals from file order, split entries by level in memory, and enforce the
   active dual budgets. No one-time rewrite or schema marker is needed.
3. On the next normal persistence flush, write the retained union back in the
   same single-array format and global order.
4. Verify type checking, focused retention/persistence/UI contract tests, lint,
   and OpenSpec validation before release.

Rollback requires only reverting the implementation. Files written by the new
implementation remain readable by the previous implementation because their
schema and single ordered `entries` array are unchanged. Newly added snapshot
fields are internal and additive; older readers ignore them.
