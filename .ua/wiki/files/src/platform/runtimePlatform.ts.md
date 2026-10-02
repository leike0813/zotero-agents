
# src/platform/runtimePlatform.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/runtimePlatform.ts -->

宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。
源码：[src/platform/runtimePlatform.ts](../../../../../src/platform/runtimePlatform.ts)

## 符号（3）
<!-- node: function:src/platform/runtimePlatform.ts:detectRuntimeArchitecture -->
<!-- node: function:src/platform/runtimePlatform.ts:detectRuntimePlatform -->
<!-- node: function:src/platform/runtimePlatform.ts:detectSynthesisSidecarRuntimeTarget -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| detectRuntimeArchitecture | 函数 | 60–101 | 中等 | 平台探测、架构、sidecar | 0 | 探测宿主 CPU 架构（x64/arm64），用于选择 Synthesis sidecar 的二进制变体。 |
| detectRuntimePlatform | 函数 | 13–58 | 中等 | 平台探测、宿主识别、运行时 | 0 | 探测当前运行时平台（Windows/macOS/Linux），综合 navigator.userAgentData、Zotero 版本与 process.platform 给出唯一判定。 |
| detectSynthesisSidecarRuntimeTarget | 函数 | 103–126 | 中等 | sidecar、运行时目标、平台探测 | 0 | 把平台与架构组合成 sidecar runtime target 标识，映射到 contracts 中的 bundle 变体名。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTransport.ts](../modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [acpWebSocketBridgeService.ts](../modules/acp/transport/acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [command.ts](command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [env.ts](env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [healthGate.ts](../../scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [hostBridgeCliInstaller.ts](../modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliInstallPrompt.ts](../modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [hostBridgeCliResolver.ts](../modules/hostBridge/cli/hostBridgeCliResolver.ts.md) | src/modules/hostBridge/cli/hostBridgeCliResolver.ts | 解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。 |
| [path.ts](path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [processControl.ts](processControl.ts.md) | src/platform/processControl.ts | 子进程控制：启动、信号投递与终止回收策略，把 platform/command 的执行结果转成可取消、可等待的进程句柄。 |
| [synthesisProductionOwner.ts](../modules/synthesis/production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisSidecarRuntimeInstaller.ts](../modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts | sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。 |
| [workflowHostOwners.ts](../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowProductStore.ts](../modules/workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| detectRuntimeArchitecture | 函数 | 60–101 | 探测宿主 CPU 架构（x64/arm64），用于选择 Synthesis sidecar 的二进制变体。 |
| detectRuntimePlatform | 函数 | 13–58 | 探测当前运行时平台（Windows/macOS/Linux），综合 navigator.userAgentData、Zotero 版本与 process.platform 给出唯一判定。 |
| detectSynthesisSidecarRuntimeTarget | 函数 | 103–126 | 把平台与架构组合成 sidecar runtime target 标识，映射到 contracts 中的 bundle 变体名。 |
