
# workflows_builtin/workflow-debug-probe/workflow-package.json
所属分层：[内置工作流包与 Skill 资产](../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe](../../../modules/workflows_builtin/workflow-debug-probe.md)
<!-- node: config:workflows_builtin/workflow-debug-probe/workflow-package.json -->

调试探针包清单（id workflow-debug-probe，version 0.2.0），以相对路径枚举根工作流与 18 个 debug-* 子工作流定义。
源码：[workflows_builtin/workflow-debug-probe/workflow-package.json](../../../../../workflows_builtin/workflow-debug-probe/workflow-package.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflow.json](debug-apply-bundle-then-result/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-bundle-then-result/workflow.json | 调试探针工作流：先产出 bundle 再产出 result，用于验证工作流中产物提交顺序对调试链路的影响。 |
| [workflow.json](debug-apply-existing-parent-bundle/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-existing-parent-bundle/workflow.json | 调试探针工作流：针对复用既有父级 bundle 的 apply 路径，验证子工作流继承父级产物的行为。 |
| [workflow.json](debug-apply-manifest-bundle/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-manifest-bundle/workflow.json | 调试探针工作流：验证以 manifest 形式声明并提交 bundle 的 apply 路径。 |
| [workflow.json](debug-apply-result-then-bundle/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-result-then-bundle/workflow.json | 调试探针工作流：先产出 result 再产出 bundle，与 bundle-first 版本形成对照，验证提交顺序差异。 |
| [workflow.json](debug-apply-sequence-bundle/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-sequence-bundle/workflow.json | 调试探针工作流：在序列（sequence）步骤中产出 bundle，验证序列式提交的调试行为。 |
| [workflow.json](debug-apply-sequence-result/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-sequence-result/workflow.json | 调试探针工作流：在序列（sequence）步骤中产出 result，验证序列式结果提交的调试行为。 |
| [workflow.json](debug-apply-single-bundle/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-single-bundle/workflow.json | 调试探针工作流：单步骤产出 bundle 的最小 apply 用例，作为调试基线。 |
| [workflow.json](debug-apply-single-result/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-apply-single-result/workflow.json | 调试探针工作流：单步骤产出 result 的最小 apply 用例，作为调试基线。 |
| [workflow.json](debug-host-bridge-connectivity-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-host-bridge-connectivity-probe/workflow.json | 调试探针工作流：探测 Host Bridge 连通性，验证插件与宿主能力桥之间的调用链路是否可用。 |
| [workflow.json](debug-host-bridge-connectivity-sequence-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-host-bridge-connectivity-sequence-probe/workflow.json | 调试探针工作流：在序列步骤中多次探测 Host Bridge 连通性，验证长会话下的连接稳定性。 |
| [workflow.json](debug-host-queue-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-host-queue-probe/workflow.json | 调试探针工作流：探测宿主任务队列行为，验证并发排队与执行顺序。 |
| [workflow.json](debug-interactive-choice-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-interactive-choice-probe/workflow.json | 调试探针工作流：触发交互式选择，验证工作流暂停等待用户选择与恢复的执行路径。 |
| [workflow.json](debug-interactive-then-result/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-interactive-then-result/workflow.json | 调试探针工作流：先发起交互式选择再产出 result，验证交互恢复后结果提交的连续性。 |
| [workflow.json](debug-sequence-context-isolation-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-sequence-context-isolation-probe/workflow.json | 调试探针工作流：验证序列步骤之间的上下文隔离，确认前一步产物不会污染后一步输入。 |
| [workflow.json](debug-sequence-countdown-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-sequence-countdown-probe/workflow.json | 调试探针工作流：用倒计时步骤串联多个 sequence 调用，验证长序列执行与中断处理。 |
| [workflow.json](debug-sequence-file-handoff-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-sequence-file-handoff-probe/workflow.json | 调试探针工作流：验证 sequence 步骤之间的文件交接，确认中间产物文件在步骤间正确传递。 |
| [workflow.json](debug-sequence-linear-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe/workflow.json | 调试探针工作流包「线性序列」变体的声明文件，描述以线性顺序串联多个探针步骤的执行图，用于回归验证 workflow 引擎的顺序调度语义。 |
| [workflow.json](debug-sequence-workspace-reuse-probe/workflow.json.md) | workflows_builtin/workflow-debug-probe/debug-sequence-workspace-reuse-probe/workflow.json | 调试探针工作流包「工作区复用」变体的声明文件，验证连续步骤之间共享同一 workspace 产物与状态的能力。 |
| [workflow.json](workflow.json.md) | workflows_builtin/workflow-debug-probe/workflow.json | 根调试探针工作流定义（schemaVersion 2，provider pass-through，debug_only），声明 selection 型输入、无需选择即可触发，并挂载 applyResult 钩子。 |
