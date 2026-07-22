# 常驻索引

Profile 拥有的 SQLite 索引加速重复发现、排序、分诊和 catalog 查找。它是缓存，不是 Zotero 权威来源。

## 读取策略

使用索引的 `search`、`item` 和 `stats` 进行重复本地发现。在报告或执行操作之前，通过 Host Bridge 确认当前选择、条目/附件内容、workflow 模式、运行/permission 状态、Product 和每个 writeback 事实。

记录索引刷新时间戳和查询。如果答案取决于比该刷新更新的更改，立即使用实时的 `library` 或 `context` 读取。

## 刷新合约

`zotero_librarian_index_service.py refresh` 通过 `library snapshot` 分页直到 `hasMore` 为 false。它独立构建替换行并原子提交新快照。页面、解析或事务失败会保留先前可用的索引不变。

不要删除或部分重写旧索引来从失败的刷新中恢复。报告失败的 cursor 和 Host Bridge 错误，保留旧的新鲜度元数据，并仅在连接/输入修正后重试。

## 证据

对于基于索引的发现，报告查询、刷新时间、匹配的 item key 以及哪些事实经过了实时确认。永远不要将缓存匹配描述为当前 Zotero 选择或当前写入状态。
