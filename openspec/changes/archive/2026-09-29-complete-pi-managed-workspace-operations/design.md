# Design

## Context

See proposal.md. C08 has an owner lock, a version-one atomic manifest, source fingerprinting, and generated-file promotion. Its current source operation commits one copy per call; callers must create generated staging files themselves.

## Goals / Non-Goals

**Goals:** Reuse that owner and manifest for page-atomic source copies and streamed text output.

**Non-Goals:** A new workspace service, a second file registry, a manifest migration, or Pi catalog behavior.

## Decisions

1. Add `materializeOrReuseMany(inputs)` and make the existing single-file method delegate to it. Under the existing owner lock, inspect and fingerprint the ordered inputs, identify reusable copies, check the per-file, per-call, and owner quotas, then copy new files and commit the manifest once. Roll back only new files on any failure. Keep no source path in the manifest.
2. Add `beginGeneratedTextOutput(suffix)` returning `append`, `commit`, and `discard`. Only fixed `.md`, `.json`, and `.ndjson` suffixes are accepted. Stage under the private owner directory, count UTF-8 bytes on append, and use the existing generated-output promotion at commit. `commit` returns path, size, and SHA-256; `discard` is idempotent.
3. Preserve a failed cleanup as a stable pending-cleanup error. A caller may report uncertain local file effect, but must not claim a clean rollback or retry automatically.

## Risks / Trade-offs

- An owner lock held across source copies can delay another materialization for the same owner. This keeps manifest admission and rollback simple; measure throughput before adding per-file locking.
- A process crash can leave a private staging file. It is never a committed manifest artifact; later owner cleanup may remove it.

## Migration Plan

No persisted schema changes. Existing single-file callers keep their return shape. Validate and archive this prerequisite before C13 implementation.
