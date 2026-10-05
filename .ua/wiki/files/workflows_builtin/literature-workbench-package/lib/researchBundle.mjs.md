
# workflows_builtin/literature-workbench-package/lib/researchBundle.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/researchBundle.mjs -->

研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。
源码：[workflows_builtin/literature-workbench-package/lib/researchBundle.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/researchBundle.mjs)

## 符号（5）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundle.mjs:buildResearchProduct -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundle.mjs:computeResearchPaperScore -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundle.mjs:materializeResearchProduct -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundle.mjs:normalizeResearchSelection -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/researchBundle.mjs:researchPayloadArtifactPath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildResearchProduct | 函数 | 142–374 | 复杂 | bundle、orchestration、serialization、research | 0 | 研究包编译主流程：归一化选文、生成主题报告、写出 manifest 与 README，并汇总校验结果。 |
| computeResearchPaperScore | 函数 | 30–39 | 简单 | ranking、scoring、research | 0 | 综合必选标记、主题相关度与被引/排序等信号计算论文在研究包中的展示优先级。 |
| materializeResearchProduct | 函数 | 376–392 | 简单 | bundle、file-io、materialization | 1 | 把编译好的研究包文件写入工作区输出目录，返回可供导出流程消费的文件清单。 |
| normalizeResearchSelection | 函数 | 46–119 | 复杂 | normalization、validation、schema-definition | 0 | 把 Agent 自由格式的研究选题输出归一化为受 schema 约束的结构，丢弃非法条目并记录告警。 |
| researchPayloadArtifactPath | 函数 | 133–140 | 简单 | bundle、path-handling、utility | 0 | 计算研究 payload 在 bundle 内的规范相对路径，保证导出与导入两侧一致。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bundleBibliography.mjs](bundleBibliography.mjs.md) | workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs | 为文献 bundle 生成 Better BibTeX 格式参考文献：按物化条目集合请求宿主导出，并在无条目时返回结构化未生成原因。 |
| [embeddedPayloadAttachments.mjs](embeddedPayloadAttachments.mjs.md) | workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs | 笔记内嵌 payload 工件的二进制编解码层：把 payload 打成带 CRC 的 PNG 块塞进笔记附件，并在导入时按标记解析还原原始字节。 |
| [markdownLocalImages.mjs](markdownLocalImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs | 把 Markdown 中的本地图片引用改写为 bundle 内相对路径，并把图片字节一并搬运到导出目录，是 bundle 跨机可移植的关键一步。 |
| [researchBundleReadme.mjs](researchBundleReadme.mjs.md) | workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs | 研究产物包 README 与索引页的 Markdown 渲染模块，按 locale 输出多语言说明并附论文清单表格。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../export-research-bundle/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/export-research-bundle/hooks/applyResult.mjs | export-research-bundle 工作流的 applyResult hook：读取 Agent 产出的选区清单工件，物化为研究产品并统计各类警告。 |
| [literatureBundle.mjs](literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildResearchProduct | 函数 | 142–374 | 研究包编译主流程：归一化选文、生成主题报告、写出 manifest 与 README，并汇总校验结果。 |
| computeResearchPaperScore | 函数 | 30–39 | 综合必选标记、主题相关度与被引/排序等信号计算论文在研究包中的展示优先级。 |
| materializeResearchProduct | 函数 | 376–392 | 把编译好的研究包文件写入工作区输出目录，返回可供导出流程消费的文件清单。 |
| normalizeResearchSelection | 函数 | 46–119 | 把 Agent 自由格式的研究选题输出归一化为受 schema 约束的结构，丢弃非法条目并记录告警。 |
| researchPayloadArtifactPath | 函数 | 133–140 | 计算研究 payload 在 bundle 内的规范相对路径，保证导出与导入两侧一致。 |
