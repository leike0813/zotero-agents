
# typings/global.d.ts
所属分层：[插件外壳与核心运行时](../../layers/plugin-core.md)  
所属目录：[typings](../../modules/typings.md)
<!-- node: file:typings/global.d.ts -->

插件运行时的全局类型声明，声明 Zotero 注入的全局对象与 ZoteroHost 扩展点。
源码：[typings/global.d.ts](../../../../typings/global.d.ts)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [syncRecovery.ts](../src/modules/synthesis/syncRecovery.ts.md) | src/modules/synthesis/syncRecovery.ts | Synthesis 侧同步恢复逻辑，负责在 sidecar 交互中断后重建同步状态并驱动重试与补偿流程。 |
| [workspaceApp.ts](../src/workspaceApp.ts.md) | src/workspaceApp.ts | Assistant Workspace 页面入口，初始化侧边栏/工作区 UI 控制器并注册宿主交互与事件绑定。 |
