# Design: Host SkillRunner Management In Dashboard

## Dashboard Subview

SkillRunner backend tabs keep the existing runs table as the default subview.
The Dashboard state tracks a selected subview per backend id (`runs` or
`management`). The backend snapshot exposes the selected subview plus the
normalized management UI URL.

## Management Host

The Dashboard frontend renders the backend-native management page in the
SkillRunner backend tab when the subview is `management`. The host is only an
external page container pointed at `${baseUrl}/ui`; it does not import or
reimplement SkillRunner management UI code. It includes a back button to return
to the runs subview and an external-open fallback.

## Entry Routing

Dashboard `open-management` switches the selected backend tab to the management
subview. Backend Manager “Open Management UI” opens or focuses the Dashboard at
that backend tab and requests the management subview, instead of opening a
standalone ztoolkit dialog.

## Compatibility

The Dashboard host is already used across Zotero 7 and Zotero 9. This change
removes the standalone management dialog from the main path and keeps URL
normalization as an internal helper.
