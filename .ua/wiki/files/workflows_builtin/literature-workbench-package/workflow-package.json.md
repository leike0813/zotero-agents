
# workflows_builtin/literature-workbench-package/workflow-package.json
所属分层：[内置工作流包与 Skill 资产](../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package](../../../modules/workflows_builtin/literature-workbench-package.md)
<!-- node: config:workflows_builtin/literature-workbench-package/workflow-package.json -->

文献工作台工作流包的清单文件：声明包 id、版本、界面文案映射与所包含的各工作流目录。
源码：[workflows_builtin/literature-workbench-package/workflow-package.json](../../../../../workflows_builtin/literature-workbench-package/workflow-package.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflow.json](import-notes/workflow.json.md) | workflows_builtin/literature-workbench-package/import-notes/workflow.json | 文献笔记导入工作流的声明式定义：描述选择校验、附件与笔记的输入契约，并通过 hooks 把导入结果落到工作流状态。 |
| [workflow.json](literature-analysis/workflow.json.md) | workflows_builtin/literature-workbench-package/literature-analysis/workflow.json | literature-analysis 工作流的完整声明：选择校验、ACP 请求模板与执行段落，驱动一次文献批量分析并产出四类结构化笔记。 |
| [workflow.json](literature-deep-reading/workflow.json.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/workflow.json | literature-deep-reading 工作流声明：单条目选择校验、分阶段请求模板与执行配置，用于对一篇文献做逐节深度精读。 |
| [workflow.json](literature-explainer/workflow.json.md) | workflows_builtin/literature-workbench-package/literature-explainer/workflow.json | literature-explainer 工作流声明：单条目选择校验与请求模板，产出面向读者的文献解读对话笔记。 |
| [workflow.json](literature-metadata-curator/workflow.json.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/workflow.json | literature-metadata-curator 工作流声明：任务命名模板、参数定义与选择校验，用于批量修正文献元数据。 |
| [workflow.json](literature-search-ingest/workflow.json.md) | workflows_builtin/literature-workbench-package/literature-search-ingest/workflow.json | literature-search-ingest 工作流声明：阶段化参数、选择校验与请求模板，驱动多轮检索发现与逐篇文献入库。 |
| [workflow.json](literature-translator/workflow.json.md) | workflows_builtin/literature-workbench-package/literature-translator/workflow.json | literature-translator 工作流声明：选择校验、请求模板与执行配置，用于对选中文献执行全文翻译。 |
| [workflow.json](tag-auditor/workflow.json.md) | workflows_builtin/literature-workbench-package/tag-auditor/workflow.json | tag-auditor 工作流声明：精简的触发、输入、选择校验与 hooks 配置，只做标签审计而不改写宿主数据。 |
| [workflow.json](tag-bootstrapper/workflow.json.md) | workflows_builtin/literature-workbench-package/tag-bootstrapper/workflow.json | tag-bootstrapper 工作流声明：选择校验、请求模板与执行配置，用于为未标注文献生成初始标签。 |
| [workflow.json](tag-regulator/workflow.json.md) | workflows_builtin/literature-workbench-package/tag-regulator/workflow.json | tag-regulator 工作流声明：选择校验、请求模板与 result 契约，产出可直接应用的标签变更和待审核建议。 |
