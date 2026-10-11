# Proposal

## Why

Issue #57 exposed permanent attachments linked to expiring Bridge uploads and Windows-invalid filenames. Current code imports stored attachments, but preparation ownership, file naming, workflow replacement, and companion-only sync still leave related lifecycle gaps.

## What Changes

- Unify stored-file preparation, portable physical filenames, lease-aware cleanup, and trusted workflow execution while preserving v12/v2 public interfaces.
- Keep workflow outputs beside their source and overwrite on rerun; resolve exact paths before unique stored filenames, stage complete output sets, and restore confirmed failed updates.
- Mark changed stored attachment sets for native file sync, including companion-only changes, without bypassing remote conflict detection.
- Document attachment ownership and recovery of old linked attachments; do not migrate old data or introduce storage preferences, manual-edit protection, or version history.

## Capabilities

### New Capabilities

- `attachment-file-lifecycle`: Permanent stored content, portable naming, preparation ownership, and complete-set synchronization.

### Modified Capabilities

- `host-bridge-file-downloads`: Upload naming, metadata defaults, leases, and owned-byte cleanup.
- `workflow-host-api-v12`: Shared trusted preparation and stored replacement synchronization.
- `runtime-persistence-governance`: Refuse temporary cleanup during active attachment ownership.
- `mineru-workflow-result-materialization`: Stored creation and safe replacement of source-adjacent output sets.
- `literature-workbench-workflows`: Unambiguous output matching, staged adjacent overwrites, and synced translation alignment discovery.

## Impact

Touches Host Bridge file registry/adapter, prepared-file and native mutation owners, Workflow Host composition, runtime filesystem/governance, MinerU and literature workbench hooks, existing tests, and user/developer documentation. No new dependency, CLI mode, public capability, automatic migration, commit, or release is required.
