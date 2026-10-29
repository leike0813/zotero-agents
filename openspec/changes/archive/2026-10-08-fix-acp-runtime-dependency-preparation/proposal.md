# Proposal

## Why

ACP Skills cold starts currently download large Python dependency chains independently for concurrent runs and fail after two minutes. The live Windows instance recorded four such failures while downloading PyMuPDF, layout models, NumPy and ONNX Runtime; timeout diagnostics also discarded partial pipe output.

## What Changes

- Prepare dependencies in the background after startup for loaded workflows compatible with an enabled ACP backend.
- Share context-identical in-flight preparations and serialize all dependency preparations, prioritizing foreground requests.
- Allow foreground preparation up to fifteen minutes including queueing and retries, with independent waiter cancellation and bounded shutdown.
- Preserve partial subprocess output and correct dependency preparation lifecycle diagnostics.
- Keep uv as the cache owner and validate each task's own context instead of persisting readiness in the plugin.

## Capabilities

### New Capabilities

- `acp-runtime-dependency-preparation`: Catalog-based background warmup and context-safe, cancellable preparation scheduling.

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: Shared dependency preparation for normal and recovered runs, with a fifteen-minute bound and truthful diagnostics.
- `runtime-platform-services`: Cancellable one-shot execution with bounded partial output preservation.

## Impact

Changes affect ACP dependency planning, plugin startup/shutdown, workflow catalog notifications, backend configuration observation and shared subprocess execution. Existing workflow/provider wire contracts, interpreter selection, Hermes launch behavior and dependency version declarations remain intact. No new dependency, release, schema migration or user-facing page is required.
