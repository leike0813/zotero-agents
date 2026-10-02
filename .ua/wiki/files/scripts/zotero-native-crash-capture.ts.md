
# scripts/zotero-native-crash-capture.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/zotero-native-crash-capture.ts -->

Zotero 原生崩溃捕获模块：在私有目录布置崩溃 fixture，用 Windows cdb 生成并解析转储，采集进程与平台证据并落盘摘要。
源码：[scripts/zotero-native-crash-capture.ts](../../../../scripts/zotero-native-crash-capture.ts)

## 符号（15）
<!-- node: function:scripts/zotero-native-crash-capture.ts:buildZoteroNativeCrashEnvironment -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:findCdb -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:parseCdbCrashEvidence -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:queryWindowsZoteroProcesses -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:readPlatformIdentity -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:resolveNativeCrashPrivateRoot -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:runCdbProcess -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:runPowerShellJson -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:selectNewCrashArtifactNames -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:selectWindowsZoteroHostProcess -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:stagePrivateZoteroCrashFixture -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:startZoteroNativeCrashCapture -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:terminateWindowsZoteroHostProcess -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:waitForWindowsZoteroHostExit -->
<!-- node: function:scripts/zotero-native-crash-capture.ts:waitForWindowsZoteroHostProcess -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildZoteroNativeCrashEnvironment | 函数 | 98–109 | 简单 | 环境变量、崩溃注入、准备 | 0 | 构造触发崩溃所需的 Zotero 环境变量组合。 |
| findCdb | 函数 | 426–452 | 中等 | 工具发现、windows、cdb | 0 | 在常见 Windows SDK 路径中定位 cdb 可执行文件。 |
| parseCdbCrashEvidence | 函数 | 329–406 | 复杂 | cdb、崩溃解析、脱敏 | 0 | 解析 cdb 输出，提取异常码、故障模块与栈帧并做脱敏处理。 |
| queryWindowsZoteroProcesses | 函数 | 189–204 | 中等 | windows、进程、枚举 | 0 | 枚举 Windows 上的 Zotero 相关进程及其可执行路径。 |
| readPlatformIdentity | 函数 | 532–552 | 中等 | 平台身份、证据链 | 0 | 读取 OS 版本、架构与安装树路径，构成本次捕获的平台身份。 |
| resolveNativeCrashPrivateRoot | 函数 | 86–96 | 简单 | 路径、私有目录、隔离 | 0 | 解析原生崩溃捕获使用的私有根目录并确保其受控。 |
| runCdbProcess | 函数 | 454–508 | 复杂 | cdb、进程管理、超时 | 0 | 以受管方式运行 cdb 采集转储，处理超时与产物搬运。 |
| runPowerShellJson | 函数 | 157–187 | 中等 | windows、powershell、json | 0 | 执行 PowerShell 并解析其 JSON 输出，统一处理编码与错误。 |
| selectNewCrashArtifactNames | 函数 | 111–121 | 简单 | 产物、增量、筛选 | 0 | 从崩溃输出目录中挑选本次运行新产生的转储与日志文件。 |
| selectWindowsZoteroHostProcess | 函数 | 127–155 | 中等 | windows、进程、选择 | 0 | 在进程列表中定位属于指定安装树的 Zotero 宿主进程。 |
| stagePrivateZoteroCrashFixture | 函数 | 253–297 | 复杂 | fixture、私有目录、准备 | 0 | 在私有目录中布置崩溃 fixture 与采集产物目录，避免污染来源树。 |
| [startZoteroNativeCrashCapture](../../symbols/scripts/zotero-native-crash-capture.ts/startZoteroNativeCrashCapture.md) | 函数 | 562–717 | 复杂 | 入口、崩溃捕获、编排 | 2 | 崩溃捕获主流程：布置 fixture、启动宿主、等待崩溃、生成摘要并清理现场。 |
| terminateWindowsZoteroHostProcess | 函数 | 238–251 | 简单 | windows、终止、清理 | 0 | 终止指定的宿主进程树，保证崩溃采集后不留残留。 |
| waitForWindowsZoteroHostExit | 函数 | 223–236 | 简单 | windows、等待、进程 | 0 | 等待宿主进程退出，超时返回未收敛结论。 |
| waitForWindowsZoteroHostProcess | 函数 | 206–221 | 中等 | windows、等待、进程 | 0 | 等待宿主进程出现，超时未就绪即判定启动失败。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-zotero-direct.ts](run-zotero-direct.ts.md) | scripts/run-zotero-direct.ts | 本地直启 Zotero 的启动器：写入 dev prefs、经 RDP 安装临时插件（不需要 XPI），并可暂存 Synthesis sidecar 运行时资产与本地 runtime root 偏好。 |
| [run-zotero-test-with-mock.ts](run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildZoteroNativeCrashEnvironment | 函数 | 98–109 | 构造触发崩溃所需的 Zotero 环境变量组合。 |
| parseCdbCrashEvidence | 函数 | 329–406 | 解析 cdb 输出，提取异常码、故障模块与栈帧并做脱敏处理。 |
| resolveNativeCrashPrivateRoot | 函数 | 86–96 | 解析原生崩溃捕获使用的私有根目录并确保其受控。 |
| selectNewCrashArtifactNames | 函数 | 111–121 | 从崩溃输出目录中挑选本次运行新产生的转储与日志文件。 |
| selectWindowsZoteroHostProcess | 函数 | 127–155 | 在进程列表中定位属于指定安装树的 Zotero 宿主进程。 |
| stagePrivateZoteroCrashFixture | 函数 | 253–297 | 在私有目录中布置崩溃 fixture 与采集产物目录，避免污染来源树。 |
| [startZoteroNativeCrashCapture](../../symbols/scripts/zotero-native-crash-capture.ts/startZoteroNativeCrashCapture.md) | 函数 | 562–717 | 崩溃捕获主流程：布置 fixture、启动宿主、等待崩溃、生成摘要并清理现场。 |
| terminateWindowsZoteroHostProcess | 函数 | 238–251 | 终止指定的宿主进程树，保证崩溃采集后不留残留。 |
| waitForWindowsZoteroHostExit | 函数 | 223–236 | 等待宿主进程退出，超时返回未收敛结论。 |
| waitForWindowsZoteroHostProcess | 函数 | 206–221 | 等待宿主进程出现，超时未就绪即判定启动失败。 |
