
# workflows_builtin/literature-workbench-package/lib/runtime.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/runtime.mjs -->

工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。
源码：[workflows_builtin/literature-workbench-package/lib/runtime.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/runtime.mjs)

## 符号（15）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:appendWorkflowRuntimeLog -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:decodeRuntimeBase64Utf8 -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:emitAccessorDiagnostic -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:encodeRuntimeBase64Utf8 -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:measureWorkflowTestSpan -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:portableItemRef -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:readHostPages -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:requireCommittedMutation -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:requireHostApi -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:resolveAddonConfig -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:resolveHostApi -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:resolveRuntimeFetch -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:resolveSelectionAttachmentRefs -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:resolveSelectionParentRef -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/runtime.mjs:showWorkflowToast -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendWorkflowRuntimeLog | 函数 | 374–385 | 简单 | logging、observability、utility | 0 | 把运行期日志追加到插件日志通道，附带工作流包与任务标识。 |
| decodeRuntimeBase64Utf8 | 函数 | 359–372 | 简单 | runtime-adapter、encoding、sandbox-compat | 1 | encodeRuntimeBase64Utf8 的解码对应实现，处理宿主缺失原生 API 的情况。 |
| emitAccessorDiagnostic | 函数 | 150–173 | 简单 | diagnostics、observability、debugging | 0 | 在访问宿主能力时记录诊断日志，用于定位插件侧与宿主侧的契约不一致。 |
| encodeRuntimeBase64Utf8 | 函数 | 344–357 | 简单 | runtime-adapter、encoding、sandbox-compat | 1 | 跨运行时实现 UTF-8 到 base64 的编码，优先使用宿主原生能力并提供回退路径。 |
| measureWorkflowTestSpan | 函数 | 212–228 | 简单 | observability、performance、testing | 0 | 通过注入的性能探针测量工作流阶段耗时，未配置探针时零成本返回。 |
| portableItemRef | 函数 | 9–24 | 简单 | host-api、serialization、portable-ref | 1 | 把 Zotero item 转换为跨工作流传递的可移植引用（key/kind），避免在请求中携带原生 ID。 |
| [readHostPages](../../../../symbols/workflows_builtin/literature-workbench-package/lib/runtime.mjs/readHostPages.md) | 函数 | 248–269 | 简单 | host-api、pagination、bounded-read | 2 | 分页读取宿主条目列表，按类型与选择范围收敛结果并强制上限，避免全库无界读取。 |
| requireCommittedMutation | 函数 | 82–94 | 简单 | validation、mutation-authority、guard | 1 | 断言工作流已提交 mutation scope，未提交时拒绝执行写操作，守卫 canonical mutation 语义。 |
| [requireHostApi](../../../../symbols/workflows_builtin/literature-workbench-package/lib/runtime.mjs/requireHostApi.md) | 函数 | 230–246 | 简单 | host-api、entry-point、error-handling | 3 | requireHostApi 的包装入口，附带包级 runtime scope 诊断与错误归一化。 |
| resolveAddonConfig | 函数 | 279–295 | 简单 | configuration、host-api、resolution | 0 | 读取插件 addon 配置中的工作流包设置，缺省时回落到包内默认值。 |
| resolveHostApi | 函数 | 105–117 | 简单 | host-api、resolution、error-handling | 0 | 从执行参数中取出宿主 API 句柄，缺失时抛出明确的 host contract 错误。 |
| resolveRuntimeFetch | 函数 | 297–306 | 简单 | runtime-adapter、network、sandbox-compat | 0 | 探测当前运行时可用的 fetch 实现，缺失时给出可操作的错误说明。 |
| resolveSelectionAttachmentRefs | 函数 | 51–63 | 简单 | selection、attachment-lifecycle、host-api | 0 | 枚举选中条目下可用的附件引用，供附件导入与翻译类工作流消费。 |
| resolveSelectionParentRef | 函数 | 34–49 | 简单 | selection、host-api、resolution | 0 | 从当前选择中解析父条目引用，处理单选、多选与仅选中文档附件等情形。 |
| showWorkflowToast | 函数 | 387–393 | 简单 | ui、host-api、notification | 0 | 在 Zotero 主窗口弹出工作流结果提示，宿主能力缺失时降级为静默。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../add-digest-representative-image/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/applyResult.mjs | 为 digest 笔记补写代表图的 applyResult hook：把用户选定的 Markdown 附件中的图片定位出来，校验目标路径后写入 digest 笔记的代表图区块。 |
| [applyResult.mjs](../collection-collector/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs | collection-collector 工作流的 applyResult hook：按收录阈值把 Agent 输出的论文 ref 列表与当前 Zotero 分类中的条目做匹配，产出纳入/排除结果。 |
| [applyResult.mjs](../debug-digest-apply-fixture/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs | 调试专用 hook：用内嵌的固定 base64 PNG 在本地构造测试 digest 笔记，用于在没有真实文献源时验证 digest 应用链路。 |
| [applyResult.mjs](../debug-note-artifact-inspector/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs | 调试 hook：检查指定笔记的产物完整性，列出缺失/损坏的工件块并尝试复制诊断信息到剪贴板。 |
| [applyResult.mjs](../export-literature-bundle/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs | export-literature-bundle 工作流的 applyResult hook：把选区导出为可移植的文献 bundle（可选 source-only 模式与目标分类）。 |
| [applyResult.mjs](../export-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/export-notes/hooks/applyResult.mjs | export-notes 工作流的 applyResult hook：把选中的生成笔记（digest、引用分析、评分等）逐个导出为文件，支持文本、字节与源文件复制三种载荷。 |
| [applyResult.mjs](../import-literature-bundle/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs | import-literature-bundle 工作流的 applyResult hook：把已选择的文献 bundle 归档导入 Zotero 库，并断言导入结果成功。 |
| [applyResult.mjs](../import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |
| [applyResult.mjs](../literature-deep-reading/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs | 深度阅读工作流的结果回写 hook：读取深读产物并写入目标笔记或附件，按既有翻译对齐结果决定更新路径。 |
| [applyResult.mjs](../literature-explainer/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs | 文献解读工作流的结果回写 hook：从运行结果中解析解读笔记路径、读取 Markdown 全文并创建会话笔记产物。 |
| [applyResult.mjs](../literature-metadata-curator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs | 元数据策展工作流的结果回写 hook：把策展得到的题录字段写回条目，并清理策展过程产生的临时标记与产物。 |
| [applyResult.mjs](../literature-search-ingest/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs | 检索入库工作流的结果回写 hook：校验 Agent 返回的入库候选，只对处于合法状态迁移的条目执行创建。 |
| [applyResult.mjs](../literature-translator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs | 翻译工作流的结果回写 hook：读取译文与对齐产物文本，物化为文件并更新或创建 Zotero 附件。 |
| [applyResult.mjs](../tag-auditor/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs | 标签审计工作流的结果回写 hook：对目标条目的标签做合规性评估，把不合规项作为诊断回传给结果。 |
| [applyResult.mjs](../tag-bootstrapper/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs | 标签引导工作流的结果回写 hook：把 Agent 生成的标签建议归一化后写入条目标签，并读取 Synthesis 暂存词表辅助 facet 判定。 |
| [applyResult.mjs](../tag-regulator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs | 标签治理工作流的核心 hook（约 2000 行）：构建建议标签交互式对话框，接收人工决策后把建议并入受控词表或暂存区，提交受控词表并落盘标签变更。 |
| [buildRequest.mjs](../add-digest-representative-image/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/add-digest-representative-image/hooks/buildRequest.mjs | 为 add-digest-representative-image 工作流构造 pass-through 请求体，透传选区与 markdown_src 参数。 |
| [buildRequest.mjs](../export-notes/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/export-notes/hooks/buildRequest.mjs | export-notes 工作流的 buildRequest hook：透传选区与 exportCandidates，交给 pass-through 后端执行。 |
| [buildRequest.mjs](../literature-analysis/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs | 文献分析工作流的请求构建 hook：检查所选文献的附件与题录就绪度，必要时经元数据策展补全，再组装 Agent 请求。 |
| [buildRequest.mjs](../literature-deep-reading/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs | 深度阅读工作流的请求构建 hook：定位源附件、复用既有翻译对齐结果以减少重复翻译，再构建源 bundle 与请求参数。 |
| [buildRequest.mjs](../literature-metadata-curator/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs | 元数据策展工作流的请求构建 hook：解析任务名与元数据请求参数，组装供 Agent 补全题录的请求。 |
| [buildRequest.mjs](../literature-translator/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs | 翻译工作流的请求构建 hook：定位源附件、解析翻译参数并组装分段翻译请求。 |
| [buildRequest.mjs](../tag-bootstrapper/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs | 标签引导工作流的请求构建 hook：加载受控词表与笔记语言设置，组装用于生成标签建议的请求。 |
| [buildRequest.mjs](../tag-regulator/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs | 标签治理工作流的请求构建 hook：委托 lib/tagRegulatorRequest 组装独立请求，本文件只负责 runtime scope 包装与错误归一化。 |
| [digestPayload.mjs](digestPayload.mjs.md) | workflows_builtin/literature-workbench-package/lib/digestPayload.mjs | 从父条目的托管笔记中定位唯一的 digest 笔记并返回其 Markdown 载荷，检测到多份时按冲突失败。 |
| [embeddedPayloadAttachments.mjs](embeddedPayloadAttachments.mjs.md) | workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs | 笔记内嵌 payload 工件的二进制编解码层：把 payload 打成带 CRC 的 PNG 块塞进笔记附件，并在导入时按标记解析还原原始字节。 |
| [htmlCodec.mjs](htmlCodec.mjs.md) | workflows_builtin/literature-workbench-package/lib/htmlCodec.mjs | HTML 片段编解码工具：实体转义、base64 UTF-8 编解码与标签属性读写，供笔记 HTML 拼装与解析共用。 |
| [literatureBundle.mjs](literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [literatureDeepReadingBundle.mjs](literatureDeepReadingBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |
| [literatureDigestNotes.mjs](literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [literatureDigestSidecar.mjs](literatureDigestSidecar.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs | Synthesis sidecar 对接层：把 digest 内容、载荷哈希与笔记 key 组装成输入，委派 sidecar 应用并把失败归一为可重试的 typed 结果。 |
| [noteEmbeddedImages.mjs](noteEmbeddedImages.mjs.md) | workflows_builtin/literature-workbench-package/lib/noteEmbeddedImages.mjs | 笔记内嵌图片的标记读写：解析带标记属性的图片列表、渲染带标记的图片块，并在导入替换时清理本工作台自有的旧图片。 |
| [preflight.mjs](../literature-metadata-curator/hooks/preflight.mjs.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs | 元数据策展工作流的 preflight hook：解析条目标识符、在受控数据源中查找权威题录，并给出可执行状态供 UI 展示。 |
| [remote.mjs](remote.mjs.md) | workflows_builtin/literature-workbench-package/lib/remote.mjs | 标签词表的 GitHub 远端同步模块：读取已发布词表基线、比对并回写托管版本，同时提供变更订阅能力。 |
| [representativeImage.mjs](representativeImage.mjs.md) | workflows_builtin/literature-workbench-package/lib/representativeImage.mjs | 摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。 |
| [tagRegulatorRequest.mjs](tagRegulatorRequest.mjs.md) | workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs | 标签治理工作流的请求构建模块：从父条目抽取题录与标签、物化有效标签 YAML 与 digest Markdown 输入，产出可供 Agent 消费的请求参数。 |
| [translatorArtifacts.mjs](translatorArtifacts.mjs.md) | workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs | 翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendWorkflowRuntimeLog | 函数 | 374–385 | 把运行期日志追加到插件日志通道，附带工作流包与任务标识。 |
| decodeRuntimeBase64Utf8 | 函数 | 359–372 | encodeRuntimeBase64Utf8 的解码对应实现，处理宿主缺失原生 API 的情况。 |
| encodeRuntimeBase64Utf8 | 函数 | 344–357 | 跨运行时实现 UTF-8 到 base64 的编码，优先使用宿主原生能力并提供回退路径。 |
| measureWorkflowTestSpan | 函数 | 212–228 | 通过注入的性能探针测量工作流阶段耗时，未配置探针时零成本返回。 |
| portableItemRef | 函数 | 9–24 | 把 Zotero item 转换为跨工作流传递的可移植引用（key/kind），避免在请求中携带原生 ID。 |
| [readHostPages](../../../../symbols/workflows_builtin/literature-workbench-package/lib/runtime.mjs/readHostPages.md) | 函数 | 248–269 | 分页读取宿主条目列表，按类型与选择范围收敛结果并强制上限，避免全库无界读取。 |
| requireCommittedMutation | 函数 | 82–94 | 断言工作流已提交 mutation scope，未提交时拒绝执行写操作，守卫 canonical mutation 语义。 |
| [requireHostApi](../../../../symbols/workflows_builtin/literature-workbench-package/lib/runtime.mjs/requireHostApi.md) | 函数 | 230–246 | requireHostApi 的包装入口，附带包级 runtime scope 诊断与错误归一化。 |
| resolveAddonConfig | 函数 | 279–295 | 读取插件 addon 配置中的工作流包设置，缺省时回落到包内默认值。 |
| resolveHostApi | 函数 | 105–117 | 从执行参数中取出宿主 API 句柄，缺失时抛出明确的 host contract 错误。 |
| resolveRuntimeFetch | 函数 | 297–306 | 探测当前运行时可用的 fetch 实现，缺失时给出可操作的错误说明。 |
| resolveSelectionAttachmentRefs | 函数 | 51–63 | 枚举选中条目下可用的附件引用，供附件导入与翻译类工作流消费。 |
| resolveSelectionParentRef | 函数 | 34–49 | 从当前选择中解析父条目引用，处理单选、多选与仅选中文档附件等情形。 |
| showWorkflowToast | 函数 | 387–393 | 在 Zotero 主窗口弹出工作流结果提示，宿主能力缺失时降级为静默。 |
