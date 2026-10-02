
# src/platform/subprocess.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/subprocess.ts -->

底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。
源码：[src/platform/subprocess.ts](../../../../../src/platform/subprocess.ts)

## 符号（3）
<!-- node: function:src/platform/subprocess.ts:executeOneShotSubprocess -->
<!-- node: function:src/platform/subprocess.ts:getMozillaSubprocessModule -->
<!-- node: function:src/platform/subprocess.ts:normalizeSubprocessExitCode -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| executeOneShotSubprocess | 函数 | 499–653 | 复杂 | subprocess、进程执行、超时、中止信号 | 0 | 一次性子进程执行主入口：按平台选择 adapter 启动进程、收集 stdout/stderr、带超时与中止信号收敛并返回结构化结果。 |
| getMozillaSubprocessModule | 函数 | 112–148 | 中等 | subprocess、zotero 沙箱、模块定位 | 0 | 定位 Zotero/Mozilla 运行时提供的 subprocess 模块，作为沙箱内唯一的进程创建入口。 |
| normalizeSubprocessExitCode | 函数 | 161–163 | 简单 | subprocess、退出码、归一化 | 0 | 把原始退出值归一为稳定语义（含信号终止与未知值的统一表示）。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpRuntimeDependencyWrapper.ts](../modules/acp/skillRun/acpRuntimeDependencyWrapper.ts.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts | Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。 |
| [acpTransport.ts](../modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [acpWebSocketBridgeService.ts](../modules/acp/transport/acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [command.ts](command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [env.ts](env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [healthGate.ts](../../scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [hostBridgeCliInstaller.ts](../modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliInstallPrompt.ts](../modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [skillRunnerCtlBridge.ts](../modules/skillRunner/runtime/skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [skillRunnerLocalRuntimeManager.ts](../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [synthesisSidecarRuntimeSupervisor.ts](../modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [windowsCommandResolution.ts](../modules/windowsCommandResolution.ts.md) | src/modules/windowsCommandResolution.ts | Windows 上外部命令解析模块：定位 npx/node/python 等可执行文件，识别 shim（.cmd/.ps1）与 App Execution Alias，并为 subprocess 调用生成可运行的命令行。 |
| [zipBundleReader.ts](../workflows/zipBundleReader.ts.md) | src/workflows/zipBundleReader.ts | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| executeOneShotSubprocess | 函数 | 499–653 | 一次性子进程执行主入口：按平台选择 adapter 启动进程、收集 stdout/stderr、带超时与中止信号收敛并返回结构化结果。 |
| getMozillaSubprocessModule | 函数 | 112–148 | 定位 Zotero/Mozilla 运行时提供的 subprocess 模块，作为沙箱内唯一的进程创建入口。 |
| normalizeSubprocessExitCode | 函数 | 161–163 | 把原始退出值归一为稳定语义（含信号终止与未知值的统一表示）。 |
