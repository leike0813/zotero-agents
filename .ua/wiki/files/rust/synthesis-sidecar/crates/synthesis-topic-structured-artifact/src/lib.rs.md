
# rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs -->

主题结构化产物 crate：定义主题综合输出的结构化 artifact 模型、解析与校验规则，是 Workbench 读取综合结果的数据契约。
源码：[rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs)

## 符号（8）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:artifact_errors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:compute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:content_depth_errors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:manifest_errors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:report_dimension_errors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:review_outline_errors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:source_paper_ref_errors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs:validate_json_bounds -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| artifact_errors | 函数 | 836–944 | 复杂 | validation、entry-point、diagnostics | 0 | 主题结构化 artifact 校验总入口：串联各子校验器并汇总为可上报的诊断列表。 |
| compute | 函数 | 1017–1084 | 复杂 | worker、entry-point、artifact-model | 0 | 主题结构化产物 worker 入口：读取 manifest 与正文、执行全量校验并输出可写入的 canonical 产物。 |
| content_depth_errors | 函数 | 592–834 | 复杂 | validation、content-structure、error-handling | 0 | 校验内容深度层级：逐级检查章节展开是否满足最低深度与覆盖要求，输出按层级定位的错误。 |
| manifest_errors | 函数 | 150–252 | 复杂 | validation、artifact-model、error-handling | 0 | 校验主题 artifact 的 manifest：条目计数、版本、来源引用与时间线字段的一致性检查。 |
| report_dimension_errors | 函数 | 437–522 | 复杂 | validation、artifact-model、integrity-check | 0 | 校验报告维度声明：维度取值范围、权重与派生指标之间必须自洽。 |
| review_outline_errors | 函数 | 524–590 | 复杂 | validation、outline、error-handling | 0 | 校验审阅大纲结构：节点层级、顺序与引用的报告维度必须一致，防止出现不可渲染的大纲。 |
| source_paper_ref_errors | 函数 | 357–391 | 中等 | validation、reference、error-handling | 0 | 校验结构化产物中的来源文献引用格式与可解析性，拒绝悬空或格式错误的引用。 |
| validate_json_bounds | 函数 | 66–118 | 中等 | validation、guard、json | 0 | 在解析前对 artifact JSON 做深度与体积边界检查，防止超大或过深输入拖垮 worker。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-protocol/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| artifact_errors | 函数 | 836–944 | 主题结构化 artifact 校验总入口：串联各子校验器并汇总为可上报的诊断列表。 |
| compute | 函数 | 1017–1084 | 主题结构化产物 worker 入口：读取 manifest 与正文、执行全量校验并输出可写入的 canonical 产物。 |
| content_depth_errors | 函数 | 592–834 | 校验内容深度层级：逐级检查章节展开是否满足最低深度与覆盖要求，输出按层级定位的错误。 |
| manifest_errors | 函数 | 150–252 | 校验主题 artifact 的 manifest：条目计数、版本、来源引用与时间线字段的一致性检查。 |
| report_dimension_errors | 函数 | 437–522 | 校验报告维度声明：维度取值范围、权重与派生指标之间必须自洽。 |
| review_outline_errors | 函数 | 524–590 | 校验审阅大纲结构：节点层级、顺序与引用的报告维度必须一致，防止出现不可渲染的大纲。 |
| source_paper_ref_errors | 函数 | 357–391 | 校验结构化产物中的来源文献引用格式与可解析性，拒绝悬空或格式错误的引用。 |
| validate_json_bounds | 函数 | 66–118 | 在解析前对 artifact JSON 做深度与体积边界检查，防止超大或过深输入拖垮 worker。 |
