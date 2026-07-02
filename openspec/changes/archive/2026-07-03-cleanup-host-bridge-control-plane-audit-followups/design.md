# Design

## CLI Surface Cleanup

The canonical command tree remains the only supported CLI surface. Legacy top-level wrapper structs that are not wired into `Command` are removed, while canonical `run ...` argument types stay in place.

## Local Validation

CLI validation rejects clearly unsafe object refs and non-opaque file ids before sending requests. Host Bridge remains the authoritative validation and security boundary.

## Notification Projection

Filtered notification reads project only the requested workflow or skill run. Unfiltered reads continue to refresh broad runtime state, but history projection is gated by a short TTL so polling does not repeatedly scan the same full history.

## OpenSpec Hygiene

Archived main specs must use normal `## Purpose` and `## Requirements` structure. Delta headers such as `## ADDED Requirements` are valid only under change directories and are removed from main specs without changing requirement text.
