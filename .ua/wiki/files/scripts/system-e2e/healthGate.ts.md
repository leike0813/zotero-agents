
# scripts/system-e2e/healthGate.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/healthGate.ts -->

Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。
源码：[scripts/system-e2e/healthGate.ts](../../../../../scripts/system-e2e/healthGate.ts)

## 符号（9）
<!-- node: function:scripts/system-e2e/healthGate.ts:assertRemainsStable -->
<!-- node: function:scripts/system-e2e/healthGate.ts:listSidecarDiscoveries -->
<!-- node: function:scripts/system-e2e/healthGate.ts:listSidecarOperationsViaEphemeralClient -->
<!-- node: function:scripts/system-e2e/healthGate.ts:observeSystemE2EHealth -->
<!-- node: function:scripts/system-e2e/healthGate.ts:processIsAlive -->
<!-- node: function:scripts/system-e2e/healthGate.ts:runSystemTool -->
<!-- node: function:scripts/system-e2e/healthGate.ts:sidecarGenerationReady -->
<!-- node: function:scripts/system-e2e/healthGate.ts:terminateProcess -->
<!-- node: function:scripts/system-e2e/healthGate.ts:waitUntil -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertRemainsStable | 函数 | 72–84 | 简单 | e2e、validation、stability | 0 | 在给定时间窗内重复检查某条件保持稳定，用于确认 sidecar 状态不抖动。 |
| listSidecarDiscoveries | 函数 | 159–185 | 中等 | e2e、sidecar、discovery | 0 | 枚举 runtime 目录中的 sidecar discovery 文件，解析出当前存活的 sidecar 实例信息。 |
| listSidecarOperationsViaEphemeralClient | 函数 | 191–216 | 中等 | e2e、sidecar、client、health-check | 0 | 用临时 native synthesis client 建立一次连接，列出 sidecar 的运行中 operation，作为门禁的服务端证据。 |
| observeSystemE2EHealth | 函数 | 218–286 | 复杂 | e2e、health-check、entry-point、validation | 0 | 系统 E2E 健康门禁主流程：校验平台、命令解析、mutation authority、sidecar 代次与 operation 状态，任一环节失败即抛出门禁错误。 |
| processIsAlive | 函数 | 111–124 | 简单 | e2e、process、utility | 0 | 探测指定 pid 的进程是否仍然存活，用于判断被测 sidecar 是否意外退出。 |
| runSystemTool | 函数 | 89–109 | 中等 | e2e、subprocess、tooling | 0 | 通过平台 subprocess 抽象执行外部工具命令，捕获退出码与输出供门禁判定。 |
| sidecarGenerationReady | 函数 | 30–39 | 简单 | e2e、sidecar、readiness | 0 | 判断 sidecar discovery 条目是否已达到本次测试代次（bundleId 匹配）从而可以进入后续健康检查。 |
| terminateProcess | 函数 | 126–152 | 中等 | e2e、process、cleanup | 0 | 在门禁失败路径上优雅终止被启动的进程并等待其退出，避免残留孤儿进程。 |
| waitUntil | 函数 | 54–70 | 简单 | e2e、polling、utility | 0 | 轮询读取条件直到超时，为健康门禁提供带超时与标签的等待原语。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [nativeComposition.ts](../../src/modules/synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../../src/utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../src/modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../../src/platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [subprocess.ts](../../src/platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [windowsCommandResolution.ts](../../src/modules/windowsCommandResolution.ts.md) | src/modules/windowsCommandResolution.ts | Windows 上外部命令解析模块：定位 npx/node/python 等可执行文件，识别 shim（.cmd/.ps1）与 App Execution Alias，并为 subprocess 调用生成可运行的命令行。 |
| [zoteroHostMutationAuthority.ts](../../src/modules/zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertRemainsStable | 函数 | 72–84 | 在给定时间窗内重复检查某条件保持稳定，用于确认 sidecar 状态不抖动。 |
| listSidecarDiscoveries | 函数 | 159–185 | 枚举 runtime 目录中的 sidecar discovery 文件，解析出当前存活的 sidecar 实例信息。 |
| listSidecarOperationsViaEphemeralClient | 函数 | 191–216 | 用临时 native synthesis client 建立一次连接，列出 sidecar 的运行中 operation，作为门禁的服务端证据。 |
| observeSystemE2EHealth | 函数 | 218–286 | 系统 E2E 健康门禁主流程：校验平台、命令解析、mutation authority、sidecar 代次与 operation 状态，任一环节失败即抛出门禁错误。 |
| processIsAlive | 函数 | 111–124 | 探测指定 pid 的进程是否仍然存活，用于判断被测 sidecar 是否意外退出。 |
| terminateProcess | 函数 | 126–152 | 在门禁失败路径上优雅终止被启动的进程并等待其退出，避免残留孤儿进程。 |
| waitUntil | 函数 | 54–70 | 轮询读取条件直到超时，为健康门禁提供带超时与标签的等待原语。 |
