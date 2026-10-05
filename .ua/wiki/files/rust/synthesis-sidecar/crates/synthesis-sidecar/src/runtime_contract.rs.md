
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs -->

跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs)

## 符号（10）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:capabilities -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:NativeLaunchConfig -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:rebuild_native_bundle_manifest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:rebuild_native_discovery -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:rebuild_native_handshake -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:rebuild_native_health -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:rebuild_native_launch_config -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:runtime_identity -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:signature_valid -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs:target_matches -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| capabilities | 函数 | 323–334 | 简单 | contract、rust、runtime | 0 | 跨边界契约层中的 capabilities 步骤实现。 |
| NativeLaunchConfig | 类 | 68–100 | 简单 | contract、rust、type、lifecycle | 0 | native 启动配置：profile、bundle、target triple、build fingerprint、协议与 schema 版本等启动期身份字段。 |
| rebuild_native_bundle_manifest | 函数 | 199–245 | 简单 | contract、rust、runtime | 0 | 重建 bundle manifest，按每个文件的字节数与 sha256 校验完整性。 |
| rebuild_native_discovery | 函数 | 336–375 | 简单 | contract、rust、runtime | 0 | 重建 discovery 文档结构，保证对外身份字段自洽。 |
| rebuild_native_handshake | 函数 | 414–455 | 简单 | contract、rust、runtime | 0 | 重建 handshake 响应，校验协议与 schema 版本匹配。 |
| rebuild_native_health | 函数 | 377–412 | 简单 | contract、rust、runtime | 0 | 重建 health 文档，暴露运行期健康与能力信息。 |
| rebuild_native_launch_config | 函数 | 247–289 | 简单 | contract、rust、runtime | 0 | 从磁盘配置文件重建启动配置并校验必填字段。 |
| runtime_identity | 函数 | 310–321 | 简单 | contract、rust、lifecycle | 0 | 执行 runtime identity 流程，并在失败时回滚已取得的资源。 |
| signature_valid | 函数 | 165–192 | 简单 | contract、rust、runtime | 0 | 校验平台签名与 target 是否匹配当前运行环境。 |
| target_matches | 函数 | 121–132 | 简单 | contract、rust、runtime | 0 | 判断配置的 target triple 是否与当前构建目标一致。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_lifecycle.rs](runtime_lifecycle.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs | 生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_reverse_host.rs](runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs | 反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| NativeLaunchConfig | 类 | 68–100 | native 启动配置：profile、bundle、target triple、build fingerprint、协议与 schema 版本等启动期身份字段。 |
| rebuild_native_bundle_manifest | 函数 | 199–245 | 重建 bundle manifest，按每个文件的字节数与 sha256 校验完整性。 |
| rebuild_native_discovery | 函数 | 336–375 | 重建 discovery 文档结构，保证对外身份字段自洽。 |
| rebuild_native_handshake | 函数 | 414–455 | 重建 handshake 响应，校验协议与 schema 版本匹配。 |
| rebuild_native_health | 函数 | 377–412 | 重建 health 文档，暴露运行期健康与能力信息。 |
| rebuild_native_launch_config | 函数 | 247–289 | 从磁盘配置文件重建启动配置并校验必填字段。 |
