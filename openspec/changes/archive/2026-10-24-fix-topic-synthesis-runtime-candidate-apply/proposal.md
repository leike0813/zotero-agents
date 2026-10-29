# Proposal

## Why

Update Topic Synthesis can finish every analysis stage and then fail apply because the Agent's final JSON changes the captured manifest and metadata hashes. The runtime candidate retains the correct values, but the workflow previously applied the returned JSON instead.

## What Changes

- Apply the complete runtime candidate declared by the artifact manifest before materializing the closed bundle and assets.
- Reject missing or malformed declared candidates with `invalid_request`; retain cancellation and existing direct bundle/patch behavior.
- Preserve the prepared artifact, manifest and metadata hashes through the existing native compare-and-set check.
- Align finalize instructions, generated Skill content, documentation and the existing workflow specification.
- Cover returned-JSON drift and real stale-basis refusal through the existing hook and native sidecar tests, and recover the original failed run through the existing debug reapply capability when its Bridge instance is available.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesize-topic-workflow`: define the declared runtime candidate as the apply input and state the three prepared hashes used for full-update concurrency protection.

## Impact

The Synthesis workflow apply hook and package-local artifact reader, finalize Skill renderer/generated instructions, workflow documentation and existing hook/native tests. Public DTOs, schemas, runtime hash production and native CAS algorithms are unchanged. Recovery uses the saved candidate without forcing apply or overwriting the runner result; it adds no UI or new recovery API. The main specification has already been synchronized; this change records the implemented behavior and outstanding recovery. Publication and Git commits are outside this change.
