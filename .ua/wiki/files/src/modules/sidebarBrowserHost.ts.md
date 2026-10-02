
# src/modules/sidebarBrowserHost.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/sidebarBrowserHost.ts -->

Zotero 侧边栏内嵌页面的通用宿主构件：创建 browser/iframe 承载内容、提供外层容器并统一设置 flex 与尺寸样式，屏蔽 XUL 与 HTML 两种元素实现的差异。
源码：[src/modules/sidebarBrowserHost.ts](../../../../../src/modules/sidebarBrowserHost.ts)

## 符号（4）
<!-- node: function:src/modules/sidebarBrowserHost.ts:applySidebarPaneContainerStyles -->
<!-- node: function:src/modules/sidebarBrowserHost.ts:createSidebarContainer -->
<!-- node: function:src/modules/sidebarBrowserHost.ts:createSidebarFrame -->
<!-- node: function:src/modules/sidebarBrowserHost.ts:setSidebarContainerVisible -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applySidebarPaneContainerStyles | 函数 | 71–100 | 简单 | ui、styling、sidebar | 1 | 为侧边栏内容容器设置高度、溢出与 flex 等样式，保证嵌入 Zotero 窗口后布局正确。 |
| createSidebarContainer | 函数 | 60–69 | 简单 | ui、sidebar、factory | 0 | 创建包裹侧边栏内容的容器元素并应用标准样式。 |
| createSidebarFrame | 函数 | 1–51 | 中等 | ui、sidebar、factory、compatibility | 0 | 创建侧边栏内容承载元素，优先使用 XUL browser，不可用时退回 iframe，两者都设置满尺寸与 flex 布局。 |
| setSidebarContainerVisible | 函数 | 102–109 | 简单 | ui、sidebar、visibility | 0 | 切换侧边栏容器的可见性，用于在打开与关闭之间切换宿主视图。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspacePublicationHost.ts](assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applySidebarPaneContainerStyles | 函数 | 71–100 | 为侧边栏内容容器设置高度、溢出与 flex 等样式，保证嵌入 Zotero 窗口后布局正确。 |
| createSidebarContainer | 函数 | 60–69 | 创建包裹侧边栏内容的容器元素并应用标准样式。 |
| createSidebarFrame | 函数 | 1–51 | 创建侧边栏内容承载元素，优先使用 XUL browser，不可用时退回 iframe，两者都设置满尺寸与 flex 布局。 |
| setSidebarContainerVisible | 函数 | 102–109 | 切换侧边栏容器的可见性，用于在打开与关闭之间切换宿主视图。 |
