
# rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-reference-matcher/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-reference-matcher/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs -->

参考文献匹配算法 crate：把正文中抽取的引用片段归一化并对齐到文献库条目，产出可写入的 References/Citation 事实。
源码：[rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs)

## 符号（13）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:authors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:binding -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:candidate -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:contained_title_details -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:dedupe -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:dedupe_record -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:DedupeRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:identifiers -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:noise_profile -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:normalize_identifier -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:normalize_title -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:title_similarity -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs:title_variants -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| authors | 函数 | 194–210 | 简单 | parsing、metadata、matching | 0 | 解析作者串为结构化作者列表，容忍多种分隔与姓名顺序写法。 |
| binding | 函数 | 395–613 | 复杂 | binding、matching、decision-logic | 0 | 把原始参考文献绑定到库内 canonical 条目：组合标识符精确匹配与标题相似度打分，输出绑定结果与拒绝理由。 |
| candidate | 函数 | 244–281 | 中等 | matching、scoring、candidate | 0 | 构造匹配候选：把归一化后的文献记录与库内条目配对，附带得分与匹配理由。 |
| contained_title_details | 函数 | 1368–1520 | 复杂 | parsing、heuristics、matching | 0 | 解析标题中被括号包裹的附加说明（会议名、卷期、系列名等），并判断其是否属于文献本体标题。 |
| dedupe | 函数 | 1570–1660 | 复杂 | deduplication、entry-point、matching | 0 | 去重算法主入口：构建记录簇、选代表、合并标识符与作者证据，产出确定性去重结果。 |
| dedupe_record | 函数 | 861–1038 | 复杂 | deduplication、matching、canonicalization | 0 | 对同一文献的多个原始引用记录做去重合并，选出代表性记录并保留各记录的差异证据。 |
| DedupeRecord | 类 | 616–637 | 中等 | data-model、deduplication、domain-entity | 0 | 去重输入记录模型，承载归一化标题、标识符、作者与来源引用等比较所需全部字段。 |
| identifiers | 函数 | 118–192 | 复杂 | extraction、identifier、matching | 0 | 从原始参考文献文本中抽取全部候选标识符并逐个归一化，按可信度排序返回。 |
| noise_profile | 函数 | 745–859 | 复杂 | heuristics、matching、noise | 0 | 分析标题中的噪声模式（刊名、卷期页码残留等），输出噪声特征用于惩罚虚假高分匹配。 |
| normalize_identifier | 函数 | 62–116 | 中等 | identifier、normalization、matching | 0 | 归一化文献标识符（DOI、ISBN 等），剥离前缀与格式差异后得到可比较的标准形式。 |
| normalize_title | 函数 | 28–45 | 简单 | normalization、matching、utility | 0 | 标题归一化：统一大小写、空白与标点，作为匹配与去重的比较基线。 |
| title_similarity | 函数 | 283–301 | 中等 | similarity、scoring、matching | 0 | 计算两条标题的相似度，综合规范化比较与 token 交集，输出 0..1 得分。 |
| title_variants | 函数 | 312–393 | 复杂 | matching、recall、normalization | 0 | 生成标题的多种变体（去副标题、去标点、词序调整等）以提升召回率并去重。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-protocol/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| authors | 函数 | 194–210 | 解析作者串为结构化作者列表，容忍多种分隔与姓名顺序写法。 |
| binding | 函数 | 395–613 | 把原始参考文献绑定到库内 canonical 条目：组合标识符精确匹配与标题相似度打分，输出绑定结果与拒绝理由。 |
| candidate | 函数 | 244–281 | 构造匹配候选：把归一化后的文献记录与库内条目配对，附带得分与匹配理由。 |
| contained_title_details | 函数 | 1368–1520 | 解析标题中被括号包裹的附加说明（会议名、卷期、系列名等），并判断其是否属于文献本体标题。 |
| dedupe | 函数 | 1570–1660 | 去重算法主入口：构建记录簇、选代表、合并标识符与作者证据，产出确定性去重结果。 |
| dedupe_record | 函数 | 861–1038 | 对同一文献的多个原始引用记录做去重合并，选出代表性记录并保留各记录的差异证据。 |
| identifiers | 函数 | 118–192 | 从原始参考文献文本中抽取全部候选标识符并逐个归一化，按可信度排序返回。 |
| noise_profile | 函数 | 745–859 | 分析标题中的噪声模式（刊名、卷期页码残留等），输出噪声特征用于惩罚虚假高分匹配。 |
| normalize_identifier | 函数 | 62–116 | 归一化文献标识符（DOI、ISBN 等），剥离前缀与格式差异后得到可比较的标准形式。 |
| normalize_title | 函数 | 28–45 | 标题归一化：统一大小写、空白与标点，作为匹配与去重的比较基线。 |
| title_similarity | 函数 | 283–301 | 计算两条标题的相似度，综合规范化比较与 token 交集，输出 0..1 得分。 |
| title_variants | 函数 | 312–393 | 生成标题的多种变体（去副标题、去标点、词序调整等）以提升召回率并去重。 |
