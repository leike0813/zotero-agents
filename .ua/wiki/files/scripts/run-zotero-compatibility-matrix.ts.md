
# scripts/run-zotero-compatibility-matrix.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-zotero-compatibility-matrix.ts -->

Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。
源码：[scripts/run-zotero-compatibility-matrix.ts](../../../../scripts/run-zotero-compatibility-matrix.ts)

## 符号（13）
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:assertCandidateXpiMatchesBuild -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:finishReceipt -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:main -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:parseCompatibilityCliArgs -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:parseCompatibilityRunManifestReference -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:pluginIdentity -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:printHelp -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:readPreparedArtifactIdentity -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:readWeeklyAttempt -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:runCell -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:runWorker -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:sourceIdentity -->
<!-- node: function:scripts/run-zotero-compatibility-matrix.ts:unavailablePluginIdentity -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertCandidateXpiMatchesBuild | 函数 | 323–338 | 简单 | assertion、validation、release-gate | 0 | 断言候选 XPI 与当前构建产物完全一致。 |
| finishReceipt | 函数 | 389–398 | 简单 | receipt、persistence、compatibility | 0 | 补全并写回兼容性 receipt。 |
| main | 函数 | 751–846 | 中等 | entry-point、cli、compatibility | 0 | CLI 入口：解析参数、准备 run 布局并驱动矩阵执行与汇总。 |
| parseCompatibilityCliArgs | 函数 | 85–244 | 中等 | cli、parsing、compatibility | 0 | 解析兼容性矩阵 runner 的完整 CLI 参数集。 |
| parseCompatibilityRunManifestReference | 函数 | 246–263 | 简单 | parsing、evidence、compatibility | 0 | 从 worker 的 stdout 中解析出 run manifest 引用。 |
| pluginIdentity | 函数 | 294–321 | 简单 | identity、hashing、compatibility | 0 | 计算已构建插件 XPI 的身份（版本与 sha256）。 |
| printHelp | 函数 | 738–749 | 简单 | cli、formatting、usage | 0 | 打印兼容性矩阵 runner 的帮助信息。 |
| readPreparedArtifactIdentity | 函数 | 368–387 | 简单 | identity、manifest、filesystem | 0 | 读取预备产物身份文件。 |
| readWeeklyAttempt | 函数 | 702–736 | 简单 | receipt、parsing、compatibility | 0 | 从 receipt 中读取 weekly 重试记录。 |
| runCell | 函数 | 464–700 | 复杂 | e2e、orchestration、compatibility | 0 | 执行单个矩阵单元格：物化宿主、运行 E2E、收集运行时证据。 |
| runWorker | 函数 | 400–462 | 中等 | process、orchestration、compatibility | 0 | 启动 worker 子进程并把矩阵参数转发给它。 |
| sourceIdentity | 函数 | 279–292 | 简单 | identity、git、compatibility | 0 | 计算当前源码身份：提交 sha 与工作区是否干净。 |
| unavailablePluginIdentity | 函数 | 340–363 | 简单 | diagnostics、identity、error-handling | 0 | 构建缺失时返回不可用的插件身份诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](system-e2e/acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [familyLifecycle.ts](system-e2e/familyLifecycle.ts.md) | scripts/system-e2e/familyLifecycle.ts | E2E 用例族的生命周期管理：声明族成员、解析选择、校验声明完整性，并按阶段驱动族的执行与健康判定。 |
| [manifest.ts](system-e2e/manifest.ts.md) | scripts/system-e2e/manifest.ts | 系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。 |
| [run-zotero-direct.ts](run-zotero-direct.ts.md) | scripts/run-zotero-direct.ts | 本地直启 Zotero 的启动器：写入 dev prefs、经 RDP 安装临时插件（不需要 XPI），并可暂存 Synthesis sidecar 运行时资产与本地 runtime root 偏好。 |
| [run-zotero-e2e-stress.ts](run-zotero-e2e-stress.ts.md) | scripts/run-zotero-e2e-stress.ts | Citation Graph 生命周期压力测试入口：设置合成关闭循环次数与真实库开关后，转调统一的 Zotero E2E 命令。 |
| [runtimeEvidence.ts](system-e2e/runtimeEvidence.ts.md) | scripts/system-e2e/runtimeEvidence.ts | 采集单个执行 cell 的运行时证据：读取已安装 sidecar runtime、会话记录与运行日志，按 schema 输出可归档证据文档。 |
| [weeklyRetry.ts](system-e2e/weeklyRetry.ts.md) | scripts/system-e2e/weeklyRetry.ts | 周期性重试策略：按周窗口统计失败用例，对稳定复现的失败安排重试，避免偶发失败直接阻塞发布。 |
| [zotero-compatibility-fixture.ts](zotero-compatibility-fixture.ts.md) | scripts/zotero-compatibility-fixture.ts | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseCompatibilityCliArgs | 函数 | 85–244 | 解析兼容性矩阵 runner 的完整 CLI 参数集。 |
| parseCompatibilityRunManifestReference | 函数 | 246–263 | 从 worker 的 stdout 中解析出 run manifest 引用。 |
