
# src/shared/assistantWireContract.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/assistantWireContract.ts -->

Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。
源码：[src/shared/assistantWireContract.ts](../../../../../src/shared/assistantWireContract.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](../modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeReplayPublicationSidecar.ts](../modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts | 回放的发布侧车：在独立 window 上下文里监听 Assistant Workspace 消息，跨 epoch 排空发布队列并等待 workspace 就绪，使回放期间的 UI 事件可被完整捕获与归因。 |
| [assistantActionContract.ts](assistantActionContract.ts.md) | src/shared/assistantActionContract.ts | Assistant Workspace 动作负载的编译期类型镜像：描述 shell/子页面与宿主之间每个 action 各自携带的 payload 字段，由 publication 侧的 drift guard 保证与运行时注册表同步。 |
| [assistantWorkspaceAcpChild.js](../sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |
| [assistantWorkspaceActionRouter.ts](../modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [assistantWorkspacePublication.ts](../modules/assistant/publication/assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspacePublicationHost.ts](../modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts | 发布宿主：把 ACP Chat、ACP Skills 与 SkillRunner 三个域的快照汇聚成 Assistant Workspace 发布流，维护 init 基线、ack 记录、渲染观测与诊断自检接口。 |
| [assistantWorkspaceShell.js](../sidebar/assistantWorkspaceShell.js.md) | src/sidebar/assistantWorkspaceShell.js | Assistant Workspace 生产版 shell：管理三个标签页的子 iframe 装载、宿主 ready 握手与重试、快照发布缓存与 ACK 确认、surface 配置下发，以及抽屉开合与 payload scope 同步。 |
| [assistantWorkspaceSidebar.ts](../modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [prototypeWorkspaceApp.js](../sidebar/prototypeWorkspaceApp.js.md) | src/sidebar/prototypeWorkspaceApp.js | Harness 专用的原型工作台 shell：复用生产 shell 的子页面桥接与发布逻辑，把导航模型换成「Conversations / Skill Runs」双泳道加子标签切换，并渲染由生产样式表驱动的静态 mock 面板。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceShell.js](../sidebar/assistantWorkspaceShell.js.md) | src/sidebar/assistantWorkspaceShell.js | Assistant Workspace 生产版 shell：管理三个标签页的子 iframe 装载、宿主 ready 握手与重试、快照发布缓存与 ACK 确认、surface 配置下发，以及抽屉开合与 payload scope 同步。 |
| [prototypeWorkspaceApp.js](../sidebar/prototypeWorkspaceApp.js.md) | src/sidebar/prototypeWorkspaceApp.js | Harness 专用的原型工作台 shell：复用生产 shell 的子页面桥接与发布逻辑，把导航模型换成「Conversations / Skill Runs」双泳道加子标签切换，并渲染由生产样式表驱动的静态 mock 面板。 |
