
# rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-protocol/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-protocol/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs -->

Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。
源码：[rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs)

## 符号（14）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:advance_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:count_json_nodes_raw -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:deterministic_operation_spec -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:fast_page_json -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:LibraryNodeMetrics -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:MetricsResult -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:page_descriptor -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:PagedInputAssembler -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:PagedInputValidator -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:rebuild_metrics_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:split_paged_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:unix_millis_from_utc_iso8601 -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:utc_iso8601_from_unix_millis -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs:write_canonical -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| advance_page | 函数 | 1015–1056 | 中等 | pagination、state-machine、validation | 0 | 推进分页游标到下一页，校验边界与 basis 一致性后在页尾或结束时收敛。 |
| count_json_nodes_raw | 函数 | 735–775 | 中等 | json、performance、fast-path | 0 | 在未解析的原始 JSON 文本上统计节点数量，供分页快路径避免完整反序列化开销。 |
| deterministic_operation_spec | 函数 | 508–586 | 复杂 | determinism、replay、contract、worker | 0 | 为确定性 replay 构造操作规格：固定节点数、帧序列与字节预算，使 worker 在相同输入下产生逐字节一致输出。 |
| fast_page_json | 函数 | 777–807 | 中等 | json、performance、fast-path、pagination | 0 | 分页响应的快路径构造：直接切片拼接 JSON 片段，跳过完整 Value 重建以降低首屏延迟。 |
| LibraryNodeMetrics | 类 | 1286–1324 | 中等 | data-model、metrics、contract | 0 | 文献节点的指标 DTO，承载入出度、PageRank、连通分量与 foundation/frontier 评分等字段。 |
| MetricsResult | 类 | 1339–1346 | 简单 | data-model、metrics、contract | 0 | 指标计算结果 DTO，聚合节点指标集合、诊断与 metrics 身份标识。 |
| page_descriptor | 函数 | 809–847 | 中等 | pagination、descriptor、contract | 0 | 为分页请求生成确定性描述符：绑定请求哈希、游标与页大小，作为缓存键与 basis 校验依据。 |
| PagedInputAssembler | 类 | 1074–1155 | 中等 | assembler、pagination、state-machine | 0 | 分页输入装配器：按页累积内容并跟踪已读范围，finish 时输出可写入的完整输入。 |
| PagedInputValidator | 类 | 913–924 | 中等 | validation、pagination、integrity-check | 0 | 分页输入校验器：逐页检查分页描述符连续性、页大小与末页一致性，basis 变化即拒绝整次读取。 |
| rebuild_metrics_request | 函数 | 1356–1410 | 中等 | metrics、rebuild、cache | 0 | 依据 metrics basis 重建指标计算请求，确保重复计算只在 basis 变化时发生。 |
| split_paged_result | 函数 | 1164–1219 | 复杂 | pagination、split、performance | 0 | 把完整的分页结果集切分为首屏页与其余页，保证 cold load 的 page-first 语义不被 full mirror 阻塞。 |
| unix_millis_from_utc_iso8601 | 函数 | 74–127 | 中等 | time、parsing、contract | 0 | 把 UTC ISO8601 字符串解析回毫秒时间戳，是上一函数的逆运算并对非法格式报错。 |
| utc_iso8601_from_unix_millis | 函数 | 30–58 | 中等 | time、serialization、contract | 0 | 把毫秒 Unix 时间戳转为 UTC ISO8601 字符串，跨进程时间字段的统一编码入口。 |
| write_canonical | 函数 | 1412–1452 | 中等 | canonicalization、identity、topic-graph | 0 | 写出规范化 topic path 标识，保证同一主题在不同来源下折叠为同一 canonical key。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| advance_page | 函数 | 1015–1056 | 推进分页游标到下一页，校验边界与 basis 一致性后在页尾或结束时收敛。 |
| count_json_nodes_raw | 函数 | 735–775 | 在未解析的原始 JSON 文本上统计节点数量，供分页快路径避免完整反序列化开销。 |
| deterministic_operation_spec | 函数 | 508–586 | 为确定性 replay 构造操作规格：固定节点数、帧序列与字节预算，使 worker 在相同输入下产生逐字节一致输出。 |
| fast_page_json | 函数 | 777–807 | 分页响应的快路径构造：直接切片拼接 JSON 片段，跳过完整 Value 重建以降低首屏延迟。 |
| page_descriptor | 函数 | 809–847 | 为分页请求生成确定性描述符：绑定请求哈希、游标与页大小，作为缓存键与 basis 校验依据。 |
| rebuild_metrics_request | 函数 | 1356–1410 | 依据 metrics basis 重建指标计算请求，确保重复计算只在 basis 变化时发生。 |
| split_paged_result | 函数 | 1164–1219 | 把完整的分页结果集切分为首屏页与其余页，保证 cold load 的 page-first 语义不被 full mirror 阻塞。 |
| unix_millis_from_utc_iso8601 | 函数 | 74–127 | 把 UTC ISO8601 字符串解析回毫秒时间戳，是上一函数的逆运算并对非法格式报错。 |
| utc_iso8601_from_unix_millis | 函数 | 30–58 | 把毫秒 Unix 时间戳转为 UTC ISO8601 字符串，跨进程时间字段的统一编码入口。 |
| write_canonical | 函数 | 1412–1452 | 写出规范化 topic path 标识，保证同一主题在不同来源下折叠为同一 canonical key。 |
