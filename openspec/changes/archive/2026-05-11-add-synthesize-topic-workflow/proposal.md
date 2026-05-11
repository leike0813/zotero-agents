# Add Synthesize Topic Workflow

## Why

Synthesis Layer needs a workflow contract that lets ACP Skills agents generate
topic synthesis output while keeping formal writes under plugin control. The
workflow must carry base hashes and produce a verifiable result bundle before
applyResult can persist current artifacts.

## What Changes

- Add `synthesize-topic` workflow contract for create/update topic synthesis.
- Define and validate the workflow result bundle shape.
- Require base hashes to roundtrip from request to result bundle.
- Validate Markdown, metadata, Topic Definition, Resolver, Resolved Paper Set,
  diagnostics, and topic timeline content.
- Add apply decision helpers for happy path and base-hash mismatch conflicts.
- Exclude full canonical file writes, Zotero mirror refresh, ACP skill package
  implementation, and UI triggers from this change.

## Capabilities

### New Capabilities

- `synthesize-topic-workflow`: Workflow result bundle and applyResult decision
  contract for `topic_synthesis`.

### Modified Capabilities

None.

## Impact

- Adds workflow contract helpers under `src/modules/synthesis/`.
- Adds tests for result bundle validation and compare-and-swap decisions.
- Adds builtin workflow manifest skeleton for discoverability.
