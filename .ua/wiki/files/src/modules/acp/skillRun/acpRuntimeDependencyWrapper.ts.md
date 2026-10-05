
# src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts -->

Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。
源码：[src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts](../../../../../../../src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts)

## 符号（9）
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:buildAcpRuntimeDependencyPlan -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:buildPythonDependencyProbeScript -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:buildRuntimeDependencyFailureMessage -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:defaultAcpRuntimeDependencyProbe -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:probeDependenciesWithSystemPython -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:probeDependenciesWithUv -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:resolveSkillRuntimeDependencies -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:runDependencyProbeCommand -->
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:wrapAcpBackendWithUv -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildAcpRuntimeDependencyPlan](../../../../../symbols/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts/buildAcpRuntimeDependencyPlan.md) | 函数 | 369–491 | 复杂 | acp、runtime、planner、entry-point | 1 | 构建 ACP 运行时的依赖方案：探测工具链、决定是否用 uv 包装并生成最终启动配置与失败信息。 |
| buildPythonDependencyProbeScript | 函数 | 273–314 | 中等 | acp、codegen、probe | 0 | 生成在 Python 解释器内执行的依赖探测脚本，输出可解析的 JSON 结果。 |
| buildRuntimeDependencyFailureMessage | 函数 | 353–367 | 简单 | acp、diagnostics、error-message | 0 | 组装依赖缺失时的可读诊断消息，列出缺失项与建议的安装方式。 |
| [defaultAcpRuntimeDependencyProbe](../../../../../symbols/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts/defaultAcpRuntimeDependencyProbe.md) | 函数 | 184–236 | 复杂 | acp、runtime、probe | 1 | 默认依赖探测实现：依次尝试 uv 与系统 Python，汇总可用工具链。 |
| probeDependenciesWithSystemPython | 函数 | 316–343 | 中等 | acp、python、probe | 0 | 回退到系统 Python 执行同一依赖探测脚本。 |
| probeDependenciesWithUv | 函数 | 238–271 | 中等 | acp、uv、probe | 0 | 通过 uv 环境探测依赖可用性，返回结构化的依赖满足报告。 |
| resolveSkillRuntimeDependencies | 函数 | 52–63 | 简单 | acp、runtime、dependency | 0 | 读取 Skill 声明的运行时依赖（Python/Node 工具链），输出待探测的依赖清单。 |
| runDependencyProbeCommand | 函数 | 103–182 | 复杂 | acp、subprocess、probe | 0 | 在受管子进程中执行依赖探测脚本，解析退出码与输出判断工具是否可用。 |
| wrapAcpBackendWithUv | 函数 | 65–89 | 中等 | acp、runtime、uv、wrapper | 0 | 用 uv 包装 ACP 后端启动命令，使其在隔离环境中安装并执行 Skill 依赖。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAgentFamilyResolver.ts](acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [command.ts](../../../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [buildAcpRuntimeDependencyPlan](../../../../../symbols/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts/buildAcpRuntimeDependencyPlan.md) | 函数 | 369–491 | 构建 ACP 运行时的依赖方案：探测工具链、决定是否用 uv 包装并生成最终启动配置与失败信息。 |
| [defaultAcpRuntimeDependencyProbe](../../../../../symbols/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts/defaultAcpRuntimeDependencyProbe.md) | 函数 | 184–236 | 默认依赖探测实现：依次尝试 uv 与系统 Python，汇总可用工具链。 |
| resolveSkillRuntimeDependencies | 函数 | 52–63 | 读取 Skill 声明的运行时依赖（Python/Node 工具链），输出待探测的依赖清单。 |
| wrapAcpBackendWithUv | 函数 | 65–89 | 用 uv 包装 ACP 后端启动命令，使其在隔离环境中安装并执行 Skill 依赖。 |
