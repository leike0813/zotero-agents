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

A run-layout test builds the deepest Windows target's layout under a deliberately long run root (45
characters, longer than the CI runner's 29) and asserts that the sidecar session root plus the
`config.json` and `discovery.json` files inside it stay at or below 250 characters. That is 10
characters of reserve below the Windows limit, and the assertion fails on the current layout.

Alternative: assert only the session root. Rejected because the launch writes files inside it, and the
file names are part of what must fit.

## Risks / Trade-offs

- **The receipt's `runId` changes shape** → nothing parses it by format, and `runId` is not part of a
  cell's calibration identity, so no calibration round is invalidated; the change is visible only in new
  evidence.
- **A Windows local run can use a longer temp root than the CI's** → the budget test asserts against a
  longer root than CI uses, so local runs stay inside it too.
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
