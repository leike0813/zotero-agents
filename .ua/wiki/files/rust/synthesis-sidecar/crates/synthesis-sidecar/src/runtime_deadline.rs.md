
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs -->

请求级 deadline：以 thread-local 记录请求截止时间，把下游 timeout 收敛为有界剩余时间，并在操作结束后恢复先前值。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs)

## 符号（1）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs:bounded_timeout -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [bounded_timeout](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs/bounded_timeout.md) | 函数 | 25–37 | 简单 | deadline、rust、validation | 3 | 把调用方请求的超时收敛为不超过当前请求剩余时间的有界值。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_reverse_host.rs](runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs | 反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。 |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [bounded_timeout](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs/bounded_timeout.md) | 函数 | 25–37 | 把调用方请求的超时收敛为不超过当前请求剩余时间的有界值。 |
