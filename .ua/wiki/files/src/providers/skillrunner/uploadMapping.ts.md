
# src/providers/skillrunner/uploadMapping.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/uploadMapping.ts -->

SkillRunner 上传路径映射：把工作流声明的输入物化为受控的上传相对路径，并生成 Host Bridge 选择包路径。

规模：72 行
源码：[src/providers/skillrunner/uploadMapping.ts](../../../../../../src/providers/skillrunner/uploadMapping.ts)

## 符号（3）
<!-- node: function:src/providers/skillrunner/uploadMapping.ts:buildHostBridgeSelectionBundlePath -->
<!-- node: function:src/providers/skillrunner/uploadMapping.ts:buildSkillRunnerUploadMapping -->
<!-- node: function:src/providers/skillrunner/uploadMapping.ts:buildSkillRunnerUploadRelativePath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildHostBridgeSelectionBundlePath | 函数 | 63–72 | 简单 | path-handling、host-bridge、utility | 0 | 由 portable item ref 生成 Host Bridge 选择包在 bundle 内的稳定路径。 |
| buildSkillRunnerUploadMapping | 函数 | 37–52 | 中等 | upload、mapping、skillrunner | 0 | 把工作流输入映射为 SkillRunner 上传条目，跳过非文件值并按需附加文件 key。 |
| buildSkillRunnerUploadRelativePath | 函数 | 21–28 | 简单 | upload、path-handling、utility | 0 | 由文件 key 与本地路径生成 `inputs/<key>/<fileName>` 形式的上传相对路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [declarativeRequestCompiler.ts](../../workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [hostBridgeWorkflowAgentRun.ts](../../modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [sequenceRuntime.ts](../../modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildHostBridgeSelectionBundlePath | 函数 | 63–72 | 由 portable item ref 生成 Host Bridge 选择包在 bundle 内的稳定路径。 |
| buildSkillRunnerUploadMapping | 函数 | 37–52 | 把工作流输入映射为 SkillRunner 上传条目，跳过非文件值并按需附加文件 key。 |
| buildSkillRunnerUploadRelativePath | 函数 | 21–28 | 由文件 key 与本地路径生成 `inputs/<key>/<fileName>` 形式的上传相对路径。 |
