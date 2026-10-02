
# rust/synthesis-sidecar/crates/synthesis-sidecar/examples/worker_protocol_corpus_parity.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/examples](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/examples.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/examples/worker_protocol_corpus_parity.rs -->

worker 协议语料 parity 样例：用固定协议语料回放验证 worker 对各类消息的处理结果与原生实现逐条一致。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/examples/worker_protocol_corpus_parity.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/examples/worker_protocol_corpus_parity.rs)

## 符号（1）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/examples/worker_protocol_corpus_parity.rs:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 120–152 | 中等 | parity-test、protocol、entry-point | 0 | worker 协议语料 parity 主流程：按语料分派标签页与概念别名页请求，逐条断言 worker 响应。 |
