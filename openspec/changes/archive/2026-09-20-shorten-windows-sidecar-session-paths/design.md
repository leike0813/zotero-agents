# Design

## Context

See `proposal.md` — Why. The classification comes from `diagnose-windows-synthesis-sidecar-launch-failure`; the measured signature is `{stage: pre-create, step: runtime-directory, errorName: NS_ERROR_FILE_NAME_TOO_LONG, errorNumber: 0x80520011, attemptedChars: 305}`.

The layout chain that produces it, for `zotero-10-windows-x64` on a CI runner:

| segment | before | after |
| --- | --- | --- |
| runs root (`D:\a\_temp\zotero-compat-runs`) | 29 | 29 |
| `\` + cell directory | 73 | 31 |
| `\` + domain directory | 41 | 13 |
| `\runtime` (the runner-supplied data root) | 8 | 0 |
| `\runtime` (the persistence layer's own level) | 8 | 8 |
| `\synthesis\service-runtime` | 26 | 26 |
| `\profiles` | 9 | 9 |
| `\` + 64-character profile id | 65 | 65 |
| `\sessions` | 9 | 9 |
| `\` + 36-character supervisor id | 37 | 37 |
| **session root** | **305** | **227** |
| `\config.json` | 317 | 239 |
| `\discovery.json` | 320 | 242 |

The 64-character profile id and the 36-character supervisor id are the plugin's own identity rules and
are not in scope. Everything above them is the compatibility harness, and the before column spends 114
characters on two `randomUUID()` values and a repeated directory name.

## Goals / Non-Goals

**Goals**

- Bring every path the launch writes inside the session root below the Windows limit with reserve.
- Keep the layout readable enough to identify a run from its artifact path.
- Make the budget checkable, so a future layout change cannot silently cross the limit again.

**Non-Goals**

- Changing the plugin's profile or supervisor identity formats, or any plugin behavior.
- Compressing the host install, receipt, or diagnostics paths, which are not what fails.
- Enabling Windows long-path support on the runner.

## Decisions

### 1. Shorten the random token, not the descriptive parts

The run layout keeps `zotero-10-windows-x64` and `e2e` and gives up `randomUUID()` for an 8-character
hex token. That is 32 bits, enough to keep concurrent runs on one host distinct, and it is the only
part of the path that carries no information a reader wants.

Alternative: shorten the target id. Rejected because target ids are the project's identity vocabulary —
receipts, cells, artifact names, and the compatibility matrix all use them.

### 2. Let the persistence layer own the only `runtime` level

The compatibility worker passes the run segment root as `ZOTERO_SKILLS_RUNTIME_ROOT` instead of the
segment's `runtime` directory. `getRuntimePersistencePaths` appends `runtime` itself, so the previous
value produced `…\runtime\runtime`. The layout's `runtime` directory is exactly what the persistence
layer then addresses, and the runtime-evidence collector reads the same root.

Alternative: drop the layout's `runtime` field and keep passing it. Rejected because the layout creates
`profile`, `data`, `resource`, and `runtime` together, and the plugin's data root belongs beside them
rather than inside one of them.

### 3. Stop repeating mode and suite in the cell directory

The cell directory becomes `zotero-10-windows-x64-<token>`. Mode, suite, and domain already appear in
the compatibility receipt, in the uploaded artifact name, and — for the segmented `behavior-full`
cells — in the domain directory that follows.

Alternative: keep `-behavior-full` and shorten the domain directory to one character. Rejected because
`e2e` is the segment whose name tells a reader which lane produced a diagnostic.

### 4. Pin the budget with a test, not with a comment

A run-layout test builds the deepest planned target's layout, then measures every path a writer under
the run root produces against the CI runner's run root (`D:\a\_temp\zotero-compat-runs`, 29
characters). The measurement is normalised so the machine's own temp directory cannot affect it. The
session root must stay at or below 244 characters, the `config.json` and `discovery.json` the launch
writes at or below 250, and the deepest test-seam checkpoint file at or below 250 — that file is
measured as a 32-character checkpoint name plus the longest state suffix, so the budget covers the
naming room the seam actually uses rather than the two names that happen to exist.

The test also asserts that the persistence layer's runtime root is `<run root>\runtime`, so reverting
the change in decision 2 costs exactly the eight characters that assertion protects.

Alternative: assert only the paths the launch writes. Rejected — that is the mistake the first
version of this change made, and the Windows round found the checkpoint files at 277 and 278
characters while every path the launch writes was inside the budget.

### 5. Give the test seam its own checkpoint root instead of shaving names

The seam's checkpoints are coordination files between the test and the sidecar, and they were derived
from the session root, which is the deepest directory the layout owns. The launch config now carries an
optional `testCheckpointRoot`, the plugin sets it to `<plugin data root>/test-checkpoints` while a
System E2E run is active, and the sidecar uses it with the previous session-root derivation as its
fallback.

That moves the files from 279 characters to about 131 and keeps every name and state suffix readable.
The field is optional and omitted outside a System E2E run, so production launch configs are unchanged
and the schema version does not move.

Alternatives rejected: shortening the directory name and the checkpoint names (that reached 250 with
nothing left over for a new checkpoint, and produced names like `tc/maint-adm.release`); walking up
from the session root on both sides (it teaches the sidecar the lifecycle directory layout, which it
does not otherwise know); and shortening the plugin's profile or supervisor identity formats (product
identity, out of this change's scope).

## Risks / Trade-offs

- **The receipt's `runId` changes shape** → nothing parses it by format, and `runId` is not part of a
  cell's calibration identity, so no calibration round is invalidated; the change is visible only in new
  evidence.
- **A Windows local run can use a longer temp root than the CI's** → the budget is stated against the
  CI runner's root, which is where calibration and promotion happen; the test says so instead of
  pretending to cover a deeper one, and the default local run root keeps the same layout so a
  developer only hits the limit if `%TEMP%` is much deeper than CI's.
- **Shorter tokens raise collision odds if many runs start at once in one root** → 32 bits per token
  across two levels, with a few cells per run, keeps the risk negligible; the layout already relies on
  the parent root being per-run.
- **Dropping mode and suite from the path makes artifact browsing slightly less self-describing** →
  accepted, and the receipt plus the artifact name carry both.

## Migration Plan

1. Change the layout and the two call sites, then run the layout, matrix, and evidence tests.
2. Confirm on a Windows calibration round that the classification entry disappears and the cells reach
   discovery, which is the observable proof the budget holds on the real runner.
3. Rollback: reverting the commit restores the previous layout; nothing was promoted on the strength of
   the new one.

## Open Questions

- Whether the Windows cells then reach `ready`, or whether a second Windows defect sits behind the path
  failure. The next calibration round answers it, and no decision here depends on the answer.
