
# rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs -->

主题 Digest 应用层：构造与评估主题级结构化笔记（Digest）产物，定义其健康度与引用分析结论。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs)

## 符号（5）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs:decoded_base64_bytes -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs:project_representative_image -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs:RepresentativeImageProjection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs:resolve -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs:TopicPaperDigestApplication -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| decoded_base64_bytes | 函数 | 438–460 | 简单 | rust、解码、有界读取、digest | 0 | 解码代表图的 base64 内容并校验大小边界，避免无界内存占用。 |
| project_representative_image | 函数 | 286–378 | 中等 | rust、投影、容错、digest | 0 | 投影代表图：读取失败时降级为占位而不让整篇 Digest 失败。 |
| RepresentativeImageProjection | 类 | 115–138 | 简单 | rust | 0 | 代表图投影：把宿主图片读取结果投影为可内嵌展示的数据，失败不影响 Digest 主体。 |
| resolve | 函数 | 172–245 | 中等 | rust、解析、digest、topic | 0 | 解析 Digest 请求的论文范围与 artifact 来源，形成可读取的 Digest 输入。 |
| TopicPaperDigestApplication | 类 | 156–159 | 简单 | rust、A、p、l | 0 | 主题论文 Digest 应用层：读取 digest artifact 与代表图，产出结构化 Digest 结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| RepresentativeImageProjection | 类 | 115–138 | 代表图投影：把宿主图片读取结果投影为可内嵌展示的数据，失败不影响 Digest 主体。 |
| TopicPaperDigestApplication | 类 | 156–159 | 主题论文 Digest 应用层：读取 digest artifact 与代表图，产出结构化 Digest 结果。 |
