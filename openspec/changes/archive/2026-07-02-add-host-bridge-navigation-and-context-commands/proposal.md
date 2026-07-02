# Add Host Bridge Navigation and Context Commands

## Why

Hermes and the Zotero Librarian profile need stable semantic commands for
reading the current Zotero context and navigating users to Zotero objects.
Current context capabilities are available only through raw capability calls,
which makes agent instructions weaker and leaves object navigation without a
canonical Host Bridge surface.

## What Changes

- Add authenticated Host Bridge REST endpoints for current context, current
  selection, and restricted Zotero object navigation.
- Add canonical `zotero-bridge context ...` CLI commands.
- Update Host Bridge surface/profile sources and render generated surfaces.

## Non-Goals

- Do not implement Zotero writes, note writeback, file upload, backend
  diagnostics, task history, webhook delivery, watch streams, or cursors.
- Do not expose arbitrary URI opening, local path opening, JS evaluation, or
  raw Zotero internals through semantic navigation commands.
