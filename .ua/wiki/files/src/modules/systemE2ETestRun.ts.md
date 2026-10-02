
# src/modules/systemE2ETestRun.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/systemE2ETestRun.ts -->

System E2E 测试运行的检测入口：从 Zotero 首选项读取事件上报 URL 与 launch fault 开关，作为 sidecar 走测试私有检查点的判据。
源码：[src/modules/systemE2ETestRun.ts](../../../../../src/modules/systemE2ETestRun.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphCrashJournal.ts](synthesis/debug/citationGraphCrashJournal.ts.md) | src/modules/synthesis/debug/citationGraphCrashJournal.ts | Citation Graph 构建崩溃日志（crash journal）的读写模块：把构建期崩溃的诊断片段以有界 journal 形式落盘，供 System E2E 测试与 debug 模式回溯定位失败根因。 |
| [synthesisSidecarRuntimeSupervisor.ts](synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisWorkbenchTab.ts](synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [zoteroHostMutationAuthority.ts](zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [isSystemE2ELaunchFaultArmed](../../../symbols/globals.md) | 函数 | 41–55 | 判断测试是否预先布置了 ready 之前的 sidecar 启动失败，用于验证启动失败路径。 |
| [isSystemE2ETestRun](../../../symbols/globals.md) | 函数 | 24–26 | 判断当前 Zotero 进程是否由 System E2E 目录驱动，是则返回 true。 |
| [readSystemE2EEventUrl](../../../symbols/globals.md) | 函数 | 13–22 | 读取 System E2E 事件上报 URL 首选项，未设置时返回空串。 |
| [setSystemE2ELaunchFault](../../../symbols/globals.md) | 函数 | 57–71 | 布置或清除启动故障开关，供 E2E runner 在启动 sidecar 前设置预期失败条件。 |
