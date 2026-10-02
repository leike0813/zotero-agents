
# workflows_builtin/synthesis-layer/locales/ko-KR.json
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[workflows_builtin/synthesis-layer/locales](../../../../modules/workflows_builtin/synthesis-layer/locales.md)
<!-- node: config:workflows_builtin/synthesis-layer/locales/ko-KR.json -->

Synthesis 工作流包的韩语（ko-KR 区域）本地化文案文件，共 38 条扁平化 i18n key，为 create-topic-synthesis（创建主题综述）、topic-planner（主题规划）、manuscript-literature-framing（手稿文献定位）、update-topic-synthesis（更新主题综述） 提供 label、taskNameTemplate、参数 title/description 与所引用 skill 的 name 显示文本。
源码：[workflows_builtin/synthesis-layer/locales/ko-KR.json](../../../../../../workflows_builtin/synthesis-layer/locales/ko-KR.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflow-package.json](../workflow-package.json.md) | workflows_builtin/synthesis-layer/workflow-package.json | synthesis-layer 工作流包的清单文件，声明该包包含哪些工作流及其元信息。 |
| [workflow.json](../create-topic-synthesis/workflow.json.md) | workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json | create-topic-synthesis 工作流声明：任务命名模板、参数定义、选择校验与请求模板，驱动主题综述的生成。 |
| [workflow.json](../manuscript-literature-framing/workflow.json.md) | workflows_builtin/synthesis-layer/manuscript-literature-framing/workflow.json | manuscript-literature-framing 工作流的声明式定义，描述任务步骤、hook 与产物结构，属于可插拔工作流包的一部分。 |
| [workflow.json](../topic-planner/workflow.json.md) | workflows_builtin/synthesis-layer/topic-planner/workflow.json | topic-planner 工作流的声明式定义，声明规划阶段的步骤、参数与结果 hook。 |
| [workflow.json](../update-topic-synthesis/workflow.json.md) | workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json | update-topic-synthesis 工作流的声明式定义，串联主题综合更新的各步骤与结果回写 hook。 |
