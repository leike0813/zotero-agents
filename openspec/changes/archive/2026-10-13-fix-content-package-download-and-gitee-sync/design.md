# Design

## Context

See proposal.md. The existing subscription module owns network acquisition and transactional installation; hooks projects shared progress into UI. The Gitee coordinator currently unconditionally synchronizes plugin assets and requires three content channels.

## Goals / Non-Goals

**Goals:** Bound acquisition and preserve trustworthy progress/errors through the existing install and mirror entrypoints.

**Non-Goals:** Parallel downloading, resumable transfers, new preferences, plugin publication, commits or branch switching.

## Decisions

- Keep acquisition in `contentPackageSubscription.ts`, using browser fetch, native abort resolution and the existing bounded-wait utility. Feed deadline covers JSON body; ZIP header/inactivity/total deadlines cover the complete response. Streaming progress is throttled to 200 ms with immediate attempt start/end publication. Clear timers and cancel/release readers on all exits; late completions cannot publish progress.
- Extend progress with optional `download: { receivedBytes, totalBytes, attempt, attempts }`. Keep existing stage/current/total fields; interpolate download percent between its coarse stage and the next stage. `setContentPackageInstallProgress` accepts the download projection, and hooks preserves it. Failure results add `downloadFailures: { url, code, message, httpStatus? }[]` with timeout/http/network/integrity categories.
- Return on first valid primary feed. Resolve relative-only artifact candidates against configured feed roots; explicit assets suppress guessed relative URLs. Validate selected feed size/hash before existing managed ZIP/manifest/transaction processing.
- Preferences owns a local action revision and pending flag: ignore stale refresh results and suppress completion refresh while its own action is pending. Render the action result or caught exception, then restore controls. Other surfaces retain shared progress semantics.
- Add `--content-only` to the existing Gitee coordinator and derive channel pairs from release inventory. Validate GitHub ZIP/checksum bytes before mutation; reuse the low-level upload/readback verifier with replacement disabled. Use an isolated temporary Git repository for the captured GitHub tag/feed and ordinary fast-forward pushes. Verify anonymous mirror downloads and feed after asset verification and feed promotion. Token values never enter printed commands/errors.

## Risks / Trade-offs

- Very slow valid transfer may exceed 120 seconds → fallback and an explicit timeout diagnosis.
- Mirror refs may change during synchronization → normal pushes reject conflicts, with no destructive recovery.
- Windows network behavior is environment-specific → deterministic boundary tests cover stalls; runtime acceptance remains a separate evidence level.

## Migration Plan

No persistent schema migration. Install a new-source XPI to use the downloader fix. Synchronize original v0.8.8 dev assets, then fast-forward the mirror feed; do not rebuild the release or publish another version.
