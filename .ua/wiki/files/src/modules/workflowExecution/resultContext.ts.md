
# src/modules/workflowExecution/resultContext.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/resultContext.ts -->

构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。
源码：[src/modules/workflowExecution/resultContext.ts](../../../../../../src/modules/workflowExecution/resultContext.ts)

## 符号（6）
<!-- node: function:src/modules/workflowExecution/resultContext.ts:addNamespacedPathCandidates -->
<!-- node: function:src/modules/workflowExecution/resultContext.ts:addPathCandidates -->
<!-- node: function:src/modules/workflowExecution/resultContext.ts:buildArtifactCandidates -->
<!-- node: function:src/modules/workflowExecution/resultContext.ts:createWorkflowResultContext -->
<!-- node: function:src/modules/workflowExecution/resultContext.ts:getResultJsonStringField -->
<!-- node: function:src/modules/workflowExecution/resultContext.ts:tryReadResultJson -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| addNamespacedPathCandidates | 函数 | 287–327 | 简单 | path-resolution、namespace、candidates | 1 | 为候选路径追加命名空间前缀变体，兼容不同 Provider 的产物目录布局。 |
| addPathCandidates | 函数 | 227–285 | 中等 | path-resolution、candidates、deduplication | 1 | 把一组基础路径展开为候选路径集合并去重。 |
| [buildArtifactCandidates](../../../../symbols/src/modules/workflowExecution/resultContext.ts/buildArtifactCandidates.md) | 函数 | 329–364 | 简单 | path-resolution、artifact、candidates | 2 | 组合基础路径、命名空间与文件名后缀，生成最终产物候选列表。 |
| [createWorkflowResultContext](../../../../symbols/src/modules/workflowExecution/resultContext.ts/createWorkflowResultContext.md) | 函数 | 442–578 | 中等 | result-context、factory、artifact、parsing、io | 3 | 构造工作流结果上下文：打开 bundle reader、定位并解析 result.json，并暴露按字段与产物路径读取的访问器。 |
| getResultJsonStringField | 函数 | 580–589 | 简单 | result-context、accessor、field-access | 0 | 从已解析的 result.json 中读取字符串字段，缺失时返回空值。 |
| tryReadResultJson | 函数 | 373–440 | 中等 | result-context、parsing、fallback、io | 1 | 按候选列表依次尝试读取并解析 result.json，失败时静默继续下一候选。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bundleIO.ts](bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [resultEnvelope.ts](resultEnvelope.ts.md) | src/modules/workflowExecution/resultEnvelope.ts | 解包 SkillRunner 返回结果的外层信封，识别带有 success_source / repair_level / artifacts 等特征字段时取出内部 data，否则按 result 嵌套逐层下探。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [hostBridgeWorkflowControl.ts](../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [sequenceStepApply.ts](sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunFeedback.ts](../skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [skillRunnerForegroundContinuation.ts](../skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowProductStore.ts](../workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createWorkflowResultContext](../../../../symbols/src/modules/workflowExecution/resultContext.ts/createWorkflowResultContext.md) | 函数 | 442–578 | 构造工作流结果上下文：打开 bundle reader、定位并解析 result.json，并暴露按字段与产物路径读取的访问器。 |
| getResultJsonStringField | 函数 | 580–589 | 从已解析的 result.json 中读取字符串字段，缺失时返回空值。 |
