
# workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[workflows_builtin/synthesis-layer/hooks](../../../../modules/workflows_builtin/synthesis-layer/hooks.md)
<!-- node: file:workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs -->

Synthesis 工作流包的 hook 脚本，把 topic planner 产出的规划结果应用到工作流上下文中，是规划阶段的结果落地点。
源码：[workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs](../../../../../../workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs)

## 符号（2）
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs:readJsonCandidate -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 23–41 | 简单 | hook、入口点、校验、错误处理 | 0 | 导出的 hook 入口：校验结果必须是 topic_plan/reconcile 类型，再调用 Workflow Host 的 applyTopicPlan 落库；命中 conflict 时抛出带 topic_plan_conflict 错误码与结构化结果的异常。 |
| readJsonCandidate | 函数 | 5–21 | 简单 | 解析、结果读取、工具函数、容错 | 1 | 从 hook 参数的多种候选位置（runResult.json / resultJson / result_json / resultContext.resultJson / runResult.text）提取 JSON 结果对象，任一命中即返回，否则返回 null。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 23–41 | 导出的 hook 入口：校验结果必须是 topic_plan/reconcile 类型，再调用 Workflow Host 的 applyTopicPlan 落库；命中 conflict 时抛出带 topic_plan_conflict 错误码与结构化结果的异常。 |
