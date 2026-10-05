
# workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs -->

为文献 bundle 生成 Better BibTeX 格式参考文献：按物化条目集合请求宿主导出，并在无条目时返回结构化未生成原因。
源码：[workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs:exportBundleBibliography -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| exportBundleBibliography | 函数 | 5–57 | 中等 | export、bibliography | 1 | 请求宿主以 better-bibtex 格式导出 bundle 内全部条目参考文献，并归一化失败原因。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureBundle.mjs](literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [researchBundle.mjs](researchBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/researchBundle.mjs | 研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| exportBundleBibliography | 函数 | 5–57 | 请求宿主以 better-bibtex 格式导出 bundle 内全部条目参考文献，并归一化失败原因。 |
