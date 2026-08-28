## Context

The current prebuild result combines two independent facts: seven archives were
constructed and verified as bundles, and an earlier three-host verification run
passed. This creates a temporal dependency that provides no additional build
correctness while making development construction unavailable whenever parity,
lint, or another release gate is red.

The prebuild branch is an append-only content-addressed store. A result must bind
the commit from which its set can be read, but correctness must not depend on
that commit remaining the branch head.

## Goals / Non-Goals

**Goals:**

- Keep routine seven-platform construction available for every exact pushed SHA.
- Keep the current complete verification roster mandatory for formal release.
- Concentrate evidence parsing, identity joins, and immutable-set validation in
  tested TypeScript interfaces rather than YAML/JQ fragments.
- Make the common command complete through local atomic synchronization.
- Preserve unrelated worktree changes and existing sibling native binaries.

**Non-Goals:**

- Automatically dispatch verification from the development prebuild command.
- Relax archive, native-smoke, provenance, license, freshness, or release gates.
- Add verification profiles, promotion attestations, or another persistent
  operation store.
- Publish, sign, release, or synchronize Gitee.

## Decisions

### 1. Prebuild result v4 is build-only evidence

`synthesis-sidecar-runtime-prebuild-result.v4` binds repository, workflow run,
request, exact source, source/build fingerprints, prebuild pipeline revision,
aggregate, immutable-set commit/path, and seven closed target evidence entries.
It contains no verification receipt or release-eligibility claim.

### 2. Verification result v2 is independent release evidence

`synthesis-sidecar-verification-result.v2` binds the exact verification inputs,
producer revision, source/build fingerprints, run metadata, accepted event, and
three-host success. The resolver validates artifact values against GitHub run
metadata and returns structured diagnostics instead of swallowing every miss.

### 3. Release set v2 is the only evidence join

Release preparation validates one v4 set and resolves one trusted v2 receipt.
It allows cross-SHA receipt reuse only when source/build/verification identities
and verification producer revision match. The resulting release set embeds both
documents and binds its ID to their identities and the release pipeline revision.
Its `sourceCommit` is the sidecar source commit. The later `main` commit that
contains the release-set file is passed separately as the prepared workflow
SHA, avoiding a self-referential commit identity.

### 4. Governed identities are closed by lane

- `sourceFingerprint` covers shipped Rust runtime and shared runtime contracts.
- `buildFingerprint` adds recipe and packaging inputs.
- `verificationFingerprint` adds every Rust/Node oracle, fixture, checker, and
  test input that can change the verification result.
- `prebuildPipelineRevision`, `verificationPipelineRevision`, and
  `releasePipelineRevision` cover their respective orchestration code only.

### 5. One script owns immutable publication

The publisher validates all archives and target evidence, stages the set,
observes or appends it on the prebuild branch, retries bounded non-fast-forward
conflicts, and renders v4 through the shared contract. It never force pushes or
rewrites an existing set.

### 6. Development command is the public prebuild seam

The command derives repository/ref/SHA from the current attached branch unless
explicitly supplied, requires remote ref equality, and permits unrelated dirty
paths. With synchronization enabled it refuses to overwrite dirty sidecar bundle
roots. It dispatches or resumes one exact run, downloads and validates v4,
fetches the recorded commit, atomically synchronizes all seven bundles, runs
freshness, and emits stable JSON. Missing or failed release verification is a
reported release blocker, not a build failure.

### 7. Rust-private schema markers are not cross-owner observables

Application parity removes the Rust-owned
`reference_redirect_graph_schema_version` row by key from Rust projections.
The Node projection and all unrelated rows remain compared. Rust repository
tests remain the authority for the exact current marker value and migrations.

## Risks / Trade-offs

- Build-only sets can exist without release eligibility. Their v4 schema and
  command output make this status explicit, and formal release accepts only a
  release-set v2 containing trusted verification.
- The development command modifies tracked bundle files by default. It checks
  overlapping dirty paths immediately before synchronization and preserves the
  existing tree on any validation or swap failure.
- Existing v3 workflow artifacts cannot authorize current operations. Their
  per-target archives remain eligible cache candidates only after full validation.

## Migration Plan

1. Repair parity normalization and lock it through the existing public checker.
2. Introduce v4/v2/v2 contracts and lane-specific identities.
3. Convert verification and prebuild producers, then formal release consumers.
4. Add the development command and exact-commit synchronization.
5. Update Skills, R9a dependency records, and current packaging documentation.
6. Run local gates. Remote prebuild evidence requires separate authorization.
