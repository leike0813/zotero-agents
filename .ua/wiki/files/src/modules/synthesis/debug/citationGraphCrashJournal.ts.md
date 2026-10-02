
# src/modules/synthesis/debug/citationGraphCrashJournal.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/debug](../../../../../modules/src/modules/synthesis/debug.md)
<!-- node: file:src/modules/synthesis/debug/citationGraphCrashJournal.ts -->

Citation Graph 构建崩溃日志（crash journal）的读写模块：把构建期崩溃的诊断片段以有界 journal 形式落盘，供 System E2E 测试与 debug 模式回溯定位失败根因。
源码：[src/modules/synthesis/debug/citationGraphCrashJournal.ts](../../../../../../../src/modules/synthesis/debug/citationGraphCrashJournal.ts)

## 符号（4）
<!-- node: function:src/modules/synthesis/debug/citationGraphCrashJournal.ts:finishCitationGraphCrashJournal -->
<!-- node: function:src/modules/synthesis/debug/citationGraphCrashJournal.ts:initializeCitationGraphCrashJournal -->
<!-- node: function:src/modules/synthesis/debug/citationGraphCrashJournal.ts:readCitationGraphCrashJournal -->
<!-- node: function:src/modules/synthesis/debug/citationGraphCrashJournal.ts:recordCitationGraphCrashJournalPhase -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| finishCitationGraphCrashJournal | 函数 | 150–171 | 中等 | 诊断、收尾、崩溃日志 | 0 | 收尾 journal：写入终态与耗时，标记为正常完成或失败，关闭当前会话。 |
| initializeCitationGraphCrashJournal | 函数 | 112–128 | 简单 | 诊断、崩溃日志、citation-graph | 0 | 开启一次新的 Citation Graph 构建崩溃日志会话，裁剪旧 journal 并写入起始元数据。 |
| readCitationGraphCrashJournal | 函数 | 173–181 | 简单 | 诊断、读取、崩溃日志 | 0 | 读取并解析当前崩溃日志文档，供 System E2E 断言与人工排障使用。 |
| recordCitationGraphCrashJournalPhase | 函数 | 130–148 | 简单 | 诊断、阶段记录、崩溃日志 | 0 | 按构建阶段追加 journal 记录（phase、时间、已收集计数），是崩溃定位的主要证据来源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [systemE2ETestRun.ts](../../systemE2ETestRun.ts.md) | src/modules/systemE2ETestRun.ts | System E2E 测试运行的检测入口：从 Zotero 首选项读取事件上报 URL 与 launch fault 开关，作为 sidecar 走测试私有检查点的判据。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [synthesisWorkbenchTab.ts](../workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| finishCitationGraphCrashJournal | 函数 | 150–171 | 收尾 journal：写入终态与耗时，标记为正常完成或失败，关闭当前会话。 |
| initializeCitationGraphCrashJournal | 函数 | 112–128 | 开启一次新的 Citation Graph 构建崩溃日志会话，裁剪旧 journal 并写入起始元数据。 |
| readCitationGraphCrashJournal | 函数 | 173–181 | 读取并解析当前崩溃日志文档，供 System E2E 断言与人工排障使用。 |
| recordCitationGraphCrashJournalPhase | 函数 | 130–148 | 按构建阶段追加 journal 记录（phase、时间、已收集计数），是崩溃定位的主要证据来源。 |
