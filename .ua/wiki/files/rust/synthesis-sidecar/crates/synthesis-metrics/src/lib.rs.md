
# rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-metrics/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-metrics/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs -->

指标计算 crate：对引用图谱、主题图谱等结构化产物计算覆盖率、分布等统计指标，供 Dashboard 与 Workbench 展示。
源码：[rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs)

## 符号（2）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs:compute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs:metric_year -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compute | 函数 | 43–325 | 复杂 | metrics、pagerank、graph-algorithm、worker | 0 | 指标 worker 主计算：遍历引用图谱节点与边，执行 PageRank 与连通分量分析，归一化后产出 foundation/frontier 评分与诊断信息。 |
| metric_year | 函数 | 25–41 | 简单 | parsing、normalization、utility | 0 | 从字符串中稳健抽取四位年份，用于节点时间归一化与近期度计算。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-protocol/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| compute | 函数 | 43–325 | 指标 worker 主计算：遍历引用图谱节点与边，执行 PageRank 与连通分量分析，归一化后产出 foundation/frontier 评分与诊断信息。 |
| metric_year | 函数 | 25–41 | 从字符串中稳健抽取四位年份，用于节点时间归一化与近期度计算。 |
