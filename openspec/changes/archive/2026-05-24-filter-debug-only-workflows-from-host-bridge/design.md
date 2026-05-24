# Design

Host Bridge should not define a second debug-only policy. The existing
`workflowVisibility` helper already gates `debug_only: true` manifests through
`isDebugModeEnabled()`, and UI surfaces use that helper.

The bridge workflow list and submit lookup will use visible loaded workflows
instead of raw loaded workflows. In non-debug mode, a direct submit request for a
debug-only id returns the existing `workflow_not_found` response. In debug mode,
the same workflow remains listed and submittable.

Task and run status endpoints are intentionally left alone because they report
records that may have been created while debug mode was enabled.
