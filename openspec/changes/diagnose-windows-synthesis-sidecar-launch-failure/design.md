# Design

## Context

See `proposal.md` — Why for the observed failure and why it blocks change 04's Windows task.

The launch path that fails is `launch()` in
`src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts`. In order it runs
`ensureRuntimeDirectory(paths.sessionRoot)` (line 634), `installer.ensureInstalled()` (line 636),
`session = current` (line 646), `replacePrivateRuntimeTextFileAtomically(paths.configPath, …)`
(line 674), and `subprocess.call(…)` (line 677). A throw at or before line 634 leaves `current`
null; a throw between 646 and 674 leaves `current` set and calls `cleanupSession`, which deletes the
session root.

Two constraints shape the design:

- `openspec/specs/runtime-log-pipeline/spec.md` requires Synthesis runtime-log details to contain
  "operation, trigger, stage, outcome, duration, Host classification, and public semantic status
  only", and the pipeline sanitizes native errors and stacks. The one-token `lastFailureCode` is a
  product-log constraint, not an oversight.
- The per-cell System E2E diagnostics (`artifacts/test-diagnostics/system-e2e/<runId>/`, uploaded
  with the compatibility receipt) are test-only and are not governed at field level by any
  requirement.

### Where the failure can come from

`ensureRuntimeDirectory` (`src/modules/runtimePersistence.ts:740-812`) first tries
`IOUtils.makeDirectory` and **swallows** a rejection (lines 767-779, `catch { /* fall through */ }`),
then falls back to the synchronous XPCOM path, ending in
`entry.create(directoryType, 0o755)` (line 795) via `Components.interfaces.nsIFile`. Only that
synchronous call produces the wrapper shape seen in CI —
`[Exception... "Component returned failure code: 0x80520011 (NS_ERROR_FILE_NAME_TOO_LONG) [nsIFile.create]" …]`
— whereas an IOUtils rejection carries plain `NS_ERROR_*` text. `errorCode`
(supervisor lines 159-166) then reduces whichever message it gets to its first token, which is how
the record became `[Exception...`.

That matches the observed fuse: `classifyTerminal` (lines 466-482) lists no code resembling that
token, so `fail()` retries on `DEFAULT_RESTART_DELAYS_MS = [1_000, 5_000, 15_000]` (line 155) and
fuses on the fourth identical failure. `exitCode: current?.exitCode ?? null` (line 522) is `null`
because no child process was ever created.

### Path arithmetic on the Windows E2E lane

The compatibility runner hands the plugin its data root directly:
`ZOTERO_SKILLS_RUNTIME_ROOT: args.layout.runtime` (`scripts/run-zotero-compatibility-matrix.ts:400`),
where the layout is `<runsRoot>/<targetId>-behavior-full-<uuid>/e2e-<uuid>/runtime`
(`scripts/zotero-compatibility-fixture.ts:1231-1242`), and the persistence layer then appends a
second `runtime` segment (`src/modules/runtimePersistence.ts:613-614`). The r12 runner log records
the segment's `.scaffold\test\data` path at **162 characters**, which puts the segment root at 143.

| segment | length |
| --- | --- |
| segment root (measured anchor) | 143 |
| `\runtime` (runner-supplied plugin root) | +8 → 151 |
| `\runtime` (persistence layer) | +8 → 159 |
| `\synthesis` | +10 → 169 |
| `\service-runtime` | +16 → 185 |
| `\profiles` | +9 → 194 |
| `\` + 64-hex `profileId` | +65 → 259 |
| `\sessions` | +9 → 268 |
| `\` + 36-char `sup-<32-hex>` | +37 → 305 |
| `\config.json` | +12 → 317 |

The sidecar's install directory (`…\service-runtime\current`, 193 characters) and `profilesDir` (194)
stay under the Windows 260-character limit, which is why the install succeeds, while the per-profile
directory sits exactly at the limit (259) and `sessionsDir` (268) and the session root the plugin
creates at line 634 (305) exceed it. The `domain all` Windows lane never sets
`ZOTERO_SKILLS_RUNTIME_ROOT`, so its root is the much shorter
`D:\a\zotero-agents\zotero-agents\.scaffold\test\data\zotero-agents` and its sidecar starts. The same
runner already surfaced `0x80520011 (NS_ERROR_FILE_NAME_TOO_LONG) [nsIFile.create]` from a
test-side `nsIFile.create`, so long paths are not enabled there.

This is the leading hypothesis, not a conclusion. Two facts keep it honest: the arithmetic assumes
36-character UUIDs and a fixed target id, and the evidence field that would corroborate a
pre-line-646 failure, `sessions: []`, cannot do so — the writer scans the on-disk profiles directory
after the worker exits (`scripts/system-e2e/runtimeEvidence.ts:132-158`), and `cleanupSession` removes
the session root on failure, so an empty array also results when a session was created and then
cleaned up.

One more difference is worth recording because it separates this lane from the `domain all` cells:
the failing lane's installed sidecar reports bundleId `821ca045…` / fingerprint `389a7cb5…`, while
the committed `addon/bin/win32-x64/synthesis-sidecar` prebuild reports `e5594b06…` / `e6eef533…`.
So the E2E lane ran a Windows binary staged from the current source on the runner, and the `domain
all` cells ran the committed release prebuild. A build-profile difference therefore remains a live
alternative for the launch failure if the path hypothesis is refuted.

## Goals / Non-Goals

**Goals**

- Make one Windows round sufficient to classify any launch failure, with no need to reproduce twice.
- Derive the classification from where the failure happened instead of from parsing message text.
- Keep the product runtime log inside its existing contract.

**Non-Goals**

- Repairing the classified cause; promoting a Windows cell; changing any blocking lane.
- Diagnosing the `domain all` Windows failures or the `xpi-smoke` failure beyond recording them as
  separate.

## Decisions

### 1. Put classification-grade detail in the test-only diagnostics artifact

The launch-failure record gains its detail in the System E2E per-cell diagnostics, not in the
runtime log. The runtime log keeps `{code, lastFailureCode, restartCount, exitCode}` exactly as
change 04 left it.

Alternative: widen the runtime-log entry. Rejected because it contradicts the
business-semantics-only requirement and because the pipeline's native-error sanitization is
intentional, so the richer detail would have to be re-sanitized into uselessness.

### 2. Classify by launch stage, not by message

The record carries a `stage` drawn from fixed values — `pre-create`, `spawn`, `pre-discovery` — plus
the raw error name, the platform error number when the thrown error exposes one, the exit value when
a process existed, and the length (never the text) of the deepest path the failing step attempted.

The stage is what resolves the current ambiguity: `exitCode: null` and `sessions: []` each admit more
than one reading, while a `pre-create` stage pins the failure before `session = current`. The
attempted length is recorded as `attemptedChars` rather than anything containing `path`, because the
log pipeline's location redaction rewrites a `path`-ish key to `<redacted>` whatever its value is.

Alternative: match `NS_ERROR_FILE_NAME_TOO_LONG` in the message. Rejected because message matching is
brittle and would hard-code one platform's failure.

### 3. Instrument the individual steps instead of wrapping the whole body

`ensureRuntimeDirectory`, the install resolution, the atomic config write, and `subprocess.call` get
their own failure tags, so the stage is a fact about which step threw rather than an inference.

Alternative: keep the single `try` and infer from `current.proc`. Rejected because a throw before
line 646 and a throw between 674 and 677 both leave `current.proc` unset.

### 4. Keep the change diagnosis-only

The change ends with a recorded classification. The repair is a separate change, because the
classification may land in the plugin, the harness, the runner image, or the prebuilt binary, and
each has a different review path. `04-wire-and-calibrate-phase1-system-e2e-ci` also depends on this
change not moving Windows blocking state.

## Risks / Trade-offs

- **A Windows round is slow and must run in a lane that stages a current-source Windows sidecar
  (release or calibration, not the `ci.yml` Linux candidate)** → run one cell once; no promotion, no
  new lane.
- **The record could leak a private path** → record lengths and fixed stage names only, never the
  path text.
- **The arithmetic could be wrong about UUID length, target id, or long-path support** → the record's
  attempted path length and error number decide it in one round; the arithmetic only predicts.
- **The classification could be "harness or binary, not product"** → that is a valid outcome and
  still closes change 04's Windows question; the tasks do not pre-commit to a product fix.

## Migration Plan

1. Land the instrumentation and its runner-side tests; nothing changes for users.
2. Run one Windows E2E cell with the current-source sidecar and attach the record to this change.
3. Record the classification, then open the repair as its own change.
4. Rollback: the added fields are additive diagnostics; reverting the commit restores the previous
   record shape without touching any gate.

## Open Questions

- Whether the Windows runner image has long-path support enabled. The first captured error number
  answers this, and no decision in this design depends on the answer.
- Whether the macOS evidence failures share the cause. They are out of scope and can be read from
  existing artifacts later.
