
# workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[workflows_builtin/synthesis-layer/update-topic-synthesis](../../../../modules/workflows_builtin/synthesis-layer/update-topic-synthesis.md)
<!-- node: config:workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json -->

update-topic-synthesis 工作流的声明式定义，串联主题综合更新的各步骤与结果回写 hook。
源码：[workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json](../../../../../../workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyTopicSynthesisResult.mjs](../hooks/applyTopicSynthesisResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs | Synthesis 工作流包的 hook 脚本，负责把主题综合阶段的执行结果整理并写回工作流状态，是综合产物生成的收口逻辑。 |
