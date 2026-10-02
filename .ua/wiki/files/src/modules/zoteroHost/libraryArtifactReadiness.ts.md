
# src/modules/zoteroHost/libraryArtifactReadiness.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/libraryArtifactReadiness.ts -->

库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。

规模：848 行
源码：[src/modules/zoteroHost/libraryArtifactReadiness.ts](../../../../../../src/modules/zoteroHost/libraryArtifactReadiness.ts)

## 符号（24）
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:detachArtifactAttachment -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:detachArtifactNote -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:emptyLibraryArtifactReadiness -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:evaluateGeneratedNoteArtifact -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:evaluateGeneratedNoteFactsReadiness -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:evaluateGeneratedNoteReadiness -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:forEachArtifactChildPage -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:isPdfAttachment -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:isTopLevelRegularArtifactItem -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:matchesPayloadRequirement -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:parseLibraryArtifactState -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:requireArtifactNextCursor -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveArtifactChildren -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveAttachmentFilename -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveAttachmentFilenameSync -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveBestPdfAttachment -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveBestPdfAttachmentFacts -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveGeneratedNoteArtifacts -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveJsonPointer -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveLibraryArtifactReadiness -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:resolveMarkdownAttachmentStems -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:serializeLibraryArtifactState -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:summarizeLibraryGeneratedArtifacts -->
<!-- node: function:src/modules/zoteroHost/libraryArtifactReadiness.ts:withCitationHealth -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| detachArtifactAttachment | 函数 | 240–261 | 简单 | resource-management、artifact、cleanup | 0 | 解绑产物扫描中的附件行。 |
| detachArtifactNote | 函数 | 188–238 | 中等 | resource-management、artifact、cleanup | 0 | 把产物扫描中的笔记行与后续遍历解绑，避免长期持有条目引用。 |
| emptyLibraryArtifactReadiness | 函数 | 641–667 | 简单 | readiness、factory、artifact | 0 | 构造空的库级就绪度结果。 |
| evaluateGeneratedNoteArtifact | 函数 | 533–583 | 中等 | readiness、artifact、traversal | 0 | 遍历并评估一个产物定义对应的全部受管笔记。 |
| evaluateGeneratedNoteFactsReadiness | 函数 | 479–531 | 中等 | readiness、managed-note、fact | 0 | 以事实形式评估受管笔记产物就绪度。 |
| evaluateGeneratedNoteReadiness | 函数 | 470–477 | 简单 | readiness、managed-note、artifact | 0 | 按受管笔记定义评估某类产物的就绪度。 |
| forEachArtifactChildPage | 函数 | 158–186 | 简单 | pagination、traversal、artifact | 0 | 按页遍历条目的子项与附件，供就绪度逐页评估。 |
| isPdfAttachment | 函数 | 751–764 | 简单 | attachment、classification、pdf | 0 | 判断附件是否为 PDF 类型。 |
| isTopLevelRegularArtifactItem | 函数 | 457–468 | 简单 | artifact、classification、filter | 0 | 判断条目是否为顶层常规文献项，排除附件与笔记。 |
| matchesPayloadRequirement | 函数 | 585–622 | 简单 | readiness、payload、validation | 0 | 判断笔记负载是否满足产物定义的 payload 要求。 |
| parseLibraryArtifactState | 函数 | 377–384 | 简单 | parsing、readiness、state、exported | 0 | 解析持久化的就绪度状态，格式非法时退回空状态。 |
| requireArtifactNextCursor | 函数 | 146–156 | 简单 | pagination、cursor、validation | 0 | 校验产物扫描的下一游标存在且可用。 |
| resolveArtifactChildren | 函数 | 263–304 | 简单 | artifact、traversal、collection | 0 | 收集条目的子项与附件列表并登记其来源条目。 |
| resolveAttachmentFilename | 函数 | 793–811 | 简单 | attachment、resolution、fallback | 0 | 读取附件文件名，必要时回退到链接标题。 |
| resolveAttachmentFilenameSync | 函数 | 813–824 | 简单 | attachment、sync、snapshot | 0 | 以同步方式读取附件文件名，供只读快照路径使用。 |
| resolveBestPdfAttachment | 函数 | 386–431 | 简单 | attachment、selection、pdf、exported | 0 | 为条目选出最佳 PDF 附件，优先主附件与文件名匹配。 |
| resolveBestPdfAttachmentFacts | 函数 | 433–455 | 简单 | attachment、selection、fact | 0 | 以事实形式返回最佳 PDF 附件判定结果。 |
| resolveGeneratedNoteArtifacts | 函数 | 669–706 | 简单 | readiness、artifact、managed-note | 0 | 解析某条目已具备的受管笔记产物集合。 |
| resolveJsonPointer | 函数 | 624–639 | 简单 | json、pointer、utility | 0 | 按 JSON pointer 路径从负载中取值。 |
| resolveLibraryArtifactReadiness | 函数 | 306–367 | 中等 | readiness、artifact、traversal、exported | 1 | 分页扫描整库，计算每篇文献的产物就绪度与缺失项。 |
| resolveMarkdownAttachmentStems | 函数 | 766–780 | 简单 | attachment、collection、markdown | 0 | 汇总条目的 Markdown 附件文件名主干（去扩展名）。 |
| serializeLibraryArtifactState | 函数 | 369–375 | 简单 | serialization、readiness、state | 0 | 把就绪度状态序列化为可持久化的字符串。 |
| summarizeLibraryGeneratedArtifacts | 函数 | 725–733 | 简单 | readiness、aggregation、artifact、exported | 0 | 汇总整库层面的产物覆盖统计。 |
| withCitationHealth | 函数 | 708–723 | 简单 | readiness、citation-graph、enrichment | 0 | 把引用健康度附加到就绪度结果上。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureScore.ts](../../shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [runtimeCompatibility.ts](../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroLibraryPageQuery.ts](zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |
| [zoteroManagedNotes.ts](zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [helpers.ts](../../workflows/helpers.ts.md) | src/workflows/helpers.ts | 工作流 hook 辅助层：为用户编写的 hook 提供条目解析、路径处理与产物就绪判定等安全封装。 |
| [libraryAdapter.ts](../synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [libraryArtifactsColumn.ts](../libraryArtifactsColumn.ts.md) | src/modules/libraryArtifactsColumn.ts | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [workflowInputPlanning.ts](../../workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| evaluateGeneratedNoteFactsReadiness | 函数 | 479–531 | 以事实形式评估受管笔记产物就绪度。 |
| evaluateGeneratedNoteReadiness | 函数 | 470–477 | 按受管笔记定义评估某类产物的就绪度。 |
| isTopLevelRegularArtifactItem | 函数 | 457–468 | 判断条目是否为顶层常规文献项，排除附件与笔记。 |
| parseLibraryArtifactState | 函数 | 377–384 | 解析持久化的就绪度状态，格式非法时退回空状态。 |
| resolveBestPdfAttachment | 函数 | 386–431 | 为条目选出最佳 PDF 附件，优先主附件与文件名匹配。 |
| resolveLibraryArtifactReadiness | 函数 | 306–367 | 分页扫描整库，计算每篇文献的产物就绪度与缺失项。 |
| serializeLibraryArtifactState | 函数 | 369–375 | 把就绪度状态序列化为可持久化的字符串。 |
| summarizeLibraryGeneratedArtifacts | 函数 | 725–733 | 汇总整库层面的产物覆盖统计。 |
