## 1. Restrict Cache Reuse to the Requested Source

- [x] 1.1 Change the cache resolver test so a cross-SHA donor is ignored and an exact-source candidate is selected.
- [x] 1.2 Filter workflow runs by the normalized requested source SHA before listing artifacts.
- [x] 1.3 Keep exact-source expiry and Windows symbol companion checks covered.

## 2. Make Cached Archive Extraction Portable

- [x] 2.1 Add a process test that creates and extracts a real runtime tar.gz through the download boundary.
- [x] 2.2 Extract from the output directory with a relative forward-slash path, without `tar -C` or GNU-only flags.
- [x] 2.3 Resolve Git for Windows GNU tar and gzip through the shared archive-governance module.
- [x] 2.4 Use local archive names or relative forward-slash paths for deterministic creation, listing, and extraction.

## 3. Publish Windows Symbols by Source SHA

- [x] 3.1 Retain distinct symbol bytes for two source SHAs sharing one build fingerprint.
- [x] 3.2 Store symbols under `symbols/<sourceSha>/win32-x64` and require the manifest source commit to match.
- [x] 3.3 Remove cross-source manifest equivalence and keep same-source byte conflicts fail-closed.
- [x] 3.4 Distinguish runtime-set conflicts from Windows-symbol conflicts.

## 4. Local Validation

- [x] 4.1 Run the focused Synthesis sidecar packaging and promotion tests.
- [x] 4.2 Run `npx tsc --noEmit` and `npm run check:synthesis-engine`.
- [x] 4.3 Run formatting checks for the changed source and test files.
- [x] 4.4 Run `npm run check:synthesis-sidecar-runtime-freshness`.
- [x] 4.5 Validate the OpenSpec change.

## 5. Remote Idempotence Evidence

- [x] 5.1 Commit and push the authorized implementation, dispatch the exact pushed SHA twice, and verify the second publication is a no-op.
- [ ] 5.2 Archive only after the remote evidence succeeds.
