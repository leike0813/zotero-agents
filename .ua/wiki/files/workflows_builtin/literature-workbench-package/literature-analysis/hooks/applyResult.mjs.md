
# workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-analysis/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-analysis/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs -->

文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。
源码：[workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs)

## 符号（10）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:appendRepresentativeImageApplyLog -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:collectSourceAttachmentRefsFromRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:normalizeLiteratureMatchingMetadataPayload -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:readBundleTextWithPathFallback -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:readLiteratureMatchingMetadataArtifact -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:requireSequenceStepContext -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:resolveBundleEntryPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs:resolveWorkflowParameter -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendRepresentativeImageApplyLog | 函数 | 265–307 | 中等 | logging、image-handling、diagnostics | 0 | 把代表图处理过程（解析、写入、跳过原因）追加到结果应用日志中。 |
| applyResult | 函数 | 698–708 | 简单 | workflow-hook、entry-point、diagnostics | 0 | applyResult 公开入口，在包级 runtime scope 内执行结果回写并统一附加诊断。 |
| applyResultImpl | 函数 | 367–645 | 复杂 | workflow-hook、orchestration、digest-note、note-writing | 0 | 结果回写主流程：校验产物、过滤参考文献、写入 digest 与 references/翻译/评分等子笔记，并附带代表图。 |
| collectSourceAttachmentRefsFromRequest | 函数 | 340–361 | 简单 | provenance、extraction、attachment-lifecycle | 0 | 从原始请求中回收参与分析的源附件引用，供产物与笔记建立溯源关系。 |
| normalizeLiteratureMatchingMetadataPayload | 函数 | 195–232 | 中等 | normalization、metadata、matching | 0 | 归一化用于文献匹配的题录载荷，校验必需字段并剔除不完整条目。 |
| readBundleTextWithPathFallback | 函数 | 70–90 | 简单 | bundle、file-io、resilience | 0 | 读取 bundle 内文本文件，路径不存在时按文件名回退查找，避免 manifest 路径漂移导致失败。 |
| readLiteratureMatchingMetadataArtifact | 函数 | 234–263 | 中等 | metadata、validation、file-io | 0 | 读取并校验文献匹配元数据产物文件，失败时产出诊断而非中断回写。 |
| requireSequenceStepContext | 函数 | 659–676 | 简单 | validation、state-machine、guard | 0 | 在序列模式下断言当前步骤的上下文完整，缺上下文时给出定位明确的错误。 |
| resolveBundleEntryPath | 函数 | 43–68 | 简单 | bundle、path-handling、resolution | 0 | 在 bundle manifest 中解析产物条目的实际路径，兼容大小写与分隔符差异。 |
| resolveWorkflowParameter | 函数 | 102–126 | 简单 | configuration、resolution、utility | 0 | 按优先级从工作流参数、运行参数与默认值中解析单个配置项。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [importSchemas.mjs](../../lib/importSchemas.mjs.md) | workflows_builtin/literature-workbench-package/lib/importSchemas.mjs | 导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。 |
| [literatureDigestNotes.mjs](../../lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [literatureDigestSidecar.mjs](../../lib/literatureDigestSidecar.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs | Synthesis sidecar 对接层：把 digest 内容、载荷哈希与笔记 key 组装成输入，委派 sidecar 应用并把失败归一为可重试的 typed 结果。 |
| [referenceQualityGate.mjs](../../lib/referenceQualityGate.mjs.md) | workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs | 参考文献抽取质量闸门：判定解析出的参考文献是否具备可用的题录信息，并在写入 digest 笔记前过滤低质量条目。 |
| [representativeImage.mjs](../../lib/representativeImage.mjs.md) | workflows_builtin/literature-workbench-package/lib/representativeImage.mjs | 摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。 |
| [resultOutput.mjs](../../lib/resultOutput.mjs.md) | workflows_builtin/literature-workbench-package/lib/resultOutput.mjs | Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [statusTransition.mjs](../../lib/statusTransition.mjs.md) | workflows_builtin/literature-workbench-package/lib/statusTransition.mjs | 工作流状态迁移诊断模块：检查结果状态迁移是否合法，并把违规详情收集为可并入结果的诊断项。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 698–708 | applyResult 公开入口，在包级 runtime scope 内执行结果回写并统一附加诊断。 |
