# Design

## Context

Synthesis startup currently reads legacy Topic snapshots before publishing the repository and canonical store. The canonical snapshot reader treats every non-managed file below the historical Topic directory as Topic content, while the legacy TypeScript writer placed a rendered export under `current/assets`. Repository migration also receives Topic projections as one slice, and the application read paths project an entire repository page before returning it. These boundaries make one retained cache or one damaged Topic capable of stopping unrelated state.

See `proposal.md` for the observed failure and required outcomes, and the two delta specs for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Accept the known historical export layout while retaining its bytes as recovery evidence.
- Give each recognized Topic an independent migration and read outcome.
- Persist enough pending metadata to retry after process restart without inventing content.
- Keep damaged Topic work out of unrelated list, search, and startup results while preserving actionable diagnostics.

**Non-Goals:**

- Repairing or regenerating missing Topic content.
- Changing the protocol DTOs or the repository foundation schema version.
- Automatically deleting historical files or pending state.

## Decisions

1. **Treat only unreferenced legacy exports as compatibility files.** Historical reads skip ordinary files under `assets` that are not declared by the manifest snapshots or sections. The original historical tree remains untouched. New writes continue to use the existing strict representation validation, which rejects undeclared assets and traversal.

2. **Represent migration failure as a durable topic state.** The repository keeps a private `legacy_topic_migration_pending` metadata map. A successful migration publishes all valid projections in one repository publication. Invalid Topic sources are recorded in the same publication with their stable error code. Graph rows and the legacy backup remain available.

3. **Retry by topic, then commit the recovered projection transactionally.** On a later startup, only pending Topic IDs with a retained canonical-bearing graph row and no application state are retried. A reprojected Topic is accepted only when the canonical snapshot basis matches the projection. Its state, projection, and pending-record removal commit together. A failed retry stays pending and does not block other Topics.

4. **Keep per-Topic unavailability separate from shared-store failure.** The canonical store records pending and unavailable paths and returns the existing `Invalid` state for Topic validation errors. The application list and workbench projection skip unavailable rows but advance their cursor by scanned repository rows. `returned` counts only returned rows. Repository, lock, ownership, transaction, cancellation, and shared canonical errors still propagate.

5. **Enforce completeness at the export boundary.** A complete durable bundle cannot be published while pending Topic repairs remain. Import recovery and ordinary store opening continue to work, so one pending Topic cannot prevent the next startup from making progress or recovering an interrupted import.

## Risks / Trade-offs

- Retained invalid files increase recovery evidence and may require a user-visible diagnostic → Preserve paths and content, classify only the owning Topic, and expose stable codes through health and Topic detail.
- Skipping a currently unknown historical asset could hide a future authoritative file → Only ignore unreferenced non-Markdown files during historical reads; manifest-declared paths and current writes retain strict validation.
- Cursor movement with fewer returned rows can be mistaken for a lost page → Define pagination by scanned rows, preserve `next_cursor`, and cover an entirely unavailable page.

## Migration Plan

Deploy the Rust sidecar change, rebuild the Windows runtime from the current source, and run the existing legacy migration on an isolated copy. The first startup creates the usual content-addressed database backup and records pending Topic IDs without deleting files. A repaired source is retried on the next startup. Rollback consists of restoring the pre-migration database and canonical tree; no schema-version upgrade or new wire field is required.
