## Context

Round3 已将 Chat steady publication 降为 107 个 transcript delta、106 个 message-count region和一个初始化snapshot，共约369 KB；Host prepare/signature/post总耗时不足40 ms，但target-active仍为232–254秒。代码审计证明每个新tool row都会让共享effect API返回`false`，两个child随后执行整窗render、全部可见row重挂载、全部row测量和可能的第二次RAF。receiver同时把tail page的新item不断`push`到同一数组，既不执行limit淘汰，也不推进startCursor，所以page mirror和virtual layout成本随累计消息增长。

现有v3 wire、producer mutation、owner/revision/ACK coordinator和Shell投递顺序已工作且负载很小。本次修复只收紧selected-page和child render语义；Chat/Skills store、JSONL、索引、持久化和用户display mode不变。

## Goals / Non-Goals

**Goals:**

- 让`itemId`成为唯一的transcript item身份，展示组合row使用显式`rowKey + itemIds`。
- 让tail page mirror始终受limit约束，并对delta batch做原子、局部应用。
- 让upsert/delete/mixed batch只重投影和修改受影响row，不触发整窗fallback或整窗测量。
- 让Chat/Skills通过同一个browser controller应用transcript publication，并直接消费typed message-count DTO。
- 让Replay记录真实display mode，并只用当前profile内posted identity判定R3完整性。

**Non-Goals:**

- 不改变publication v3 wire shape、coordinator single-flight/ACK/rebase状态机或Shell协议。
- 不改变Chat/Skills store、transcript文件格式、持久化、恢复、归档或外部API。
- 不治理R1 persistence、R2 socket reader或无关SkillRunner性能。

## Decisions

### 1. Item identity与row identity显式分离

publication/page/mutation始终只使用`itemId/itemKind/status`。renderer不再生成`id/kind/state`别名，也不再把`assistant-tool-*`当作item identity。展示投影生成`rowKey/itemIds/rowKind`；普通row使用`item:<itemId>`，连续tool group使用`tool-run:<firstItemId>`。共享索引为`itemsById`、`itemOrder`、`rowKeyByItemId`和`rowNodesByKey`。

选择该设计而不是继续维护raw id到canonical id映射，因为后者会保留两个可被误用的身份空间。tool grouping是展示语义，必须以row模型表达，而不是伪造domain item。

### 2. Selected page使用有界事务model

receiver先验证整个batch并建立只含touched item和order edit的小型事务，再一次提交。existing upsert保持位置；tail新upsert追加；append/patch只替换目标；delete精确移除。tail startCursor由`max(0,totalItemCount-limit)`计算，超出limit时淘汰头部。历史页只接收metadata。若delete或metadata变化要求从未加载范围补位，receiver请求rebase而不构造残缺page。

选择局部事务而不是`current.slice()`，因为整页复制既不是原子性的必要条件，也违反mutation-proportional契约。coordinator只负责给tail delta发布正确metadata，不改写投递状态机。

### 3. Structural delta没有full-render fallback

renderer从旧、新邻接关系计算dirty interval；tool变更把interval扩展到受影响的连续tool run。DOM只对dirty rows执行create/update/remove/insertBefore。未改变顺序的siblings不重新挂载；高度只测dirty rows；高度变化只更新geometry/spacer，不递归调用full renderer。

完整render仅允许initialization、activation、owner/page snapshot、rebase和用户主动切换plain/bubble。steady delta无法局部应用时DOM和revision保持不变并返回render-failed/rebase。选择显式失败而不是兜底，是为了让规格违例可见且不再以“正确但极慢”掩盖实现缺口。

### 4. 两个child使用同一publication view/controller

`assistant-transcript-publication.js`拥有receiver、page model、render model、delivery queue、ACK和page request。Chat/Skills只注入container、variant、labels、mode、Markdown/time formatter和action adapter。typed publications先按delivery order提交model，下一render frame逐publication完成所需区域DOM work并逐identity ACK；不同区域可以共享一个frame，但任何中间publication都不能被静默跳过。

message-count renderer直接接收`counts + labels`并原位更新三个category节点，不经过panel projection。Host仍发布两个独立typed publications，不新增batch kind。

### 5. Render work通过独立diagnostic observation记录

ACK envelope保持`publicationId/stage/outcome/reason`。共享controller在profiler启用时额外发送同identity的render observation，记录render path以及inserted/updated/removed/measured row计数。Host只用publicationId解析owner/kind；不在diagnostic payload重复owner或revision。

Performance profiler只为当前profile中已记录post的publication接受后续stage metric。Replay production port从真实preference读取display mode。logical cadence只用于counts、bytes、结构路径和identity完整性，不用于延迟结论。

## Risks / Trade-offs

- [tool group局部重投影可能遗漏邻接合并] → dirty interval同时包含变更item的旧、新相邻项，并用plain/bubble参数化DOM测试覆盖合并、拆分、删除和append。
- [tail淘汰破坏非尾部scroll anchor] → tail page只在stable tail pageKey上推进cursor；用户查看历史page时仅更新metadata。
- [异步render ACK延长single-flight一个frame] → model先按delivery order验证，DOM在下一frame完成；避免多次layout的收益远大于至多一frame延迟。
- [删除后无法补位] → 明确rebase，不把page cache提升为正确性SSOT。
- [legacy run dialog仍使用旧item shape] → 只在run-dialog调用边界保留显式adapter，Workspace路径的词汇guard禁止旧别名。

## Migration Plan

1. 先增加会在旧实现失败的共享receiver、DOM、count和profiler测试。
2. 原子迁移page model和row identity；同一提交中切换Chat/Skills child，不保留双路径。
3. 接入tail metadata、typed counts、render observation和profile-window修复。
4. 完成Node/Zotero、lint、build、strict OpenSpec和same-trace Replay验收。

## Open Questions

无。wire兼容、identity语义、full-render允许入口、rebase策略和验收口径均已确定。
