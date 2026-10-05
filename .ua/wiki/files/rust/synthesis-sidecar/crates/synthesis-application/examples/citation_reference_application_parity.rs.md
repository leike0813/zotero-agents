
# rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/examples](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/examples.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs -->

引用与 References 领域在应用层的 parity 示例测试，验证 Citation Graph 与配对引用的提交语义。
源码：[rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs)

## 符号（3）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs:build -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs:main -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs:match_pass -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [build](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs/build.md) | 函数 | 89–183 | 复杂 | test、fixture、citation-graph、parity | 1 | 构造固定 fixture 的图谱状态，注入预先决定的节点、边与引用匹配结果。 |
| main | 函数 | 378–665 | 复杂 | test、parity、入口、契约语料、citation-graph | 0 | parity 驱动主流程：按语料驱动引用、References 配对、artifact 就绪与图谱分页请求并比对期望结果。 |
| [match_pass](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs/match_pass.md) | 函数 | 295–334 | 复杂 | test、fake host、引用匹配、确定性 | 1 | 执行引用匹配与绑定解析的测试替身，按预设答案返回匹配结果。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-citation-graph-build/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs | 引用图谱构建算法 crate，读取规范记录并计算节点、边与图谱度量等派生结果。 |
| [lib.rs](../../synthesis-citation-layout/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs | 引用图谱布局计算 crate，依据图谱结构与度量计算 Sigma 节点位置、相机参数等布局身份。 |
