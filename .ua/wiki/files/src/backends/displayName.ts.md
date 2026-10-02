
# src/backends/displayName.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/backends](../../../modules/src/backends.md)
<!-- node: file:src/backends/displayName.ts -->

解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。
源码：[src/backends/displayName.ts](../../../../../src/backends/displayName.ts)

## 符号（1）
<!-- node: function:src/backends/displayName.ts:resolveBackendDisplayName -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveBackendDisplayName | 函数 | 7–23 | 简单 | utility、backend、i18n、resolution | 0 | 按优先级解析后端展示名：托管本地后端走本地化文案，其次用户配置名，最后回退后端 ID。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [identity.ts](identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [localizationGovernance.ts](../utils/localizationGovernance.ts.md) | src/utils/localizationGovernance.ts | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillsWorkspaceSurface.ts](../modules/acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [dashboardFrame.ts](../modules/dashboard/dashboardFrame.ts.md) | src/modules/dashboard/dashboardFrame.ts | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |
| [dashboardRuntime.ts](../modules/dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](../modules/dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [skillRunnerBackendToasts.ts](../modules/skillRunner/surface/skillRunnerBackendToasts.ts.md) | src/modules/skillRunner/surface/skillRunnerBackendToasts.ts | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialog.ts](../modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveBackendDisplayName | 函数 | 7–23 | 按优先级解析后端展示名：托管本地后端走本地化文案，其次用户配置名，最后回退后端 ID。 |
