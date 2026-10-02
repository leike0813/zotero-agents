
# scripts/run-zotero-direct.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-zotero-direct.ts -->

本地直启 Zotero 的启动器：写入 dev prefs、经 RDP 安装临时插件（不需要 XPI），并可暂存 Synthesis sidecar 运行时资产与本地 runtime root 偏好。
源码：[scripts/run-zotero-direct.ts](../../../../scripts/run-zotero-direct.ts)

## 符号（14）
<!-- node: function:scripts/run-zotero-direct.ts:buildZoteroLaunchEnv -->
<!-- node: function:scripts/run-zotero-direct.ts:findFreeTcpPort -->
<!-- node: function:scripts/run-zotero-direct.ts:inspectDirectSynthesisBundle -->
<!-- node: function:scripts/run-zotero-direct.ts:installTemporaryAddon -->
<!-- node: function:scripts/run-zotero-direct.ts:launchZotero -->
<!-- node: function:scripts/run-zotero-direct.ts:main -->
<!-- node: function:scripts/run-zotero-direct.ts:parseDirectSynthesisRuntimeLogDocument -->
<!-- node: function:scripts/run-zotero-direct.ts:patchPrefsJs -->
<!-- node: function:scripts/run-zotero-direct.ts:patchRuntimeRootPref -->
<!-- node: function:scripts/run-zotero-direct.ts:resolveDirectRuntimeRoot -->
<!-- node: function:scripts/run-zotero-direct.ts:resolveDirectSynthesisTarget -->
<!-- node: function:scripts/run-zotero-direct.ts:stageDirectSynthesisBundle -->
<!-- node: function:scripts/run-zotero-direct.ts:waitForProcessClose -->
<!-- node: function:scripts/run-zotero-direct.ts:watchDirectSynthesisRuntimeLogs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildZoteroLaunchEnv | 函数 | 100–107 | 简单 | environment、zotero、utility | 1 | 组装 Zotero 启动所需的环境变量。 |
| findFreeTcpPort | 函数 | 404–413 | 简单 | network、utility、process | 0 | 探测一个空闲的本地 TCP 端口用于调试服务器。 |
| inspectDirectSynthesisBundle | 函数 | 130–194 | 中等 | validation、sidecar、diagnostics | 0 | 检查暂存目录中的 sidecar bundle 完整性与构建指纹。 |
| installTemporaryAddon | 函数 | 543–569 | 简单 | zotero、rdp、debugging | 0 | 通过 RDP 的 installTemporaryAddon 安装构建目录。 |
| launchZotero | 函数 | 571–622 | 中等 | process、zotero、launcher | 0 | 以 debugger server 参数启动 Zotero 子进程。 |
| main | 函数 | 644–807 | 中等 | entry-point、orchestration、zotero | 0 | 主编排：构建 → 暂存 sidecar → 改写 prefs → 启动 Zotero → 跟踪 runtime log。 |
| parseDirectSynthesisRuntimeLogDocument | 函数 | 205–232 | 简单 | parsing、sidecar、runtime-log | 0 | 解析 sidecar runtime log 文档，并按事件 id 去重。 |
| patchPrefsJs | 函数 | 344–402 | 中等 | configuration、preferences、zotero | 0 | 写入 dev prefs（含关闭自动更新），并保证重复执行幂等。 |
| patchRuntimeRootPref | 函数 | 326–342 | 简单 | configuration、sidecar、preferences | 1 | 把 sidecar runtime root 写入 Zotero 偏好设置。 |
| resolveDirectRuntimeRoot | 函数 | 83–98 | 简单 | filesystem、sidecar、utility | 0 | 解析并创建 sidecar 运行时资产根目录。 |
| resolveDirectSynthesisTarget | 函数 | 109–128 | 简单 | platform、sidecar、derivation | 0 | 由当前平台与架构解析出对应的 Synthesis sidecar target。 |
| stageDirectSynthesisBundle | 函数 | 268–314 | 简单 | sidecar、filesystem、staging | 0 | 把与当前平台匹配的 sidecar bundle 暂存到插件资产树。 |
| waitForProcessClose | 函数 | 624–642 | 简单 | process、lifecycle、utility | 0 | 等待 Zotero 进程退出并把终止信号转发给父进程。 |
| watchDirectSynthesisRuntimeLogs | 函数 | 234–256 | 简单 | polling、runtime-log、diagnostics | 0 | 轮询 runtime log 目录并输出新出现的条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zotero-native-crash-capture.ts](zotero-native-crash-capture.ts.md) | scripts/zotero-native-crash-capture.ts | Zotero 原生崩溃捕获模块：在私有目录布置崩溃 fixture，用 Windows cdb 生成并解析转储，采集进程与平台证据并落盘摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-zotero-compatibility-matrix.ts](run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |
| [run-zotero-start-with-mock.ts](run-zotero-start-with-mock.ts.md) | scripts/run-zotero-start-with-mock.ts | 带 mock SkillRunner 的启动脚本：先拉起本地 mock 后端并等待就绪，再以受控环境启动 Zotero，退出时负责终止全部子进程。 |
| [zotero-plugin.config.ts](../zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildZoteroLaunchEnv | 函数 | 100–107 | 组装 Zotero 启动所需的环境变量。 |
| inspectDirectSynthesisBundle | 函数 | 130–194 | 检查暂存目录中的 sidecar bundle 完整性与构建指纹。 |
| parseDirectSynthesisRuntimeLogDocument | 函数 | 205–232 | 解析 sidecar runtime log 文档，并按事件 id 去重。 |
| patchRuntimeRootPref | 函数 | 326–342 | 把 sidecar runtime root 写入 Zotero 偏好设置。 |
| resolveDirectRuntimeRoot | 函数 | 83–98 | 解析并创建 sidecar 运行时资产根目录。 |
| resolveDirectSynthesisTarget | 函数 | 109–128 | 由当前平台与架构解析出对应的 Synthesis sidecar target。 |
| stageDirectSynthesisBundle | 函数 | 268–314 | 把与当前平台匹配的 sidecar bundle 暂存到插件资产树。 |
