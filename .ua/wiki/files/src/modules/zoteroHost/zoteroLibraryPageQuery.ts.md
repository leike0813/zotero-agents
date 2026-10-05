
# src/modules/zoteroHost/zoteroLibraryPageQuery.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/zoteroLibraryPageQuery.ts -->

Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。

规模：1097 行
源码：[src/modules/zoteroHost/zoteroLibraryPageQuery.ts](../../../../../../src/modules/zoteroHost/zoteroLibraryPageQuery.ts)

## 符号（32）
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:boundedText -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:buildPredicate -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:canonicalCriteria -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:decodeCursor -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:decodeSourceCursor -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:defaultAdapter -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:hydrateSourceRows -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:hydrateZoteroItemsByIds -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:normalizeCriteria -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:normalizeLimit -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:normalizeSourceLimit -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:parseCursor -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:parseSourceCursor -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:queryZoteroAnnotationPage -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:queryZoteroChildItemPage -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:queryZoteroCollectionPage -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:queryZoteroLibraryPage -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:queryZoteroSavedSearchPage -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:resetZoteroLibraryPageQueryAdapterForTests -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:resetZoteroLibrarySourcePageQueryAdapterForTests -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:setZoteroLibraryPageQueryAdapterForTests -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:setZoteroLibrarySourcePageQueryAdapterForTests -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:sourceAdapter -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:sourceCanonicalCriteria -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:sourceCountAndPage -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:sourceCriteriaHash -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:sourceNextCursor -->
<!-- node: function:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:sourceRows -->
<!-- node: class:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:ZoteroLibraryCriteriaError -->
<!-- node: class:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:ZoteroLibraryCursorError -->
<!-- node: class:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:ZoteroLibraryPageLimitError -->
<!-- node: class:src/modules/zoteroHost/zoteroLibraryPageQuery.ts:ZoteroLibrarySourceQueryError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundedText | 函数 | 159–173 | 简单 | validation、bounds、text | 0 | 把自由文本截断到查询允许的长度上限。 |
| buildPredicate | 函数 | 337–402 | 中等 | pagination、predicate、query | 0 | 由 criteria 构造实际的条目匹配谓词。 |
| canonicalCriteria | 函数 | 247–258 | 简单 | pagination、canonical、criteria | 0 | 把 criteria 规整为可稳定摘要的规范形式。 |
| decodeCursor | 函数 | 277–292 | 简单 | pagination、cursor、decoding | 0 | 解码 base64 游标，失败时抛游标错误。 |
| decodeSourceCursor | 函数 | 648–665 | 简单 | pagination、cursor、decoding | 0 | 解码子项与批注查询游标。 |
| defaultAdapter | 函数 | 427–444 | 简单 | pagination、adapter、zotero-host | 0 | 默认分页 adapter：直接在 Zotero 库中过滤并切片。 |
| hydrateSourceRows | 函数 | 838–869 | 简单 | pagination、hydration、serialization | 0 | 把源查询行取回为可序列化 DTO。 |
| hydrateZoteroItemsByIds | 函数 | 194–214 | 简单 | zotero-host、hydration、batch | 0 | 按 key 集合一次性取回 Zotero.Item，避免逐条查询。 |
| normalizeCriteria | 函数 | 224–245 | 简单 | pagination、normalization、criteria | 0 | 把原始查询参数规范化为内部 criteria 结构。 |
| normalizeLimit | 函数 | 446–464 | 简单 | pagination、bounds、normalization | 0 | 把请求的条数规范化为 1 到上限之间的有界值。 |
| normalizeSourceLimit | 函数 | 590–602 | 简单 | pagination、bounds、normalization | 0 | 规范化子项与批注查询的页大小。 |
| parseCursor | 函数 | 294–328 | 简单 | pagination、cursor、validation | 0 | 解析并校验游标的 schema、版本与摘要。 |
| parseSourceCursor | 函数 | 667–733 | 中等 | pagination、cursor、validation | 0 | 解析并校验源查询游标的版本与摘要。 |
| queryZoteroAnnotationPage | 函数 | 921–997 | 中等 | pagination、query、annotation、exported | 0 | 查询某附件的批注分页。 |
| [queryZoteroChildItemPage](../../../../symbols/src/modules/zoteroHost/zoteroLibraryPageQuery.ts/queryZoteroChildItemPage.md) | 函数 | 871–919 | 简单 | pagination、query、children、exported | 2 | 查询某条目的子项（笔记、附件）分页。 |
| queryZoteroCollectionPage | 函数 | 999–1045 | 简单 | pagination、query、collection、exported | 0 | 查询某分类下的条目分页。 |
| queryZoteroLibraryPage | 函数 | 466–542 | 中等 | pagination、query、exported | 1 | 查询库条目的一页结果，返回行、总数与下一游标。 |
| queryZoteroSavedSearchPage | 函数 | 1047–1097 | 中等 | pagination、query、saved-search、exported | 0 | 查询某个已保存检索的结果分页。 |
| resetZoteroLibraryPageQueryAdapterForTests | 函数 | 140–142 | 简单 | pagination、test、seam、exported | 0 | 恢复默认分页 adapter。 |
| resetZoteroLibrarySourcePageQueryAdapterForTests | 函数 | 150–152 | 简单 | pagination、test、seam、exported | 0 | 恢复默认的子项与批注源查询 adapter。 |
| setZoteroLibraryPageQueryAdapterForTests | 函数 | 134–138 | 简单 | pagination、test、seam、exported | 0 | 注入测试用分页 adapter，替换默认的 Zotero 查询实现。 |
| setZoteroLibrarySourcePageQueryAdapterForTests | 函数 | 144–148 | 简单 | pagination、test、seam、exported | 0 | 注入测试用的子项/批注/分类源查询 adapter。 |
| sourceAdapter | 函数 | 570–588 | 简单 | pagination、adapter、zotero-host | 0 | 子项与批注的默认源查询 adapter。 |
| sourceCanonicalCriteria | 函数 | 618–628 | 简单 | pagination、canonical、criteria | 0 | 把源查询 criteria 规整为可摘要的规范形式。 |
| sourceCountAndPage | 函数 | 760–813 | 中等 | pagination、slicing、query | 0 | 统计源总数并切出当前页。 |
| sourceCriteriaHash | 函数 | 630–639 | 简单 | pagination、hash、criteria | 0 | 为源查询 criteria 计算稳定摘要，作为游标 basis。 |
| sourceNextCursor | 函数 | 815–829 | 简单 | pagination、cursor、factory | 0 | 为源查询结果签发下一页游标。 |
| sourceRows | 函数 | 735–744 | 简单 | pagination、query、adapter | 0 | 按 criteria 取出一页子项或批注行。 |
| ZoteroLibraryCriteriaError | 类 | 117–127 | 简单 | error、criteria、validation、exported | 0 | 库查询条件错误：criteria 结构非法时抛出。 |
| ZoteroLibraryCursorError | 类 | 93–103 | 简单 | error、cursor、pagination、exported | 0 | 库分页游标错误：游标格式非法、版本不符或 basis 已变化时抛出。 |
| ZoteroLibraryPageLimitError | 类 | 105–115 | 简单 | error、pagination、validation、exported | 0 | 库分页页大小错误：请求条数越界时抛出。 |
| ZoteroLibrarySourceQueryError | 类 | 546–557 | 简单 | error、query、source、exported | 0 | 子项/批注等源查询错误，携带具体失败原因。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [notePayloadCodec.ts](notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [runtimeBridge.ts](../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [sha256.ts](../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRegistry.ts](../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](../hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeServer.ts](../hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [libraryAdapter.ts](../synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [libraryArtifactReadiness.ts](libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroMcpProtocol.ts](../hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |
| [zoteroNotePayloadResolver.ts](zoteroNotePayloadResolver.ts.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| hydrateZoteroItemsByIds | 函数 | 194–214 | 按 key 集合一次性取回 Zotero.Item，避免逐条查询。 |
| queryZoteroAnnotationPage | 函数 | 921–997 | 查询某附件的批注分页。 |
| [queryZoteroChildItemPage](../../../../symbols/src/modules/zoteroHost/zoteroLibraryPageQuery.ts/queryZoteroChildItemPage.md) | 函数 | 871–919 | 查询某条目的子项（笔记、附件）分页。 |
| queryZoteroCollectionPage | 函数 | 999–1045 | 查询某分类下的条目分页。 |
| queryZoteroLibraryPage | 函数 | 466–542 | 查询库条目的一页结果，返回行、总数与下一游标。 |
| queryZoteroSavedSearchPage | 函数 | 1047–1097 | 查询某个已保存检索的结果分页。 |
| resetZoteroLibraryPageQueryAdapterForTests | 函数 | 140–142 | 恢复默认分页 adapter。 |
| resetZoteroLibrarySourcePageQueryAdapterForTests | 函数 | 150–152 | 恢复默认的子项与批注源查询 adapter。 |
| setZoteroLibraryPageQueryAdapterForTests | 函数 | 134–138 | 注入测试用分页 adapter，替换默认的 Zotero 查询实现。 |
| setZoteroLibrarySourcePageQueryAdapterForTests | 函数 | 144–148 | 注入测试用的子项/批注/分类源查询 adapter。 |
| ZoteroLibraryCriteriaError | 类 | 117–127 | 库查询条件错误：criteria 结构非法时抛出。 |
| ZoteroLibraryCursorError | 类 | 93–103 | 库分页游标错误：游标格式非法、版本不符或 basis 已变化时抛出。 |
| ZoteroLibraryPageLimitError | 类 | 105–115 | 库分页页大小错误：请求条数越界时抛出。 |
| ZoteroLibrarySourceQueryError | 类 | 546–557 | 子项/批注等源查询错误，携带具体失败原因。 |
