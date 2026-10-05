
# tsconfig.sidebar.json
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: config:tsconfig.sidebar.json -->

侧边栏页面的 TypeScript 子配置：以 Preact JSX + DOM lib、noEmit 方式检查 src/sidebar 的 .ts/.tsx、src/shared 与 synthesis-contracts 源码。
源码：[tsconfig.sidebar.json](../../../tsconfig.sidebar.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](src/modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [workspaceTab.ts](src/modules/workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
