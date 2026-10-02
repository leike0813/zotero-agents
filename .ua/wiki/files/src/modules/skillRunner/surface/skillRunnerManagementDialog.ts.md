
# src/modules/skillRunner/surface/skillRunnerManagementDialog.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/surface](../../../../../modules/src/modules/skillRunner/surface.md)
<!-- node: file:src/modules/skillRunner/surface/skillRunnerManagementDialog.ts -->

SkillRunner 管理界面的 URL 构造工具：校验并规范化后端 baseUrl，补齐 /ui 路径，为管理面板提供安全的打开地址。
源码：[src/modules/skillRunner/surface/skillRunnerManagementDialog.ts](../../../../../../../src/modules/skillRunner/surface/skillRunnerManagementDialog.ts)

## 符号（1）
<!-- node: function:src/modules/skillRunner/surface/skillRunnerManagementDialog.ts:buildSkillRunnerManagementUiUrl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSkillRunnerManagementUiUrl | 函数 | 3–30 | 简单 | url、validation、utility | 0 | 把后端 baseUrl 规范化为管理 UI 地址，拒绝空值、非 http(s) 协议与非法 URL，并去除查询串与 hash。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardFrame.ts](../../dashboard/dashboardFrame.ts.md) | src/modules/dashboard/dashboardFrame.ts | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunnerManagementUiUrl | 函数 | 3–30 | 把后端 baseUrl 规范化为管理 UI 地址，拒绝空值、非 http(s) 协议与非法 URL，并去除查询串与 hash。 |
