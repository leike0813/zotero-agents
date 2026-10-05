
# src/modules/zoteroHost/notePayloadCodec.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/notePayloadCodec.ts -->

受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。

规模：940 行
源码：[src/modules/zoteroHost/notePayloadCodec.ts](../../../../../../src/modules/zoteroHost/notePayloadCodec.ts)

## 符号（31）
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:assertNoteHtmlSourceWithinLimit -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:buildMarkdownBackedNoteContent -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:buildPngChunk -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:buildStructuredNoteContent -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:buildWorkbenchPayloadEnvelope -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:buildWorkbenchPayloadPngBytes -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:canonicalLogicalNotePayloadHash -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:closeLists -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:concatByteArrays -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:decodeBase64Utf8 -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:encodeBase64Utf8 -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:escapeAttribute -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:escapeHtml -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:findPngChunk -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:getCrcTable -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:getNotePayloadDetail -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:indexOfBytes -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:isPng -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:listNotePayloadBlocks -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:parseEmbeddedNotePayloadBlock -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:parseNoteKind -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:parseV1TailPayloadEnvelope -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:parseV2PayloadEnvelope -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:projectDecodedPayload -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:readTagAttribute -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:renderInlineMarkdown -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:renderMarkdownToHtml -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:renderPayloadBlock -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:selectNotePayloadBlock -->
<!-- node: function:src/modules/zoteroHost/notePayloadCodec.ts:toUint8Array -->
<!-- node: class:src/modules/zoteroHost/notePayloadCodec.ts:ZoteroNotePayloadResourceLimitError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertNoteHtmlSourceWithinLimit | 函数 | 73–75 | 简单 | note-payload、validation、resource-limit、exported | 0 | 校验笔记 HTML 源大小未超过硬上限，超限抛出资源限制错误。 |
| buildMarkdownBackedNoteContent | 函数 | 897–940 | 简单 | note-payload、composition、markdown、exported | 0 | 构建以 Markdown 渲染为主体、负载块为辅的笔记内容。 |
| buildPngChunk | 函数 | 228–237 | 简单 | codec、png、chunk | 0 | 构造一个带 CRC 的 PNG 分块。 |
| buildStructuredNoteContent | 函数 | 873–895 | 简单 | note-payload、composition、html、exported | 1 | 构建结构化受管笔记的完整 HTML 内容。 |
| buildWorkbenchPayloadEnvelope | 函数 | 296–320 | 简单 | codec、envelope、exported | 1 | 把逻辑 payload 封装为 v2 信封，附带 schema 版本与逻辑哈希。 |
| buildWorkbenchPayloadPngBytes | 函数 | 322–355 | 简单 | codec、png、embedding、exported | 0 | 把逻辑 payload 编码进合成 PNG 的分块中，规避笔记长度限制。 |
| canonicalLogicalNotePayloadHash | 函数 | 284–294 | 简单 | codec、hash、canonical、exported | 0 | 对逻辑 payload 做规范化 JSON 哈希，排除资源型字段影响。 |
| closeLists | 函数 | 455–464 | 简单 | markdown、rendering、html | 0 | 在块级渲染结束时闭合未完成的列表标签。 |
| concatByteArrays | 函数 | 151–160 | 简单 | codec、bytes、utility | 0 | 按顺序拼接多个字节数组。 |
| decodeBase64Utf8 | 函数 | 99–136 | 简单 | codec、base64、decoding、exported | 0 | 把 base64 字符串解码为 UTF-8 文本。 |
| encodeBase64Utf8 | 函数 | 86–97 | 简单 | codec、base64、encoding、exported | 0 | 把 UTF-8 文本编码为 base64 字符串。 |
| escapeAttribute | 函数 | 420–422 | 简单 | codec、escaping、attribute | 0 | 对属性值做转义，防止引号提前闭合。 |
| escapeHtml | 函数 | 413–418 | 简单 | codec、escaping、html | 0 | 对文本做 HTML 实体转义。 |
| findPngChunk | 函数 | 251–274 | 简单 | codec、png、search | 0 | 在 PNG 字节流中定位指定类型的分块。 |
| getCrcTable | 函数 | 203–217 | 简单 | codec、crc、cache | 0 | 惰性构建并缓存 PNG 分块用的 CRC32 查表。 |
| getNotePayloadDetail | 函数 | 814–858 | 简单 | note-payload、dto、exported | 0 | 产出单个负载块的完整详情 DTO。 |
| indexOfBytes | 函数 | 394–411 | 简单 | codec、bytes、search | 0 | 在字节序列中查找子序列首次出现的位置。 |
| isPng | 函数 | 239–249 | 简单 | codec、png、detection | 0 | 按魔数判断字节序列是否为 PNG。 |
| [listNotePayloadBlocks](../../../../symbols/src/modules/zoteroHost/notePayloadCodec.ts/listNotePayloadBlocks.md) | 函数 | 615–666 | 中等 | note-payload、enumeration、exported | 2 | 枚举笔记 HTML 中全部负载块及其锚点与校验状态。 |
| parseEmbeddedNotePayloadBlock | 函数 | 668–791 | 中等 | note-payload、parsing、png、exported | 0 | 解析单个内嵌负载块，必要时从 PNG 分块取回原始字节。 |
| parseNoteKind | 函数 | 542–566 | 简单 | note-payload、parsing、managed-note | 0 | 从笔记标题与标记中解析受管笔记的 kind。 |
| parseV1TailPayloadEnvelope | 函数 | 368–392 | 简单 | codec、compatibility、parsing | 0 | 解析旧版尾部锚点负载信封，作为向后兼容读取路径。 |
| parseV2PayloadEnvelope | 函数 | 357–366 | 简单 | codec、envelope、parsing | 0 | 解析 v2 负载信封并校验其 schema 与逻辑哈希。 |
| projectDecodedPayload | 函数 | 586–613 | 简单 | note-payload、projection、dto | 0 | 把解码后的负载投影为对外 DTO，隐藏内部编码细节。 |
| readTagAttribute | 函数 | 434–440 | 简单 | codec、parsing、html | 0 | 从标签文本中安全读取指定属性值。 |
| renderInlineMarkdown | 函数 | 442–453 | 简单 | markdown、rendering、inline | 0 | 渲染行内 Markdown 标记（强调、代码、链接）。 |
| renderMarkdownToHtml | 函数 | 466–540 | 中等 | markdown、rendering、sanitization、exported | 1 | 把 Markdown 文本渲染为受限 HTML，剥离脚本等危险构造。 |
| renderPayloadBlock | 函数 | 860–871 | 简单 | note-payload、rendering、html、exported | 0 | 把逻辑 payload 渲染为可写入笔记 HTML 的负载块标记。 |
| selectNotePayloadBlock | 函数 | 803–812 | 简单 | note-payload、selection、exported | 0 | 按类型与时间等规则从多个负载块中选出当前权威块。 |
| toUint8Array | 函数 | 138–149 | 简单 | codec、bytes、normalization | 0 | 把多种字节表示统一规整为 Uint8Array。 |
| ZoteroNotePayloadResourceLimitError | 类 | 51–61 | 简单 | error、resource-limit、note-payload、exported | 0 | 笔记负载超限错误：携带具体限额与实际大小，便于按错误码映射为 resource_limited。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgePagination.ts](../hostBridge/server/hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [itemObserver.ts](../synthesis/itemObserver.ts.md) | src/modules/synthesis/itemObserver.ts | 监听 Zotero 条目与子笔记变更，识别文献评分等 managed note 变更并发出 Synthesis 读模型失效通知。 |
| [workflowHostOwners.ts](../../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroLibraryPageQuery.ts](zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |
| [zoteroManagedNotes.ts](zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |
| [zoteroNotePayloadResolver.ts](zoteroNotePayloadResolver.ts.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |
| [zoteroReadonlyLibraryAdapter.ts](../harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertNoteHtmlSourceWithinLimit | 函数 | 73–75 | 校验笔记 HTML 源大小未超过硬上限，超限抛出资源限制错误。 |
| buildMarkdownBackedNoteContent | 函数 | 897–940 | 构建以 Markdown 渲染为主体、负载块为辅的笔记内容。 |
| buildStructuredNoteContent | 函数 | 873–895 | 构建结构化受管笔记的完整 HTML 内容。 |
| buildWorkbenchPayloadEnvelope | 函数 | 296–320 | 把逻辑 payload 封装为 v2 信封，附带 schema 版本与逻辑哈希。 |
| buildWorkbenchPayloadPngBytes | 函数 | 322–355 | 把逻辑 payload 编码进合成 PNG 的分块中，规避笔记长度限制。 |
| canonicalLogicalNotePayloadHash | 函数 | 284–294 | 对逻辑 payload 做规范化 JSON 哈希，排除资源型字段影响。 |
| decodeBase64Utf8 | 函数 | 99–136 | 把 base64 字符串解码为 UTF-8 文本。 |
| encodeBase64Utf8 | 函数 | 86–97 | 把 UTF-8 文本编码为 base64 字符串。 |
| escapeAttribute | 函数 | 420–422 | 对属性值做转义，防止引号提前闭合。 |
| escapeHtml | 函数 | 413–418 | 对文本做 HTML 实体转义。 |
| getNotePayloadDetail | 函数 | 814–858 | 产出单个负载块的完整详情 DTO。 |
| [listNotePayloadBlocks](../../../../symbols/src/modules/zoteroHost/notePayloadCodec.ts/listNotePayloadBlocks.md) | 函数 | 615–666 | 枚举笔记 HTML 中全部负载块及其锚点与校验状态。 |
| parseEmbeddedNotePayloadBlock | 函数 | 668–791 | 解析单个内嵌负载块，必要时从 PNG 分块取回原始字节。 |
| parseNoteKind | 函数 | 542–566 | 从笔记标题与标记中解析受管笔记的 kind。 |
| readTagAttribute | 函数 | 434–440 | 从标签文本中安全读取指定属性值。 |
| renderMarkdownToHtml | 函数 | 466–540 | 把 Markdown 文本渲染为受限 HTML，剥离脚本等危险构造。 |
| renderPayloadBlock | 函数 | 860–871 | 把逻辑 payload 渲染为可写入笔记 HTML 的负载块标记。 |
| selectNotePayloadBlock | 函数 | 803–812 | 按类型与时间等规则从多个负载块中选出当前权威块。 |
| ZoteroNotePayloadResourceLimitError | 类 | 51–61 | 笔记负载超限错误：携带具体限额与实际大小，便于按错误码映射为 resource_limited。 |
