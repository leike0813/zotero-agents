
# scripts/zotero-compatibility-fixture.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/zotero-compatibility-fixture.ts -->

Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。
源码：[scripts/zotero-compatibility-fixture.ts](../../../../scripts/zotero-compatibility-fixture.ts)

## 符号（22）
<!-- node: function:scripts/zotero-compatibility-fixture.ts:acquireZoteroHost -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:acquireZoteroMachineRunLock -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:assertCompatibilityArtifactIdentity -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:buildCompatibilityPlan -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:cleanupRunLayoutState -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:createCompatibilityReceipt -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:createE2EExecutionCell -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:createRunLayout -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:ensureCachedHostArchive -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:extractHostArchive -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:listZipEntries -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:loadCompatibilityManifest -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:materializeZoteroHostForRun -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:persistCompatibilityHostFactsEvent -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:resolveCompatibilityTarget -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:resolveLocalArchiveCommandLocation -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:resolveZipExtractionCommand -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:runOwnedCommand -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:validateArchiveEntries -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:validateCompatibilityManifest -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:validateExtractedTree -->
<!-- node: function:scripts/zotero-compatibility-fixture.ts:writeCompatibilityReceipt -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acquireZoteroHost | 函数 | 1010–1086 | 复杂 | 宿主获取、缓存、编排 | 0 | 获取可运行的 Zotero 宿主：校验平台、准备归档缓存并物化安装树。 |
| [acquireZoteroMachineRunLock](../../symbols/scripts/zotero-compatibility-fixture.ts/acquireZoteroMachineRunLock.md) | 函数 | 1320–1387 | 复杂 | 锁、并发控制、机器级 | 1 | 获取机器级运行锁，阻止同一台机器上并发启动多个 Zotero 实例。 |
| assertCompatibilityArtifactIdentity | 函数 | 318–344 | 中等 | validation、产物校验、身份 | 0 | 断言下载到的宿主归档与 manifest 声明的版本、平台与摘要一致。 |
| buildCompatibilityPlan | 函数 | 441–569 | 复杂 | 计划、编排、兼容性矩阵 | 0 | 构建兼容性运行计划：排列执行顺序、分配运行目录并声明每步所需证据。 |
| cleanupRunLayoutState | 函数 | 1294–1318 | 中等 | 清理、运行目录、收尾 | 0 | 清理运行布局的临时状态，保留需要归档的证据文件。 |
| createCompatibilityReceipt | 函数 | 1389–1423 | 中等 | 回执、证据链、兼容性矩阵 | 0 | 基于 cell 证据生成兼容性回执，记录宿主身份与结论。 |
| [createE2EExecutionCell](../../symbols/scripts/zotero-compatibility-fixture.ts/createE2EExecutionCell.md) | 函数 | 258–316 | 复杂 | 矩阵、数据模型、e2e | 1 | 构造单个执行 cell 描述，绑定 Zotero 版本、平台、宿主路径与运行模式。 |
| createRunLayout | 函数 | 1258–1292 | 中等 | 运行目录、布局、准备 | 0 | 创建本次运行的目录布局，隔离日志、输出与临时产物。 |
| ensureCachedHostArchive | 函数 | 607–677 | 复杂 | 缓存、下载、产物校验 | 0 | 确保本地存在通过摘要校验的宿主归档，缺失时按官方地址下载并缓存。 |
| extractHostArchive | 函数 | 882–935 | 复杂 | 解压、宿主安装树、安全 | 0 | 把宿主归档解包到目标目录，解包后立即做布局与越界校验。 |
| listZipEntries | 函数 | 790–846 | 中等 | zip、解析、归档布局 | 0 | 本地解析 zip 中央目录列出条目，用于解包前预检。 |
| loadCompatibilityManifest | 函数 | 421–426 | 简单 | 读取、manifest、入口 | 0 | 读取并校验矩阵 manifest，返回受治理结构。 |
| materializeZoteroHostForRun | 函数 | 1088–1115 | 中等 | 物化、只读工作区、隔离 | 1 | 把宿主安装树复制为本次运行专用的副本，保证来源目录只读。 |
| persistCompatibilityHostFactsEvent | 函数 | 1232–1256 | 中等 | 事件、证据链、持久化 | 1 | 把宿主获取与版本事实作为事件写入 E2E 证据链。 |
| resolveCompatibilityTarget | 函数 | 428–439 | 简单 | 解析、目标选择、入口 | 0 | 按平台与版本解析出唯一兼容性目标，拒绝歧义选择。 |
| resolveLocalArchiveCommandLocation | 函数 | 719–728 | 简单 | 工具函数、命令解析 | 0 | 解析本机可用的归档处理命令位置。 |
| resolveZipExtractionCommand | 函数 | 730–752 | 中等 | 工具函数、解压、跨平台 | 0 | 按平台解析可用的解压命令与参数组合，优先使用系统自带工具。 |
| runOwnedCommand | 函数 | 1161–1225 | 复杂 | 进程管理、超时、清理 | 0 | 运行并持有子进程：处理超时、请求终止、等待退出并回收资源。 |
| validateArchiveEntries | 函数 | 571–583 | 简单 | validation、归档布局、产物校验 | 0 | 校验归档条目集合符合预期布局，检测缺失或多余文件。 |
| validateCompatibilityManifest | 函数 | 366–419 | 复杂 | validation、manifest、契约 | 0 | 校验兼容性矩阵 manifest 的结构、目标覆盖范围与声明支持版本。 |
| validateExtractedTree | 函数 | 848–880 | 中等 | validation、归档布局、安全 | 0 | 校验解包后的目录树无路径穿越且包含预期的可执行入口。 |
| writeCompatibilityReceipt | 函数 | 1425–1436 | 简单 | 持久化、回执、产物 | 1 | 以可移植相对路径写入兼容性回执文件。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [familyLifecycle.ts](system-e2e/familyLifecycle.ts.md) | scripts/system-e2e/familyLifecycle.ts | E2E 用例族的生命周期管理：声明族成员、解析选择、校验声明完整性，并按阶段驱动族的执行与健康判定。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](system-e2e/acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [calibration.ts](system-e2e/calibration.ts.md) | scripts/system-e2e/calibration.ts | E2E 校准与晋级策略：校验校准轮次的结构事实，评估分组聚合结果，并判定当前轮次是否达到晋级为金例的条件。 |
| [run-zotero-compatibility-matrix.ts](run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |
| [run-zotero-compatibility-worker.ts](run-zotero-compatibility-worker.ts.md) | scripts/run-zotero-compatibility-worker.ts | 兼容性矩阵 worker 入口：在隔离的 run 目录中物化测试工作区与宿主链接，按 mode/domain/lane 解析测试条目并执行，同时回传宿主事实事件。 |
| [run-zotero-test-with-mock.ts](run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |
| [weeklyRetry.ts](system-e2e/weeklyRetry.ts.md) | scripts/system-e2e/weeklyRetry.ts | 周期性重试策略：按周窗口统计失败用例，对稳定复现的失败安排重试，避免偶发失败直接阻塞发布。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acquireZoteroHost | 函数 | 1010–1086 | 获取可运行的 Zotero 宿主：校验平台、准备归档缓存并物化安装树。 |
| [acquireZoteroMachineRunLock](../../symbols/scripts/zotero-compatibility-fixture.ts/acquireZoteroMachineRunLock.md) | 函数 | 1320–1387 | 获取机器级运行锁，阻止同一台机器上并发启动多个 Zotero 实例。 |
| assertCompatibilityArtifactIdentity | 函数 | 318–344 | 断言下载到的宿主归档与 manifest 声明的版本、平台与摘要一致。 |
| buildCompatibilityPlan | 函数 | 441–569 | 构建兼容性运行计划：排列执行顺序、分配运行目录并声明每步所需证据。 |
| cleanupRunLayoutState | 函数 | 1294–1318 | 清理运行布局的临时状态，保留需要归档的证据文件。 |
| createCompatibilityReceipt | 函数 | 1389–1423 | 基于 cell 证据生成兼容性回执，记录宿主身份与结论。 |
| [createE2EExecutionCell](../../symbols/scripts/zotero-compatibility-fixture.ts/createE2EExecutionCell.md) | 函数 | 258–316 | 构造单个执行 cell 描述，绑定 Zotero 版本、平台、宿主路径与运行模式。 |
| createRunLayout | 函数 | 1258–1292 | 创建本次运行的目录布局，隔离日志、输出与临时产物。 |
| ensureCachedHostArchive | 函数 | 607–677 | 确保本地存在通过摘要校验的宿主归档，缺失时按官方地址下载并缓存。 |
| loadCompatibilityManifest | 函数 | 421–426 | 读取并校验矩阵 manifest，返回受治理结构。 |
| materializeZoteroHostForRun | 函数 | 1088–1115 | 把宿主安装树复制为本次运行专用的副本，保证来源目录只读。 |
| persistCompatibilityHostFactsEvent | 函数 | 1232–1256 | 把宿主获取与版本事实作为事件写入 E2E 证据链。 |
| resolveCompatibilityTarget | 函数 | 428–439 | 按平台与版本解析出唯一兼容性目标，拒绝歧义选择。 |
| resolveLocalArchiveCommandLocation | 函数 | 719–728 | 解析本机可用的归档处理命令位置。 |
| resolveZipExtractionCommand | 函数 | 730–752 | 按平台解析可用的解压命令与参数组合，优先使用系统自带工具。 |
| runOwnedCommand | 函数 | 1161–1225 | 运行并持有子进程：处理超时、请求终止、等待退出并回收资源。 |
| validateArchiveEntries | 函数 | 571–583 | 校验归档条目集合符合预期布局，检测缺失或多余文件。 |
| validateCompatibilityManifest | 函数 | 366–419 | 校验兼容性矩阵 manifest 的结构、目标覆盖范围与声明支持版本。 |
| writeCompatibilityReceipt | 函数 | 1425–1436 | 以可移植相对路径写入兼容性回执文件。 |
