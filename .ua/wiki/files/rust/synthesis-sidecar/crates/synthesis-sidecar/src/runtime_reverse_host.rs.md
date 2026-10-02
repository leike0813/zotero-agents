
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs -->

反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs)

## 符号（6）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:call_reverse_host -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:call_reverse_host_traced -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:call_reverse_host_with_transport -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:read_response -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:response_header -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:send_reverse_host_request -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| call_reverse_host | 函数 | 146–159 | 简单 | host-adapter、rust、runtime | 1 | 向插件侧发起 reverse host capability 调用的公开入口，内部注入默认传输实现。 |
| call_reverse_host_traced | 函数 | 190–301 | 中等 | host-adapter、rust、runtime | 0 | 带 trace 的实际调用：生成 request id、注入观察上下文、发送请求并校验响应结构。 |
| call_reverse_host_with_transport | 函数 | 161–188 | 简单 | host-adapter、rust、runtime | 0 | 带可注入传输的调用版本，便于测试替换网络实现并复用 trace 传播逻辑。 |
| read_response | 函数 | 51–79 | 简单 | host-adapter、rust、read-path | 0 | 按界限读取响应体，超限即中止并返回明确错误。 |
| response_header | 函数 | 31–49 | 简单 | host-adapter、rust、runtime | 0 | 解析响应头，校验状态行、content-length 与实际体长一致。 |
| send_reverse_host_request | 函数 | 81–144 | 中等 | host-adapter、rust、runtime | 0 | 发送 reverse host HTTP 请求：按 capability 选择超时、实施响应头与响应体限界并解析 JSON 响应。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_deadline.rs](runtime_deadline.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs | 请求级 deadline：以 thread-local 记录请求截止时间，把下游 timeout 收敛为有界剩余时间，并在操作结束后恢复先前值。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| call_reverse_host | 函数 | 146–159 | 向插件侧发起 reverse host capability 调用的公开入口，内部注入默认传输实现。 |
