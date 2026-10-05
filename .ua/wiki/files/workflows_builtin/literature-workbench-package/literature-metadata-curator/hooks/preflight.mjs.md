
# workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs -->

元数据策展工作流的 preflight hook：解析条目标识符、在受控数据源中查找权威题录，并给出可执行状态供 UI 展示。
源码：[workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs:preflight -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs:preflightImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs:translateIdentifier -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| preflight | 函数 | 174–178 | 简单 | workflow-hook、entry-point | 0 | preflight 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| preflightImpl | 函数 | 93–172 | 中等 | preflight、readiness-check、orchestration | 0 | preflight 主逻辑：解析标识符、查询可用的策展路径，产出阻塞原因与建议的下一步。 |
| translateIdentifier | 函数 | 15–91 | 复杂 | identifier、normalization、metadata | 0 | 把条目标识符（DOI、ISBN、arXiv、PMID 等）归一化为受支持的查询形式，并判定可用数据源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [metadataCurator.mjs](../../lib/metadataCurator.mjs.md) | workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs | 文献元数据策展核心：从 Extra 字段与 URL 中挑选 DOI/ISBN/arXiv/PMID 等标识符，规范化书目字段与作者，并在改写前保护原始文种元数据。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| preflight | 函数 | 174–178 | preflight 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
