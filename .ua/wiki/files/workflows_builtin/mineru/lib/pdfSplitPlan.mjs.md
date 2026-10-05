
# workflows_builtin/mineru/lib/pdfSplitPlan.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/mineru/lib](../../../../modules/workflows_builtin/mineru/lib.md)
<!-- node: file:workflows_builtin/mineru/lib/pdfSplitPlan.mjs -->

MinerU 工作流的 PDF 拆分计划库，读取 Zotero 附件的页数与 outline（优先 pdf.js、其次元数据 helper、最后回退到 PDF 文本启发式），并按 outline 章节边界切分页码区间，输出可供各 hook 消费的 split plan 与聚合 id。
源码：[workflows_builtin/mineru/lib/pdfSplitPlan.mjs](../../../../../../workflows_builtin/mineru/lib/pdfSplitPlan.mjs)

## 符号（18）
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:buildAggregateId -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:buildPageRangePlan -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:chooseOutlineBoundary -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:decodePdfBytes -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:estimatePageCountFromPdfText -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:flattenPdfJsOutline -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:getPdfJsFromModule -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:isLikelySectionBoundary -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:loadPdfJs -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:normalizeOutlineEntries -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:portableItemRef -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:readHostPages -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:readMetadataFromFallback -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:readMetadataFromPdfJs -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:readPdfSplitMetadata -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:resolveAttachmentPath -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:resolveOutlinePage -->
<!-- node: function:workflows_builtin/mineru/lib/pdfSplitPlan.mjs:resolveSourceAttachment -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAggregateId | 函数 | 399–404 | 简单 | identifier、normalization、aggregation | 1 | 为拆分后的分片生成稳定聚合 id（mineru-<itemKey> 或文件名），并清洗掉不安全字符。 |
| buildPageRangePlan | 函数 | 341–397 | 中等 | split-planning、pdf、page-ranges、core-logic | 1 | 工作流拆分核心：页数不超过 200 时产出单个整篇分片，否则计算分片数并优先在 outline 章节边界处切分，否则按均衡页数切分，末片记为 tail。 |
| chooseOutlineBoundary | 函数 | 316–339 | 中等 | split-planning、outline、selection | 1 | 在允许的页码窗口内筛选候选章节边界，按与理想起点距离排序取最近的一个，找不到返回 0 交由均衡切分兜底。 |
| decodePdfBytes | 函数 | 85–98 | 简单 | pdf、decoding、fallback | 1 | 将 PDF 字节解码为 latin1 文本，优先用 TextDecoder，缺失时回退到逐字节 charCode 拼接。 |
| estimatePageCountFromPdfText | 函数 | 242–256 | 简单 | heuristic、pdf、fallback | 1 | 在无 pdf.js 时从 PDF 原始文本估算页数：优先统计 /Type /Page 对象计数，其次取 /Count 的最大值。 |
| flattenPdfJsOutline | 函数 | 185–201 | 中等 | outline、recursion、traversal | 1 | 递归展开 pdf.js 目录树为扁平条目列表，逐层记录 level 并丢弃解析不出页码的节点。 |
| getPdfJsFromModule | 函数 | 126–140 | 简单 | pdfjs、module-resolution、adapter | 1 | 从 ES module 命名空间中探测 pdf.js 实例，依次尝试 moduleValue、pdfjsLib 与 default 三种形态。 |
| isLikelySectionBoundary | 函数 | 304–314 | 简单 | heuristic、outline、section-detection | 1 | 判断 outline 条目是否适合作为切分点：level ≤ 2 直接可用，否则用中英文关键词正则匹配标题。 |
| loadPdfJs | 函数 | 142–164 | 中等 | pdfjs、zotero-runtime、feature-detection | 1 | 借助 Zotero 运行时 ChromeUtils.importESModule 依次尝试三个 pdf.js 资源位置，加载失败静默降级返回 null。 |
| normalizeOutlineEntries | 函数 | 108–119 | 简单 | normalization、outline、pdf | 0 | 归一化 PDF outline 条目：清洗 title、page 与 level，并丢弃页码无效的条目。 |
| portableItemRef | 函数 | 7–22 | 简单 | validation、zotero-ref、normalization | 1 | 校验并归一化 Zotero item ref，只接受恰好含 libraryId 与 key 的 portable 引用，多余字段或非法 libraryId 直接抛错。 |
| readHostPages | 函数 | 36–57 | 中等 | pagination、host-api、reader | 0 | 通用分页读取循环：反复调用 readPage 并用 getItems 收集条目，hasMore 为真时要求游标推进，否则报错以防死循环。 |
| readMetadataFromFallback | 函数 | 258–270 | 简单 | fallback、pdf、metadata | 1 | 最后一级元数据降级路径：解码 PDF 文本后估算页数，无结果时返回 null，让上层继续降级。 |
| readMetadataFromPdfJs | 函数 | 203–240 | 中等 | pdfjs、metadata、resource-cleanup | 1 | 用 pdf.js 打开 PDF 字节并读取页数与目录，禁用 worker 与 eval 以适应 Zotero 沙箱；finally 中确保销毁 doc 与 loadingTask。 |
| readPdfSplitMetadata | 函数 | 272–302 | 中等 | metadata、fallback-chain、diagnostics、pdf | 1 | 按 runtime helper → pdf.js → PDF 对象计数三级顺序读取页数与目录，任一 reader 抛错即记录 diagnostics 并尝试下一级，全失败时返回 source=unavailable。 |
| [resolveAttachmentPath](../../../../symbols/workflows_builtin/mineru/lib/pdfSplitPlan.mjs/resolveAttachmentPath.md) | 函数 | 24–34 | 简单 | attachment、host-api、path-resolution | 3 | 通过 Workflow Host 的 library.getItemDetail 解析附件 ref 为本地文件路径，附件缺失或文件不可用时抛出可读错误。 |
| resolveOutlinePage | 函数 | 166–183 | 中等 | outline、pdfjs、error-handling | 1 | 把 outline 目的解析为 1-based 页码，dest 为字符串时先查命名目标，再经 doc.getPageIndex 换算；异常一律返回 0。 |
| [resolveSourceAttachment](../../../../symbols/workflows_builtin/mineru/lib/pdfSplitPlan.mjs/resolveSourceAttachment.md) | 函数 | 63–74 | 简单 | selection、attachment、normalization | 2 | 从 selectionContext 中筛出首个 attachment 条目，归一为 {ref, parentRef, fileName} 的源附件描述；没有可用附件时返回 null。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs | MinerU 工作流的 execute 后置 hook，负责把解析结果落盘为 Markdown 与图片附件：内置一整套跨运行时文件系统工具（读写、复制、移动、列举），将 MinerU 输出的分片 Markdown 合并、其中的图片引用重写到暂存目录，再物化为 Zotero 附件或本地文件。 |
| [buildRequest.mjs](../hooks/buildRequest.mjs.md) | workflows_builtin/mineru/hooks/buildRequest.mjs | MinerU 工作流的 request 构建 hook，依据 split plan 中的分片条目生成后端请求的 steps 列表，把每个 PDF 分片的路径、页码范围等参数组装成 MinerU 服务可消费的调用步骤。 |
| [preflight.mjs](../hooks/preflight.mjs.md) | workflows_builtin/mineru/hooks/preflight.mjs | MinerU 工作流的 preflight hook，在请求发出前校验源附件是否可读、页数等元数据是否齐备，并通过 readPdfSplitMetadata 计算 PDF 拆分方案，缺条件时以结构化错误中止。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAggregateId | 函数 | 399–404 | 为拆分后的分片生成稳定聚合 id（mineru-<itemKey> 或文件名），并清洗掉不安全字符。 |
| buildPageRangePlan | 函数 | 341–397 | 工作流拆分核心：页数不超过 200 时产出单个整篇分片，否则计算分片数并优先在 outline 章节边界处切分，否则按均衡页数切分，末片记为 tail。 |
| portableItemRef | 函数 | 7–22 | 校验并归一化 Zotero item ref，只接受恰好含 libraryId 与 key 的 portable 引用，多余字段或非法 libraryId 直接抛错。 |
| readHostPages | 函数 | 36–57 | 通用分页读取循环：反复调用 readPage 并用 getItems 收集条目，hasMore 为真时要求游标推进，否则报错以防死循环。 |
| readPdfSplitMetadata | 函数 | 272–302 | 按 runtime helper → pdf.js → PDF 对象计数三级顺序读取页数与目录，任一 reader 抛错即记录 diagnostics 并尝试下一级，全失败时返回 source=unavailable。 |
| [resolveAttachmentPath](../../../../symbols/workflows_builtin/mineru/lib/pdfSplitPlan.mjs/resolveAttachmentPath.md) | 函数 | 24–34 | 通过 Workflow Host 的 library.getItemDetail 解析附件 ref 为本地文件路径，附件缺失或文件不可用时抛出可读错误。 |
| [resolveSourceAttachment](../../../../symbols/workflows_builtin/mineru/lib/pdfSplitPlan.mjs/resolveSourceAttachment.md) | 函数 | 63–74 | 从 selectionContext 中筛出首个 attachment 条目，归一为 {ref, parentRef, fileName} 的源附件描述；没有可用附件时返回 null。 |
