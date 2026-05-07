# Design

## Lifecycle Semantics

`Cancel Run` and `Archive` are separate user actions:

- `Cancel Run` applies only to non-terminal ACP Skills and SkillRunner runs. It requests cancellation through the existing backend/controller path.
- `Archive` applies only to terminal objects. It marks the record archived and hides it from the default drawer/list view.
- Archive is non-destructive. Persisted history remains available for diagnostics and future explicit tooling.

Terminal statuses follow the existing panel status helper and include succeeded, failed, and canceled states.

## Drawer Item Actions

The managed workspace/task drawer receives item-level actions through an `itemActions` array on task items. The renderer displays each task as:

- a main selection button
- a right-side action cluster

This avoids nested buttons and guarantees the archive button does not trigger task selection. The archive button uses a shared briefcase icon style and the `归档` / `Archive` accessible label.

## Panel Integration

ACP Chat already supports conversation archiving through `archive-conversation`. The model injects that action into conversation drawer items.

ACP Skills adds `archivedAt` to run records and summaries. `archive-run` marks terminal runs archived and hidden. Existing `removedAt` remains available for canceled/removed records; default snapshots filter either marker.

SkillRunner adds `archivedAt` to request ledger records. `archive-run` marks terminal ledger records archived and hidden from the managed drawer. It does not call backend cancel.

## Compatibility

Existing destructive remove/cleanup helpers remain unchanged. Existing action envelopes remain stable except for the new `archive-run` action.
