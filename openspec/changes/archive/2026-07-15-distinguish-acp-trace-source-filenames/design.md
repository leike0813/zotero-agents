## Context

Recorder arming already knows the immutable `sourceKind` before it creates the partial file, but the stem currently contains only timestamp and nonce. Replay derives its sample identity by stripping the shared `acp-trace-` prefix, so adding a recorder source token can flow into Replay filenames without a second mapping. Existing audit artifacts must retain their bytes and digest while their filesystem names become source-identifiable.

## Goals / Non-Goals

**Goals:**

- Give Chat and ACP Skills traces distinct deterministic default stems.
- Keep source-to-filename mapping in one recorder helper.
- Let Replay reuse its existing trace-derived sample path.
- Rename existing paired artifacts without rewriting audit contents.

**Non-Goals:**

- Changing semantic trace schema, source kinds, digest calculation, or parsing.
- Renaming source kinds to UI labels inside JSON/NDJSON.
- Rewriting historical `sampleName` provenance inside existing Replay results.

## Decisions

### Use short source tokens after the shared trace prefix

Map `acp-chat-conversation` to `chat` and `acp-workflow-execution` to `skills`, producing `acp-trace-chat-*` and `acp-trace-skills-*`. The mapping uses the recorder's arm-time source kind rather than later binding state, so partial files are correctly named before any Chat connection or Workflow execution claims the recording.

### Preserve Replay derivation as the naming SSOT

`deriveAcpRuntimeReplaySampleName()` already removes `acp-trace-`; it will therefore yield `chat-*` or `skills-*`, and the existing Replay artifact builder will emit `acp-replay-chat-*` or `acp-replay-skills-*`. Adding another source mapping in Replay would duplicate policy and allow drift.

### Historical migration changes paths only

Rename the two existing trace files based on their header `sourceKind`, then rename all paired Replay JSON/Markdown files based on their stored source kind/digest. Do not rewrite NDJSON, JSON, or Markdown bytes. Historical logical `sampleName` values describe the alias captured when those matrices were created and remain valid provenance even though the containing files receive clearer names.

## Risks / Trade-offs

- [A filename is mapped from the wrong source] → Verify both trace headers and every Replay `trace.sourceKind` before applying collision-checked moves.
- [Replay naming policy drifts from recorder naming] → Keep source token generation only in the recorder and test the existing derived sample behavior.
- [Historical artifact digest changes] → Use path-only renames and verify hashes before and after migration.
