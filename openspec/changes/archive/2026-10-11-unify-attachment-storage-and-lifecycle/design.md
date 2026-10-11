# Design

## Context

See proposal.md for motivation. The current Bridge CLI already emits stored-file creation. Files are staged through duplicated factories; uploads combine opaque ids with display names; workflows write adjacent outputs before deciding attachment replacement. Native replacement has a journal but does not mark companion-only changes for sync.

## Goals / Non-Goals

Keep Workflow Host v12 and Bridge v2 stable. Preserve adjacent outputs and direct overwrite, with stored creation and linked-result reuse. Retain mutation authority, approval, operation replay and failure evidence. Do not add storage settings, output provenance, version history, manual-edit protection, automatic conversion, or a new test runner.

## Decisions

- Consolidate staging into the existing prepared-file owner and reuse one runtime-bound factory. Keep resource resolution at adapters and shared trusted execution outside hostApi's explicit projection.
- Separate human display names from physical filenames. Shared platform naming normalizes a main filename; companion paths are validated rather than silently rewritten. Preserve extensions and Unicode within a bounded filename budget. Bridge upload directories are opaque and private; default imported names come from descriptor metadata. Replay compares caller intent before ephemeral-resource resolution.
- Use one small runtime temporary-ownership admission mechanism for attachment scopes, upload leases and cleanup. Acquisition is synchronous, cleanup reserves exclusive ownership before awaiting deletion, and scope disposal releases only after cleanup. Upload expiry deletes only bytes created by this registry, never arbitrary registered sources.
- Keep package-specific output semantics in packages. Resolve complete candidate pages before writes. Prefer exact paths, then unique stored filenames, reject ambiguity and unavailable results. Stage adjacent sets in sibling temporary directories, backup only output targets, promote and perform attachment mutation, and restore confirmed failures. Preserve backups and expose recovery state for unknown/repair-required outcomes.
- Keep stored replacement journal and identity. On changed content, mark to_upload and choose a main mtime distinguishable from the old and synced times under native second-precision comparison. Preserve synced hash/time for conflict checking; never force upload. Restore prior sync state on rollback and include new state in restart recovery.
- Resolve synced alignment beside a matched translation attachment first, then use the established adjacent path fallback.

## Risks / Trade-offs

- Adjacent and stored files remain two copies by user choice; confirmed failures restore adjacent outputs, uncertain native outcomes retain recovery files instead of inventing atomic success across filesystem and Zotero.
- Existing filename-based result identity cannot distinguish duplicate source names under one parent; fail explicitly before writes instead of guessing or introducing provenance.
- Native sync varies by provider; validate queue admission, ZIP contents and mocked WebDAV comparison in addition to Node tests, and report unavailable real-account validation separately.
- Windows path constraints apply even when a file is created on Linux and later synced; validate before native effects and preserve the original title.

## Migration Plan

No data migration. New writes follow the unified behavior. Old links continue to work; the recovery guide uses Zotero's native conversion after restoring missing sources and states that conversion changes the attachment key. Ship code and builtin workflow changes together. Do not automatically delete historical orphan paths during upgrade.
