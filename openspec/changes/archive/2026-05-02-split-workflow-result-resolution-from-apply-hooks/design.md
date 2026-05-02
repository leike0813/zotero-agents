# Design

## Result context

The apply seam creates `WorkflowResultContext` after it constructs the low-level `BundleReader`. The context is additive and is passed alongside the existing `bundleReader`.

`WorkflowResultContext` is responsible for:

- Loading `resultJson` from `runResult.resultJson`, a provider-local result JSON path, or a bundle entry.
- Resolving artifact references into readable text.
- Returning structured source metadata and candidate paths in failures.

## Path resolution

The resolver supports:

- Absolute local paths returned by ACP runs.
- Relative paths under the provider workspace.
- Bundle entries such as `result/result.json` and `artifacts/digest.md`.
- Legacy marker slicing for `/uploads/`, `/artifacts/`, `/result/`, and `/bundle/`.

Absolute local paths are read directly through runtime file helpers; they are not copied into a bundle projection.

## Compatibility

Existing hooks that only use `bundleReader` continue to work. Migrated hooks should prefer `resultContext.resultJson` and `resultContext.readArtifactText()`, with `bundleReader` fallback retained where useful.

`mineru` remains intentionally directory-oriented because its apply hook consumes the extracted bundle directory as a file tree. The result context is for result JSON and named artifact resolution, not a replacement for `BundleReader.getExtractedDir()`.
