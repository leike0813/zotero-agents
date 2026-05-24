# filter-debug-only-workflows-from-host-bridge

## Why

Debug-only workflows are hidden from normal plugin workflow menus, but Host Bridge
workflow discovery and submit paths used the raw loaded workflow registry. That
allowed non-debug builds to list or invoke `debug_only: true` workflows through
the bridge API or CLI if the workflow id was known.

## What Changes

- Apply the existing workflow visibility policy to Host Bridge workflow listing.
- Apply the same policy to Host Bridge workflow submit lookup so hidden
  workflows behave as not found.
- Keep task and run status endpoints unchanged; they continue to report existing
  historical records.

## Impact

- Affected spec: `workflow-execution-seams`.
- Affected code: Host Bridge workflow-control list and submit lookup.
- Affected tests: Host Bridge workflow-control debug-mode list/submit coverage.
