## MODIFIED Requirements

### Requirement: Backend manager MUST open SkillRunner management through Dashboard

Backend Manager MUST route SkillRunner profile management to the shared
Dashboard backend tab surface.

#### Scenario: open management from backend profile row

- **WHEN** 用户点击 SkillRunner profile 行的“进入管理页面”
- **THEN** 插件 MUST open or focus Task Dashboard
- **AND** Dashboard MUST select that backend tab's management subview
- **AND** Backend Manager MUST NOT open a standalone ztoolkit management dialog.
