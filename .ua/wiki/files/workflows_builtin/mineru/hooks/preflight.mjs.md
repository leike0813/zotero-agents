
# workflows_builtin/mineru/hooks/preflight.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/mineru/hooks](../../../../modules/workflows_builtin/mineru/hooks.md)
<!-- node: file:workflows_builtin/mineru/hooks/preflight.mjs -->

MinerU 工作流的 preflight hook，在请求发出前校验源附件是否可读、页数等元数据是否齐备，并通过 readPdfSplitMetadata 计算 PDF 拆分方案，缺条件时以结构化错误中止。
源码：[workflows_builtin/mineru/hooks/preflight.mjs](../../../../../../workflows_builtin/mineru/hooks/preflight.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/mineru/hooks/preflight.mjs:preflight -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| preflight | 函数 | 9–102 | 中等 | entry-point、workflow-hook、split-planning、fan-out | 0 | preflight hook 入口：读取 PDF 元数据，未超页数上限时继续单请求执行，超限时返回 replace-units 把工作流展开为多个页码分片并配置聚合策略。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pdfSplitPlan.mjs](../lib/pdfSplitPlan.mjs.md) | workflows_builtin/mineru/lib/pdfSplitPlan.mjs | MinerU 工作流的 PDF 拆分计划库，读取 Zotero 附件的页数与 outline（优先 pdf.js、其次元数据 helper、最后回退到 PDF 文本启发式），并按 outline 章节边界切分页码区间，输出可供各 hook 消费的 split plan 与聚合 id。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| preflight | 函数 | 9–102 | preflight hook 入口：读取 PDF 元数据，未超页数上限时继续单请求执行，超限时返回 replace-units 把工作流展开为多个页码分片并配置聚合策略。 |
