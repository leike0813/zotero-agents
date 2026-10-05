
# src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts -->

sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。
源码：[src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [hash.ts](../../../platform/hash.ts.md) | src/platform/hash.ts | 平台无关的 SHA-256 摘要工具：优先使用 WebCrypto subtle.digest，回退到 Mozilla 的 nsICryptoHash，保证在 Zotero 沙箱与工具链环境中都能得到一致摘要。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeCompatibility.ts](../../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [schemaVersion.ts](../../../../packages/synthesis-contracts/src/schemaVersion.ts.md) | packages/synthesis-contracts/src/schemaVersion.ts | 只导出 repository foundation schema 版本常量的单行版本锚点，供仓库与合约两侧对齐迁移版本。 |
| [sidecarObservability.ts](../../../../packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [synthesisSidecarControlClient.ts](synthesisSidecarControlClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts | sidecar 控制面客户端：读取 discovery、执行健康与握手探测并校验协议/能力/上限，分普通控制与生产控制两条 profile 支撑 Supervisor 生命周期判定。 |
| [synthesisSidecarRuntimeInstaller.ts](synthesisSidecarRuntimeInstaller.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts | sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。 |
| [synthesisSidecarTrace.ts](synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |
| [systemE2ETestRun.ts](../../systemE2ETestRun.ts.md) | src/modules/systemE2ETestRun.ts | System E2E 测试运行的检测入口：从 Zotero 首选项读取事件上报 URL 与 launch fault 开关，作为 sidecar 走测试私有检查点的判据。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [nativeComposition.ts](../../synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [synthesisProductionOwner.ts](../production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisWorkbenchTab.ts](../workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisProductionRuntimeSupervisor](../../../../../symbols/globals.md) | 函数 | 430–1032 | 构建生产 runtime supervisor 的完整状态机：安装、拉起、discovery 提交、控制连接建立、崩溃重启与终止清理，并保证 ready 前失败回滚、ready 后终止走同一清理路径。 |
| [createSynthesisSidecarRuntimeSupervisor](../../../../../symbols/globals.md) | 函数 | 1034–1051 | 创建普通 profile 的 sidecar runtime supervisor，作为生产 supervisor 的轻量包装。 |
| [getReadySynthesisSidecarControlConnection](../../../../../symbols/globals.md) | 函数 | 1087–1089 | 仅在 supervisor 处于 ready 时返回控制连接，否则返回 undefined，避免调用方对未就绪进程发请求。 |
| [getSynthesisSidecarRuntimeSupervisorSnapshot](../../../../../symbols/globals.md) | 函数 | 1077–1079 | 读取当前 supervisor 快照（状态、进程信息、控制连接与最近失败），供工作台与诊断消费。 |
| [getSynthesisWorkbenchSidecarStatus](../../../../../symbols/globals.md) | 函数 | 1147–1151 | 把 supervisor 内部状态投影为工作台契约的 sidecar 状态 DTO。 |
| [narrowSynthesisSidecarHealth](../../../../../symbols/globals.md) | 函数 | 79–98 | 把宽泛的 sidecar 健康响应收窄为可用的健康快照，字段缺失或状态不符时返回 unavailable。 |
| [observeSynthesisWorkbenchSidecarStatus](../../../../../symbols/globals.md) | 函数 | 1164–1168 | 读取当前工作台 sidecar 状态快照，供只读观察方一次性使用。 |
| [parseNativeDiagnosticEvent](../../../../../symbols/globals.md) | 函数 | 364–381 | 解析 sidecar 进程在 stdout/stderr 上输出的结构化诊断行，识别出边界事件与失败事实。 |
| [parseNativeStableFailureCode](../../../../../symbols/globals.md) | 函数 | 383–386 | 从原生诊断输出中提取稳定失败码，无法识别时返回 undefined 而非猜测值。 |
| [startSynthesisProductionRuntimeSupervisor](../../../../../symbols/globals.md) | 函数 | 1091–1100 | 启动生产 profile 的 runtime supervisor 并返回其生命周期句柄。 |
| [subscribeSynthesisSidecarRuntimeSupervisor](../../../../../symbols/globals.md) | 函数 | 1081–1085 | 订阅 supervisor 快照变化，返回取消订阅函数。 |
| [subscribeSynthesisWorkbenchSidecarStatus](../../../../../symbols/globals.md) | 函数 | 1153–1162 | 订阅工作台 sidecar 状态变化，状态未真正变化时不重复通知。 |
