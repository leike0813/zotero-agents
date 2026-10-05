
# src/modules/dashboard/dashboardFrame.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/dashboard](../../../../modules/src/modules/dashboard.md)
<!-- node: file:src/modules/dashboard/dashboardFrame.ts -->

Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。
源码：[src/modules/dashboard/dashboardFrame.ts](../../../../../../src/modules/dashboard/dashboardFrame.ts)

## 符号（3）
<!-- node: function:src/modules/dashboard/dashboardFrame.ts:createContentBrowser -->
<!-- node: function:src/modules/dashboard/dashboardFrame.ts:createDashboardFrameOwner -->
<!-- node: function:src/modules/dashboard/dashboardFrame.ts:createFrame -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createContentBrowser | 函数 | 45–79 | 简单 | frame、factory、dashboard、browser | 0 | 创建 Dashboard 的 content browser 实例并完成 URI 解析。 |
| createDashboardFrameOwner | 函数 | 129–234 | 中等 | factory、frame、lifecycle、dashboard | 0 | 构造 Dashboard frame owner：创建 content browser、注册挂载句柄并提供卸载时移除 frame 的能力。 |
| createFrame | 函数 | 81–113 | 简单 | frame、dom、factory、dashboard | 0 | 创建 content browser 的 frame 元素并返回可挂载句柄。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [displayName.ts](../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [package.json](../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeBridge.ts](../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [skillRunnerManagementDialog.ts](../skillRunner/surface/skillRunnerManagementDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerManagementDialog.ts | SkillRunner 管理界面的 URL 构造工具：校验并规范化后端 baseUrl，补齐 /ui 路径，为管理面板提供安全的打开地址。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardRuntime.ts](dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createDashboardFrameOwner | 函数 | 129–234 | 构造 Dashboard frame owner：创建 content browser、注册挂载句柄并提供卸载时移除 frame 的能力。 |
