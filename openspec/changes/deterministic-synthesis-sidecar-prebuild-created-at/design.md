## Context

Two dispatched runs proved that deterministic `createdAt` formatting was
necessary but insufficient. Cache discovery searched recent workflow runs
without constraining `head_sha`, then relied on bundle fingerprint validation.
Native source and build fingerprints intentionally omit workflow-only changes,
while bundle manifests bind the full source commit. A donor from another SHA
can therefore validate its binaries yet still contribute different immutable
bundle bytes.

Windows symbols were keyed by build fingerprint even though their strict
manifest contains `sourceCommit`. The publisher compensated by ignoring that
field when comparing manifests. This loses exact-source provenance and cannot
handle real PDB byte differences between sources.

Bare `tar` resolves to Windows system bsdtar outside Git Bash. It rejects both
GNU's `--force-local` and the deterministic staging option `--sort=name`. Git
for Windows includes GNU tar and gzip, but invoking its tar without adding the
same `usr/bin` to `PATH` leaves gzip unavailable. Native backslash paths passed
through `tar -C` also fail under the GNU executable.

## Goals / Non-Goals

**Goals:**

- Reuse artifacts only when their workflow run has the requested source SHA.
- Preserve one immutable Windows symbol set per source SHA.
- Use one governed tar runtime and portable archive path shape.
- Keep immutable publication fail-closed and identify the conflicting surface.

**Non-Goals:**

- Make binaries from distinct source SHAs byte-identical.
- Add a cache index, migrate old symbol directories, or add a dependency.
- Change runtime bundle, prebuild result, or release-set schemas.
- Archive the OpenSpec change before remote idempotence evidence succeeds.

## Decisions

### 1. Filter runs by exact source SHA before artifact discovery

`resolveSynthesisSidecarRuntimeCache` filters recent runs by the normalized
requested SHA, in addition to excluding the current run. Later fingerprint and
archive validation remains defense in depth. Filtering once at the shared
resolver prevents every target from seeing cross-source candidates.

### 2. Govern the tar executable and its paths

On Windows, archive governance derives the Git installation from
`git --exec-path`, selects its bundled GNU `tar.exe`, verifies bundled
`gzip.exe`, and prepends that `usr/bin` to the child environment. Other hosts
continue to resolve `tar` from `PATH`.

Deterministic creation retains GNU's sorting, timestamp, and ownership flags.
Creation runs from the staging directory with a local archive filename and a
forward-slash input root. Listing and extraction run from the archive or output
directory with a basename or relative forward-slash archive path. This removes
`--force-local`, absolute archive drive letters, and extraction `-C` paths.

### 3. Address symbols by source SHA

The immutable branch stores symbols at `symbols/<sourceSha>/win32-x64`. The
publisher byte-compares an existing source slot exactly. The prior manifest
equivalence exception is deleted: distinct sources no longer collide, while
different bytes for the same source remain an error. The symbol manifest's
`sourceCommit` must equal the requested source before publication.

### 4. Label conflicts at the shared copy boundary

The existing `copyOrVerifySet` path receives a short surface label. Runtime and
Windows-symbol callers retain one comparison implementation while reporting
which immutable store conflicted.

## Risks / Trade-offs

- Exact-SHA reuse gives up cross-source cache hits for workflow-only changes.
  Broader reuse would require a separate canonical bundle identity and migration.
- Existing build-fingerprint-keyed symbol directories remain in branch history
  but receive no new writes. No current consumer reads them.
- Windows requires Git for Windows' bundled GNU tar and gzip. Both are already
  part of the repository's Git prerequisite; absence fails explicitly.

## Validation

1. Ignore a newer donor SHA and select the exact-source cache run.
2. Create and extract a real tar.gz through the governed process boundary.
3. Retain separate PDB bytes for two source SHAs sharing a build fingerprint;
   reject changed bytes for one source with a symbol-specific conflict.
4. Run focused tests, type checks, formatting, freshness, and OpenSpec validation.
5. Commit and push the authorized implementation, dispatch the same SHA twice,
   and verify the second publication is a no-op before archive.
