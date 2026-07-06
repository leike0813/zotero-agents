## Why

Some workflows need local execution planning before provider dispatch. Metadata curation can resolve authoritative metadata inside Zotero and apply immediately, while MinerU-style long PDF processing needs to split one input into multiple provider requests and apply one aggregate result.

The current runtime has only selection validation, request construction, provider execution, and apply. It lacks a first-class place for read-only planning, short-circuit apply, and aggregate apply without pushing workflow-specific behavior into providers.

## What Changes

- Add optional `hooks.preflight` to workflow manifests.
- Run preflight after selection resolution and before `buildRequest` or declarative request compilation.
- Support four preflight outcomes: continue, replace units, short-circuit apply, and skip.
- Add runtime-owned aggregate execution metadata so multiple child requests can produce one final `applyResult` call.
- Extend hook args and result context with preflight and aggregate metadata.
- Keep existing workflows unchanged when no preflight hook is declared.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workflow-runtime`: Add preflight execution planning, short-circuit apply, and aggregate apply semantics.
- `workflow-contract`: Add manifest and hook contract support for optional `hooks.preflight`.
- `result-apply-handlers`: Add result context support for preflight metadata and aggregate child results.

## Impact

- Workflow protocol types, JSON schema, loader, hook bundler, and diagnostics.
- Workflow preparation, run, and apply seams.
- Workflow result context shape consumed by apply hooks.
- Runtime and loader tests for no-preflight compatibility, preflight outcomes, and aggregate apply.
- Workflow authoring/runtime documentation.
