
# workflows_builtin/synthesis-layer/topic-planner/workflow.json
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[workflows_builtin/synthesis-layer/topic-planner](../../../../modules/workflows_builtin/synthesis-layer/topic-planner.md)
<!-- node: config:workflows_builtin/synthesis-layer/topic-planner/workflow.json -->

topic-planner 工作流的声明式定义，声明规划阶段的步骤、参数与结果 hook。
源码：[workflows_builtin/synthesis-layer/topic-planner/workflow.json](../../../../../../workflows_builtin/synthesis-layer/topic-planner/workflow.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyTopicPlanResult.mjs](../hooks/applyTopicPlanResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs | Synthesis 工作流包的 hook 脚本，把 topic planner 产出的规划结果应用到工作流上下文中，是规划阶段的结果落地点。 |
