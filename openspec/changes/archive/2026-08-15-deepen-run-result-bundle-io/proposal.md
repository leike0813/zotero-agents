## Why

Four modules repeat the same run-result-to-bundle-reader policy: non-empty
`bundleBytes` become a temp zip, `bundleDir` opens a directory reader, and
missing sources open an unavailable reader. Each caller also tracks
`bundlePath` and removes the temp file in its own `finally`, so Bundle I/O owns
the primitives but not the decision or the lifecycle.

## What Changes

- Add one `openRunResultBundleReader` entry to Bundle I/O returning a handle with `bundleReader`, `bundlePath`, and idempotent `dispose()`.
- Own the bytes → temp zip, directory, and unavailable branches inside Bundle I/O, including `ZipBundleReader` construction.
- Migrate the apply seam, sequence step apply, SkillRunner foreground continuation, and SkillRunner bundle settlement to the one handle lifecycle.
- Keep extracted zip directory cleanup with `ZipBundleReader` and test leak handling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Require one Bundle I/O seam for run-result reader opening and disposal.

## Impact

- `src/modules/workflowExecution/bundleIO.ts` and four caller modules.
- New Bundle I/O contract tests; existing workflow execution and SkillRunner integration suites remain green.
- Architecture document and workflow-execution-seams OpenSpec.
- No result context, persistence format, provider protocol, or apply hook behavior changes.
