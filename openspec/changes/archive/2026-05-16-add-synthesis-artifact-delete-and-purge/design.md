# Design: Synthesis Artifact Delete And Purge

## Lifecycle

Delete is a soft-delete operation. The service removes the topic from the active
artifact index, copies its current topic directory into `synthesis/deleted/`,
removes the active topic directory, marks the topic definition deleted, removes
active resolver and resolved paper set entries, writes a deleted-artifact
registry record, logs the operation, and refreshes the mirror.

Purge is a destructive cleanup operation for the deleted store only. It removes
deleted topic directories and clears the deleted-artifact registry. It never
touches active topic assets, ACP run workspaces, registry projections, graph
projections, or the Zotero anchor item.

## UI

The Workbench web panel remains host-owned. Delete and Purge are host commands;
the frontend never receives canonical paths or deletes files directly.

Delete requires confirmation and removes the row from the active Artifacts view
after the service refreshes the snapshot. Purge Deleted requires confirmation
and clears the deleted-artifact cleanup queue.

## Consistency

Lifecycle mutations run under the library write lock. If mirror refresh fails,
the canonical mutation remains successful and the result includes a warning so
the next snapshot can surface degraded mirror state.
