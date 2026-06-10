## MODIFIED Requirements

### Requirement: Plugin MUST provide embedded SkillRunner management host

插件 MUST 在 Zotero 内提供 SkillRunner 管理页宿主，并加载后端原生 `/ui` 页面。

#### Scenario: open management page from Dashboard backend tab

- **WHEN** 用户从 SkillRunner backend tab 触发“进入管理页面”
- **THEN** Dashboard MUST 在该 backend tab 内切换到 management 子视图
- **AND** management 子视图 MUST 加载目标 `${baseUrl}/ui`
- **AND** 插件 MUST NOT copy or reimplement SkillRunner management UI code.

#### Scenario: return from management page to runs list

- **WHEN** 用户在 management 子视图触发返回
- **THEN** Dashboard MUST restore the same backend tab's runs subview.

#### Scenario: external fallback remains available

- **WHEN** management 子视图渲染
- **THEN** Dashboard MUST provide an action to open the same `/ui` URL in the
  external browser.

#### Scenario: legacy standalone dialog is not required

- **WHEN** 用户从 backend profile 触发“进入管理页面”
- **THEN** 插件 MUST open or focus Dashboard at the selected backend management
  subview
- **AND** 插件 MUST NOT require the standalone ztoolkit management dialog.
