## Context

See `proposal.md` for motivation. The current prebuild repeats host-level Rust
and contract verification inside seven target jobs. Its cache is keyed by source
SHA, and the governance module includes verification/workflow files in the
binary build identity. Rust tests independently create and remove temporary
roots; `cargo test --workspace` then stops at the first failing test binary,
which has allowed unrelated Windows handle failures to surface one run at a
time. The prebuild branch and seven-target bundle format remain governed release
inputs and cannot be weakened.

## Goals / Non-Goals

**Goals:**

- Make host verification one explicit prerequisite with complete failure output.
- Give tests one deep temporary-resource owner rather than distributed cleanup.
- Make runtime bytes, verification coverage, and pipeline implementation separate
  identities with one source of truth.
- Preserve exact seven-target archive, native smoke, and immutable-set evidence.

**Non-Goals:**

- No product wire, runtime lifecycle, bundle-layout, or target-roster change.
- No automatic prebuild dispatch, formal release, branch-protection mutation, or
  Gitee synchronization.
- No retry policy for tests or smoke and no third-party Rust dependency.

## Decisions

### One test-root module owns temporary fixture cleanup

Add a workspace-only `synthesis-test-support` crate whose public interface is a
single `TestRoot` owner with a path view. Its implementation creates a
portable unique directory and removes it on drop. A normal cleanup error panics;
during existing unwinding it emits secondary diagnostics instead. Test code
declares this owner before repository/process owners so Rust reverse drop order
releases handles first. Process fixtures retain explicit close/join because the
root module must reveal, not conceal, lifecycle leaks.

This replaces local cleanup helpers and ignored `remove_dir_all` calls for
test-owned roots. Production deletion and deletion-behavior tests remain at
their existing seams. A third-party tempfile crate was rejected because the
required panic/secondary-diagnostic contract is small and project-specific.

### Verification and target construction are separate workflows

`verify-synthesis-sidecar.yml` is reusable and also triggers on relevant push
and pull-request paths. Linux owns fmt, clippy, shared parity/license gates and
full workspace tests; Windows and macOS own full workspace tests. All workspace
test invocations use `--no-fail-fast`. A final job emits a closed
`synthesis-sidecar-verification-result.v1` only after all hosts succeed.

The manual prebuild plan resolves one trusted receipt before its matrix. Only
same-repository push/manual receipts are release evidence; PR runs cannot cross
the trust seam. The seven target jobs then construct or restore packages and
run target-specific checks. Native targets always execute current-run worker,
durable-process, and archive evidence. Common gates are not repeated in matrix
jobs.

### One identity module returns four named identities

Extend release governance with one function that owns normalized input
enumeration and returns:

- `sourceFingerprint`: runtime source, Cargo inputs, toolchain, and embedded
  runtime contracts.
- `buildFingerprint`: source identity plus build recipe and inputs affecting
  bundle bytes or manifest inventory.
- `verificationFingerprint`: build identity plus test sources, test support,
  parity/smoke/check scripts, and verifier configuration.
- `pipelineRevision`: prebuild/cache/stage/sync/result orchestration inputs.

The production embedded build identity uses `buildFingerprint`; provenance also
records `sourceFingerprint`. Co-located Rust unit tests remain conservatively in
source identity. Separately maintained allowlists or workflow-computed hashes
are rejected because they recreate the drift this module removes.

### Cache resolution produces candidates, not trust decisions

The resolver searches non-expired prior prebuild runs across source SHAs for an
exact `(sourceFingerprint, buildFingerprint, target)` match. The matrix receives
a candidate, downloads it, and revalidates its target, closed bundle manifest,
fingerprints, size, and digest. Failure converts only that target to a typed
cache miss and builds it locally. A successful restore preserves exact donor
bytes. Native restored targets still run current-run smoke.

This keeps partial-run recovery while avoiding a new mutable cache index on the
immutable prebuild branch. GHA retention limits reuse duration; after expiry the
normal correct behavior is a build.

### Result v3 is the release-eligibility seam

The v3 parser accepts a closed top-level document containing repository,
workflow/run/request/current source identities, all four identities, a trusted
verification reference, immutable set identity, and exactly seven target
records. Target evidence is a closed union:

- `built`: current artifact run/source, digest/bytes, and smoke evidence.
- `reused`: donor run/source, retained digest/bytes, and current-run smoke when
  applicable.

Historical v1/v2 parsers return audit-only values. A separate
`assertReleaseEligiblePrebuildResult` accepts only v3, preventing callers from
silently widening legacy results. The immutable set and bundle schemas remain
unchanged because verification and donor provenance describe the run, not the
archive bytes.

## Risks / Trade-offs

- [Broad verification path filters increase CI use] → Keep filters limited to
  sidecar, contracts, package scripts, and the two workflows; prebuild remains
  manual.
- [Conservative source identity misses some cache reuse] → Prefer false misses
  over treating changed runtime bytes as equivalent; do not parse Rust cfgs.
- [GHA retention eventually removes donors] → Treat expiry as a normal miss and
  build; immutable completed sets remain release evidence, not a mutable cache.
- [Workflow split could omit a former gate] → Represent gates in semantic
  contract tests and compare the old inventory before removing matrix steps.
- [Fixture migration can obscure deliberate cleanup tests] → Exempt only tests
  whose subject is cleanup and record each exemption during the inventory pass.

## Migration Plan

1. Land the test-root owner and migrate test-owned roots; make local workspace
   tests collect all failures and eliminate event-order sleeps.
2. Land identity/result contract tests and the v3 governance implementation.
3. Add the verifier, then slim prebuild to consume its receipt and emit v3.
4. Update sync/release consumers, Skills, and the pending R9a evidence contract.
5. Push the complete change, require the automatic three-host verifier to pass,
   then dispatch one new authorized seven-target prebuild and synchronize its
   verified set. Rollback is source revert; legacy results stay audit-readable
   but never regain release eligibility.
