
# src/modules/guardedSqlite.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/guardedSqlite.ts -->

受保护的 SQLite 连接封装：设置 busy timeout、对 SQLITE_BUSY 做有界重试，并暴露统一的连接获取入口供 pluginStateStore 使用。
源码：[src/modules/guardedSqlite.ts](../../../../../src/modules/guardedSqlite.ts)

## 符号（3）
<!-- node: function:src/modules/guardedSqlite.ts:configureBusyTimeout -->
<!-- node: function:src/modules/guardedSqlite.ts:getGuardedSqliteConnection -->
<!-- node: function:src/modules/guardedSqlite.ts:isSqliteBusyError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| configureBusyTimeout | 函数 | 113–123 | 简单 | sqlite、configuration、concurrency | 0 | 为连接设置 busy timeout，使并发写入获得有界等待窗口。 |
| getGuardedSqliteConnection | 函数 | 125–230 | 中等 | sqlite、factory、resilience | 0 | 获取受保护的 SQLite 连接：应用 busy 重试策略并统一错误包装。 |
| isSqliteBusyError | 函数 | 41–80 | 简单 | sqlite、error-handling、predicate | 0 | 识别 SQLite busy/locked 错误码，判断是否可重试。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [clientPortAdapter.ts](synthesisClient/clientPortAdapter.ts.md) | src/modules/synthesisClient/clientPortAdapter.ts | Synthesis 客户端 Port 适配器：把抽象的 `SynthesisClientPort` 调用翻译为契约重建 + 受控执行，是 UI 与原生实现之间的统一入参校验与错误归一化边界。 |
| [pluginStateStore.ts](pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [synthesisWorkbenchTab.ts](synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getGuardedSqliteConnection | 函数 | 125–230 | 获取受保护的 SQLite 连接：应用 busy 重试策略并统一错误包装。 |
| isSqliteBusyError | 函数 | 41–80 | 识别 SQLite busy/locked 错误码，判断是否可重试。 |
