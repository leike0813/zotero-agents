
# workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs -->

元数据策展工作流的结果回写 hook：把策展得到的题录字段写回条目，并清理策展过程产生的临时标记与产物。
源码：[workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs)

## 符号（7）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs:cleanupResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs:confirmed -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs:normalizeApplyPayload -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs:removeCurationTag -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs:updateMetadata -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 279–283 | 简单 | workflow-hook、entry-point | 0 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| applyResultImpl | 函数 | 206–277 | 复杂 | orchestration、metadata、note-writing | 0 | 策展回写主流程：归一化载荷、写回元数据、清理标记与产物，并附加状态迁移诊断。 |
| cleanupResult | 函数 | 179–204 | 中等 | cleanup、file-io、artifact | 0 | 清理策展过程的临时附件与中间产物，保留用户需要的最终结果。 |
| confirmed | 函数 | 35–44 | 简单 | validation、user-confirmation、metadata | 0 | 判定策展建议字段是否已获用户确认，未确认的字段不进入写回流程。 |
| normalizeApplyPayload | 函数 | 82–164 | 复杂 | normalization、validation、result-contract | 0 | 归一化策展回写载荷：校验字段白名单、类型与取值范围，并汇总拒绝原因。 |
| removeCurationTag | 函数 | 166–177 | 简单 | tag-vocabulary、cleanup、zotero-api | 0 | 回写完成后移除条目上的策展工作流标记标签，保持标签面干净。 |
| updateMetadata | 函数 | 46–80 | 中等 | zotero-api、metadata、write | 0 | 通过宿主 API 更新条目题录字段，保持未涉及字段原值不变。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [metadataCurator.mjs](../../lib/metadataCurator.mjs.md) | workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs | 文献元数据策展核心：从 Extra 字段与 URL 中挑选 DOI/ISBN/arXiv/PMID 等标识符，规范化书目字段与作者，并在改写前保护原始文种元数据。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [statusTransition.mjs](../../lib/statusTransition.mjs.md) | workflows_builtin/literature-workbench-package/lib/statusTransition.mjs | 工作流状态迁移诊断模块：检查结果状态迁移是否合法，并把违规详情收集为可并入结果的诊断项。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 279–283 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
