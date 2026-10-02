
# scripts/run-zotero-test-with-mock.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-zotero-test-with-mock.ts -->

带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。
源码：[scripts/run-zotero-test-with-mock.ts](../../../../scripts/run-zotero-test-with-mock.ts)

## 符号（25）
<!-- node: function:scripts/run-zotero-test-with-mock.ts:buildMockSkillRunnerEndpointEnvironment -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:buildSystemE2EResumeEnvironment -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:buildTestEnvironment -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:cleanupTestDataDir -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:consumeWrapperVerboseArgs -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:isUnderDirectory -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:main -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:normalizeTestDomain -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:normalizeTestMode -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:parseSystemE2EPeerRestartRequest -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:parseSystemE2ERestartRequest -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:parseWrappedTestInvocation -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:resolveMockSkillRunnerHost -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:resolveMockSkillRunnerPort -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:resolveSystemE2EScaffoldRoot -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:resolveZoteroStderrDrainLauncher -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:runTargetTests -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:snapshotSystemE2EScaffold -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:spawnMockSkillRunner -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:terminateExactProcess -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:terminateMock -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:waitForExactProcessExit -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:waitForMockReady -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:waitForSystemE2EAdmissionCheckpoint -->
<!-- node: function:scripts/run-zotero-test-with-mock.ts:writeZoteroStderrDrainLauncher -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildMockSkillRunnerEndpointEnvironment | 函数 | 424–435 | 简单 | environment、testing、utility | 0 | 把 mock endpoint 注入到测试环境中。 |
| buildSystemE2EResumeEnvironment | 函数 | 138–148 | 简单 | environment、e2e、lifecycle | 0 | 构造重启续跑所需的环境变量。 |
| buildTestEnvironment | 函数 | 333–403 | 中等 | environment、testing、configuration | 0 | 组装测试所需的完整环境变量与首选项设置。 |
| cleanupTestDataDir | 函数 | 446–456 | 简单 | filesystem、cleanup、testing | 0 | 清理测试数据目录。 |
| consumeWrapperVerboseArgs | 函数 | 226–237 | 简单 | parsing、cli、utility | 0 | 消费掉包装器自身的 verbose 参数。 |
| isUnderDirectory | 函数 | 437–444 | 简单 | path、validation、utility | 0 | 判断子路径是否位于指定目录之下。 |
| main | 函数 | 666–968 | 复杂 | entry-point、orchestration、e2e | 0 | 主编排：环境准备 → mock 生命周期 → 执行测试 → 收集 manifest 与崩溃证据。 |
| normalizeTestDomain | 函数 | 179–190 | 简单 | normalization、testing、utility | 0 | 归一化测试 domain 取值。 |
| normalizeTestMode | 函数 | 175–177 | 简单 | normalization、testing、utility | 0 | 归一化测试模式（zotero 或 node）。 |
| parseSystemE2EPeerRestartRequest | 函数 | 121–136 | 简单 | parsing、e2e、lifecycle | 0 | 解析对端重启请求事件。 |
| parseSystemE2ERestartRequest | 函数 | 86–119 | 简单 | parsing、e2e、lifecycle | 0 | 解析宿主重启请求事件。 |
| parseWrappedTestInvocation | 函数 | 192–224 | 简单 | parsing、testing、entry-point | 0 | 解析被包裹的测试调用形态与需要转发的参数。 |
| resolveMockSkillRunnerHost | 函数 | 405–409 | 简单 | configuration、testing、utility | 0 | 解析 mock SkillRunner 的监听 host。 |
| resolveMockSkillRunnerPort | 函数 | 411–422 | 简单 | configuration、testing、utility | 0 | 解析 mock SkillRunner 的监听端口。 |
| resolveSystemE2EScaffoldRoot | 函数 | 62–72 | 简单 | path、e2e、utility | 0 | 解析 system-e2e scaffold 根目录。 |
| resolveZoteroStderrDrainLauncher | 函数 | 298–331 | 简单 | process、diagnostics、cross-platform | 0 | 按平台生成并解析 stderr drain 启动器（POSIX 与 Windows 分别处理）。 |
| runTargetTests | 函数 | 540–573 | 简单 | process、testing、orchestration | 0 | 执行目标测试进程并转发输出。 |
| snapshotSystemE2EScaffold | 函数 | 651–664 | 简单 | filesystem、evidence、e2e | 0 | 快照 scaffold 目录作为 E2E 运行证据。 |
| spawnMockSkillRunner | 函数 | 468–490 | 简单 | process、testing、lifecycle | 0 | 启动 mock SkillRunner 后端进程。 |
| terminateExactProcess | 函数 | 612–636 | 简单 | process、cleanup、utility | 0 | 按 pid 精确终止指定进程。 |
| terminateMock | 函数 | 575–610 | 简单 | process、cleanup、lifecycle | 0 | 终止 mock 后端进程树。 |
| waitForExactProcessExit | 函数 | 638–649 | 简单 | process、polling、utility | 0 | 等待指定 pid 的进程退出。 |
| waitForMockReady | 函数 | 492–538 | 简单 | polling、testing、diagnostics | 0 | 轮询等待 mock 后端就绪并输出诊断信息。 |
| waitForSystemE2EAdmissionCheckpoint | 函数 | 150–173 | 简单 | polling、e2e、synchronization | 0 | 等待 admission checkpoint 事件到达后再继续执行。 |
| writeZoteroStderrDrainLauncher | 函数 | 278–287 | 简单 | filesystem、diagnostics、process | 0 | 写入把 Zotero stderr 落盘的启动器脚本。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [diagnosticVerbosity.ts](../src/modules/diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [fixture.ts](system-e2e/fixture.ts.md) | scripts/system-e2e/fixture.ts | E2E fixture 注册表与已提交 seed 的治理模块：校验结构事实、可移植性与隐私约束，并把 seed 物化到只读测试工作区。 |
| [manifest.ts](system-e2e/manifest.ts.md) | scripts/system-e2e/manifest.ts | 系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。 |
| [package.json](../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [zotero-compatibility-fixture.ts](zotero-compatibility-fixture.ts.md) | scripts/zotero-compatibility-fixture.ts | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |
| [zotero-native-crash-capture.ts](zotero-native-crash-capture.ts.md) | scripts/zotero-native-crash-capture.ts | Zotero 原生崩溃捕获模块：在私有目录布置崩溃 fixture，用 Windows cdb 生成并解析转储，采集进程与平台证据并落盘摘要。 |
| [zotero-plugin.config.ts](../zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildMockSkillRunnerEndpointEnvironment | 函数 | 424–435 | 把 mock endpoint 注入到测试环境中。 |
| buildSystemE2EResumeEnvironment | 函数 | 138–148 | 构造重启续跑所需的环境变量。 |
| buildTestEnvironment | 函数 | 333–403 | 组装测试所需的完整环境变量与首选项设置。 |
| normalizeTestDomain | 函数 | 179–190 | 归一化测试 domain 取值。 |
| normalizeTestMode | 函数 | 175–177 | 归一化测试模式（zotero 或 node）。 |
| parseSystemE2EPeerRestartRequest | 函数 | 121–136 | 解析对端重启请求事件。 |
| parseSystemE2ERestartRequest | 函数 | 86–119 | 解析宿主重启请求事件。 |
| parseWrappedTestInvocation | 函数 | 192–224 | 解析被包裹的测试调用形态与需要转发的参数。 |
| resolveMockSkillRunnerHost | 函数 | 405–409 | 解析 mock SkillRunner 的监听 host。 |
| resolveMockSkillRunnerPort | 函数 | 411–422 | 解析 mock SkillRunner 的监听端口。 |
| resolveSystemE2EScaffoldRoot | 函数 | 62–72 | 解析 system-e2e scaffold 根目录。 |
| resolveZoteroStderrDrainLauncher | 函数 | 298–331 | 按平台生成并解析 stderr drain 启动器（POSIX 与 Windows 分别处理）。 |
| terminateExactProcess | 函数 | 612–636 | 按 pid 精确终止指定进程。 |
| waitForSystemE2EAdmissionCheckpoint | 函数 | 150–173 | 等待 admission checkpoint 事件到达后再继续执行。 |
