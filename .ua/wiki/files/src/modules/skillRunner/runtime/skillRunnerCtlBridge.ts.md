
# src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/runtime](../../../../../modules/src/modules/skillRunner/runtime.md)
<!-- node: file:src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts -->

SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。
源码：[src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts](../../../../../../../src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts)

## 符号（5）
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts:buildCtlInvocation -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts:isTcpPortAvailable -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts:normalizeCtlResult -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts:runCommand -->
<!-- node: class:src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts:SkillRunnerCtlBridge -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildCtlInvocation | 函数 | 556–623 | 复杂 | skillrunner、command、cross-platform、bridge | 0 | 构造 ctl 命令调用：按平台选择可执行文件与参数形式，Windows 下改用 PowerShell 包装。 |
| isTcpPortAvailable | 函数 | 320–387 | 复杂 | skillrunner、network、port、bootstrap | 0 | 探测本地端口是否可用并选端口，为本地 Skill-Runner 服务选择不冲突的监听地址。 |
| normalizeCtlResult | 函数 | 477–507 | 中等 | skillrunner、parsing、normalization、bridge | 0 | 归一化 ctl 的 JSON 输出：容忍包裹在文本中的候选片段，提取结构化结果与错误。 |
| runCommand | 函数 | 402–444 | 中等 | skillrunner、subprocess、diagnostics、bridge | 0 | 执行一次 ctl 子进程调用，聚合流式输出、超时与退出码，失败时保留日志尾部用于诊断。 |
| SkillRunnerCtlBridge | 类 | 753–2242 | 复杂 | skillrunner、bridge、lifecycle、process-management | 0 | 本地 Skill-Runner 控制面桥接类：负责 ctl 可执行定位、端口选择、进程保活与 up/down/status/doctor 等生命周期命令，是旧后端兼容路径的核心。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [command.ts](../../../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [path.ts](../../../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillRunnerLocalDeployDebugStore.ts](skillRunnerLocalDeployDebugStore.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts | 本地运行时部署调试日志的内存存储：只在调试模式开启时记录部署各阶段的结构化条目，供调试对话框查看与复制。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerLocalRuntimeManager.ts](skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerReleaseInstaller.ts](skillRunnerReleaseInstaller.ts.md) | src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts | SkillRunner 发布版安装器：经 ctl bridge 触发后端自身安装/升级，解析版本并把安装结果写入运行时持久化目录。 |
