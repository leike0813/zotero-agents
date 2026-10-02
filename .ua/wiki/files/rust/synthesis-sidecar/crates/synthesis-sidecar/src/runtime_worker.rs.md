
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs -->

worker CLI 适配：按 stdin/stdout 帧协议读取任务、装配分页输入，并把分页结果按 graph 与 concept 两种形态写出。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs)

## 符号（11）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:append_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:next_typed_result_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:paginate_rows -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:PendingInputAssembler -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:wait_for_result_ack -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:worker -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:write_concept_paged_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:write_graph_paged_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:write_paged_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:write_raw_result_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:write_typed_result_section -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| append_page | 函数 | 47–57 | 简单 | worker、rust、runtime | 0 | 记录 append page，用于诊断、观测或状态留痕。 |
| next_typed_result_page | 函数 | 242–271 | 简单 | worker、rust、runtime | 0 | 从结果集中取出下一页并封装为带身份信息的页对象。 |
| paginate_rows | 函数 | 74–111 | 简单 | worker、rust、runtime | 0 | 按字节目标把行数组切分为多页，避免单页超过帧上限。 |
| PendingInputAssembler | 类 | 32–36 | 简单 | worker、rust、type、lifecycle | 0 | 输入装配器：按页序累积分页输入，校验页序完整后才交付执行。 |
| wait_for_result_ack | 函数 | 174–201 | 简单 | worker、rust、lifecycle | 0 | 等待下游对结果页的确认，未确认不继续以维持背压。 |
| worker | 函数 | 399–824 | 复杂 | worker、rust、runtime | 0 | worker 主函数：从 stdin 读取命令、装配分页输入、执行计算并按 graph/concept 形态写出分页结果。 |
| write_concept_paged_result | 函数 | 349–388 | 简单 | worker、rust、write-path | 0 | 按 concept 节形状写出分页结果。 |
| write_graph_paged_result | 函数 | 309–347 | 简单 | worker、rust、write-path | 0 | 按图节形状写出分页结果，保证节点/边/诊断各节顺序与页身份稳定。 |
| write_paged_result | 函数 | 113–172 | 中等 | worker、rust、write-path | 0 | 分页结果写出主流程：按节形状切分、逐页写出并在需要时等待 result ack。 |
| write_raw_result_page | 函数 | 203–234 | 简单 | worker、rust、write-path | 0 | 写出已就绪的原始结果页。 |
| write_typed_result_section | 函数 | 273–307 | 简单 | worker、rust、write-path | 0 | 把强类型节序列化后按页写出，页内保持字段顺序稳定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| worker | 函数 | 399–824 | worker 主函数：从 stdin 读取命令、装配分页输入、执行计算并按 graph/concept 形态写出分页结果。 |
