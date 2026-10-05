
# src/modules/workflowExecution/bundleIO.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/bundleIO.ts -->

运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。
源码：[src/modules/workflowExecution/bundleIO.ts](../../../../../../src/modules/workflowExecution/bundleIO.ts)

## 符号（6）
<!-- node: function:src/modules/workflowExecution/bundleIO.ts:buildTempBundlePath -->
<!-- node: function:src/modules/workflowExecution/bundleIO.ts:createDirectoryBundleReader -->
<!-- node: function:src/modules/workflowExecution/bundleIO.ts:createUnavailableBundleReader -->
<!-- node: function:src/modules/workflowExecution/bundleIO.ts:openRunResultBundleReader -->
<!-- node: function:src/modules/workflowExecution/bundleIO.ts:removeFileIfExists -->
<!-- node: function:src/modules/workflowExecution/bundleIO.ts:writeBytes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildTempBundlePath | 函数 | 18–22 | 简单 | bundle、path、temporary | 0 | 构造运行结果 bundle 在临时目录中的路径。 |
| createDirectoryBundleReader | 函数 | 51–71 | 简单 | bundle、reader、filesystem | 1 | 基于目录构造 BundleReader，支持文本与字节读取并对缺失条目返回受控错误。 |
| createUnavailableBundleReader | 函数 | 32–40 | 简单 | bundle、reader、unavailable、error-handling | 1 | 构造不可用的 BundleReader，所有读取均返回受控失败。 |
| [openRunResultBundleReader](../../../../symbols/src/modules/workflowExecution/bundleIO.ts/openRunResultBundleReader.md) | 函数 | 84–114 | 简单 | bundle、reader、zip、fallback | 2 | 打开运行结果 bundle：优先目录结果，其次 zip 结果，均不可用时回落到不可用 reader。 |
| removeFileIfExists | 函数 | 28–30 | 简单 | bundle、io、cleanup | 0 | 删除已存在的 bundle 文件，缺失时静默返回。 |
| writeBytes | 函数 | 24–26 | 简单 | bundle、io、write | 0 | 将字节写入 bundle 路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [zipBundleReader.ts](../../workflows/zipBundleReader.ts.md) | src/workflows/zipBundleReader.ts | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [client.ts](../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [resultContext.ts](resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [sequenceStepApply.ts](sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunFeedback.ts](../skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [skillRunnerForegroundContinuation.ts](../skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildTempBundlePath | 函数 | 18–22 | 构造运行结果 bundle 在临时目录中的路径。 |
| createDirectoryBundleReader | 函数 | 51–71 | 基于目录构造 BundleReader，支持文本与字节读取并对缺失条目返回受控错误。 |
| createUnavailableBundleReader | 函数 | 32–40 | 构造不可用的 BundleReader，所有读取均返回受控失败。 |
| [openRunResultBundleReader](../../../../symbols/src/modules/workflowExecution/bundleIO.ts/openRunResultBundleReader.md) | 函数 | 84–114 | 打开运行结果 bundle：优先目录结果，其次 zip 结果，均不可用时回落到不可用 reader。 |
| removeFileIfExists | 函数 | 28–30 | 删除已存在的 bundle 文件，缺失时静默返回。 |
| writeBytes | 函数 | 24–26 | 将字节写入 bundle 路径。 |
