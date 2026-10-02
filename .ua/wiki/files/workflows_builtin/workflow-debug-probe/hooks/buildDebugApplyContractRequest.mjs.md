
# workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs -->

调试 apply 契约的请求构造器，生成单步与序列两种 apply 请求（目标父条目、参数、产物声明），是本调试探针包中逻辑最密集的模块。
源码：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs)

## 符号（9）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildRequestImpl -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildSequenceRequest -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildSequenceStep -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildSingleRequest -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildStepParameter -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:createTestParent -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:randomRunKey -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:resolveWorkflowParams -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 310–312 | 简单 | 请求构造、入口、薄包装 | 0 | 请求构造的公开入口，容错地委派到内部实现 buildRequestImpl。 |
| [buildRequestImpl](../../../../symbols/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs/buildRequestImpl.md) | 函数 | 137–308 | 复杂 | 请求构造、分派、序列编排、调试探针 | 1 | 按工作流 ID 分派构造单步 job 或多步 sequence 请求，覆盖 bundle/result 模式、workspace 新建与复用、交互式步骤等全部调试场景。 |
| buildSequenceRequest | 函数 | 113–135 | 中等 | 请求构造、序列编排、skillrunner | 1 | 组装 skillrunner.sequence.v1 序列请求，绑定目标父条目、步骤列表、最终步骤 ID 与更长的轮询超时。 |
| buildSequenceStep | 函数 | 81–111 | 中等 | 请求构造、序列编排、workspace、步骤声明 | 1 | 构造序列中的一个步骤声明，包含 skill、workspace 策略、fetch_type、可选 apply_result 契约与步骤参数。 |
| [buildSingleRequest](../../../../symbols/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs/buildSingleRequest.md) | 函数 | 53–79 | 中等 | 请求构造、skillrunner、单步任务 | 2 | 构造单个 skillrunner.job.v1 请求：选定探针 skill、目标父条目、fetch_type 与轮询参数。 |
| [buildStepParameter](../../../../symbols/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs/buildStepParameter.md) | 函数 | 43–51 | 简单 | 参数构造、调试标记、工具函数 | 2 | 生成步骤参数：workflow/step/run 标识与可读消息，result 模式额外附带调试标签。 |
| createTestParent | 函数 | 21–41 | 中等 | 条目创建、宿主写入、测试夹具、异步 | 1 | 为每次调试运行创建一条临时期刊条目作为目标父条目，并返回条目、标题与工作流 ID。 |
| [randomRunKey](../../../../symbols/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs/randomRunKey.md) | 函数 | 9–11 | 简单 | 工具函数、随机标识、调试标记 | 2 | 生成短随机 run key，用于区分同一次调试运行产生的条目、标签与附件。 |
| resolveWorkflowParams | 函数 | 13–19 | 简单 | 参数解析、开关控制、工具函数 | 1 | 从执行选项读取 run_result_step / skip_result_step 开关，控制序列是否追加或跳过结果步骤。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [buildExistingParentDebugApplyRequest.mjs](buildExistingParentDebugApplyRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs | 针对已有父条目场景构造 apply 请求的构建器，从工作流参数与选中条目解析出目标父条目后调用通用契约请求构造逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 310–312 | 请求构造的公开入口，容错地委派到内部实现 buildRequestImpl。 |
| [buildSingleRequest](../../../../symbols/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs/buildSingleRequest.md) | 函数 | 53–79 | 构造单个 skillrunner.job.v1 请求：选定探针 skill、目标父条目、fetch_type 与轮询参数。 |
| [randomRunKey](../../../../symbols/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs/randomRunKey.md) | 函数 | 9–11 | 生成短随机 run key，用于区分同一次调试运行产生的条目、标签与附件。 |
