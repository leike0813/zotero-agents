# Change: Host SkillRunner Management In Dashboard

## Why

The standalone SkillRunner management dialog uses `ztoolkit.Dialog` to host the
backend `/ui` page and can render as a blank window in Zotero 9. Retrying XUL
browser and iframe variants did not produce a reliable embedded surface.

## What Changes

- Move the SkillRunner management entry into the existing Task Dashboard backend
  tab surface.
- Keep the backend-native `/ui` page as an external embedded page; do not copy or
  reimplement SkillRunner management UI code in the plugin.
- Let “Open Management UI” switch the selected SkillRunner backend tab from its
  runs view into a management subview.
- Keep a visible fallback path for opening the same URL in the external browser.

## Capabilities

### Modified Capabilities

- `skillrunner-management-page`: management UI is hosted inside the Dashboard
  backend tab rather than a standalone ztoolkit dialog.
- `task-dashboard-skillrunner-observe`: SkillRunner backend tabs expose runs and
  management subviews.
- `backend-manager-ui`: profile row management entry opens the Dashboard
  management subview.

## Impact

No user preference or backend profile schema changes are required. The change is
limited to Dashboard state/snapshot/action handling, Dashboard frontend
rendering, backend manager launch routing, and focused tests/specs.
