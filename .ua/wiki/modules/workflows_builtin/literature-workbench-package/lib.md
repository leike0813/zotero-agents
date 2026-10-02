
# workflows_builtin/literature-workbench-package/lib
> 目录聚合页：30 个文件、156 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [workflows_builtin/literature-workbench-package/lib/bindings.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/bindings.mjs.md) | 文件 | 0 | 绑定模型的 re-export barrel：把 model.mjs 中的 parent binding 相关归一化函数单独暴露给工作流使用。 |
| [workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/bundleBibliography.mjs.md) | 文件 | 1 | 为文献 bundle 生成 Better BibTeX 格式参考文献：按物化条目集合请求宿主导出，并在无条目时返回结构化未生成原因。 |
| [workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs.md) | 文件 | 3 | 由 scripts/content-package 构建脚本生成的 ajv 校验器 bundle，内联编译后的 references/citation/score 三类规范产物的 JSON Schema 校验函数。 |
| [workflows_builtin/literature-workbench-package/lib/clipboard.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/clipboard.mjs.md) | 文件 | 1 | 剪贴板薄封装：通过 workflow runtime 的 hostApi.clipboard 写文本，失败时返回结构化结果而不抛错。 |
| [workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs.md) | 文件 | 7 | 深度阅读结果目标路径推导：把宿主产出的源文件路径映射为 HTML 产物路径，统一处理 Windows/POSIX 路径分隔符与比较用的归一化形式。 |
| [workflows_builtin/literature-workbench-package/lib/digestPayload.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/digestPayload.mjs.md) | 文件 | 1 | 从父条目的托管笔记中定位唯一的 digest 笔记并返回其 Markdown 载荷，检测到多份时按冲突失败。 |
| [workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs.md) | 文件 | 8 | 笔记内嵌 payload 工件的二进制编解码层：把 payload 打成带 CRC 的 PNG 块塞进笔记附件，并在导入时按标记解析还原原始字节。 |
| [workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs.md) | 文件 | 7 | HTML 片段编解码工具：实体转义、base64 UTF-8 编解码与标签属性读写，供笔记 HTML 拼装与解析共用。 |
| [workflows_builtin/literature-workbench-package/lib/importSchemas.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/importSchemas.mjs.md) | 文件 | 5 | 导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。 |
| [workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs.md) | 文件 | 13 | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs.md) | 文件 | 4 | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |
| [workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs.md) | 文件 | 7 | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs.md) | 文件 | 1 | Synthesis sidecar 对接层：把 digest 内容、载荷哈希与笔记 key 组装成输入，委派 sidecar 应用并把失败归一为可重试的 typed 结果。 |
| [workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/markdownLocalImages.mjs.md) | 文件 | 3 | 把 Markdown 中的本地图片引用改写为 bundle 内相对路径，并把图片字节一并搬运到导出目录，是 bundle 跨机可移植的关键一步。 |
| [workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs.md) | 文件 | 8 | 文献元数据策展核心：从 Extra 字段与 URL 中挑选 DOI/ISBN/arXiv/PMID 等标识符，规范化书目字段与作者，并在改写前保护原始文种元数据。 |
| [workflows_builtin/literature-workbench-package/lib/model.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/model.mjs.md) | 文件 | 7 | 标签词表领域模型：定义偏好键常量与分面（FACETS），并实现 parent binding 归一化、暂存条目与远端词表 payload 的规范化逻辑。 |
| [workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs.md) | 文件 | 3 | 笔记内嵌图片的标记读写：解析带标记属性的图片列表、渲染带标记的图片块，并在导入替换时清理本工作台自有的旧图片。 |
| [workflows_builtin/literature-workbench-package/lib/path.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/path.mjs.md) | 文件 | 3 | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs.md) | 文件 | 3 | 参考文献抽取质量闸门：判定解析出的参考文献是否具备可用的题录信息，并在写入 digest 笔记前过滤低质量条目。 |
| [workflows_builtin/literature-workbench-package/lib/remote.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/remote.mjs.md) | 文件 | 6 | 标签词表的 GitHub 远端同步模块：读取已发布词表基线、比对并回写托管版本，同时提供变更订阅能力。 |
| [workflows_builtin/literature-workbench-package/lib/representativeImage.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/representativeImage.mjs.md) | 文件 | 16 | 摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。 |
| [workflows_builtin/literature-workbench-package/lib/researchBundle.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/researchBundle.mjs.md) | 文件 | 5 | 研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。 |
| [workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs.md) | 文件 | 3 | 研究产物包 README 与索引页的 Markdown 渲染模块，按 locale 输出多语言说明并附论文清单表格。 |
| [workflows_builtin/literature-workbench-package/lib/resultOutput.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/resultOutput.mjs.md) | 文件 | 3 | Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。 |
| [workflows_builtin/literature-workbench-package/lib/runtime.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/runtime.mjs.md) | 文件 | 15 | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [workflows_builtin/literature-workbench-package/lib/state.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/state.mjs.md) | 文件 | 3 | 文献工作台包的状态 payload 构造工具库，导出 committed / projection / staged 三种状态载荷的构造函数。 |
| [workflows_builtin/literature-workbench-package/lib/statusTransition.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/statusTransition.mjs.md) | 文件 | 1 | 工作流状态迁移诊断模块：检查结果状态迁移是否合法，并把违规详情收集为可并入结果的诊断项。 |
| [workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs.md) | 文件 | 2 | 标签合规性评估模块：对候选标签列表做归一化并逐项判定是否符合受控词表约束。 |
| [workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs.md) | 文件 | 11 | 标签治理工作流的请求构建模块：从父条目抽取题录与标签、物化有效标签 YAML 与 digest Markdown 输入，产出可供 Agent 消费的请求参数。 |
| [workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs](../../../files/workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs.md) | 文件 | 6 | 翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [workflows_builtin/literature-workbench-package/import-notes/hooks](import-notes/hooks.md) | 1 |
