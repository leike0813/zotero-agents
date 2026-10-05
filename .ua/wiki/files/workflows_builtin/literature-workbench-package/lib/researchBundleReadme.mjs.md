
# workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs -->

研究产物包 README 与索引页的 Markdown 渲染模块，按 locale 输出多语言说明并附论文清单表格。
源码：[workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs:renderResearchBundleIndex -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs:renderResearchBundleReadme -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs:resolveResearchBundleReadmeLocale -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| renderResearchBundleIndex | 函数 | 178–198 | 简单 | rendering、markdown、bundle | 0 | 渲染 bundle 内的文件索引页，列出各产物文件路径、大小与说明。 |
| renderResearchBundleReadme | 函数 | 115–176 | 中等 | rendering、markdown、i18n | 0 | 渲染研究包主 README：写入概览、选题说明与排序后的论文表格，并做单元格转义。 |
| resolveResearchBundleReadmeLocale | 函数 | 109–113 | 简单 | i18n、locale、utility | 0 | 按宿主语言与显式参数解析 README 使用的 locale，回退到默认语言。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [researchBundle.mjs](researchBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/researchBundle.mjs | 研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| renderResearchBundleIndex | 函数 | 178–198 | 渲染 bundle 内的文件索引页，列出各产物文件路径、大小与说明。 |
| renderResearchBundleReadme | 函数 | 115–176 | 渲染研究包主 README：写入概览、选题说明与排序后的论文表格，并做单元格转义。 |
| resolveResearchBundleReadmeLocale | 函数 | 109–113 | 按宿主语言与显式参数解析 README 使用的 locale，回退到默认语言。 |
