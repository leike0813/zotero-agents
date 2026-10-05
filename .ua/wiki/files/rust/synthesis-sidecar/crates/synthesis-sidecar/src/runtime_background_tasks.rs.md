
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs -->

后台任务所有者：注册后台线程、停止准入、协作式取消，并在共享 deadline 内 drain，回报残留任务数与 panic 计数。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs)

## 符号（4）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs:BackgroundTaskOwner -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs:reap_locked -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs:spawn -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs:stop_and_drain_until -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| BackgroundTaskOwner | 类 | 21–24 | 简单 | background-task、rust、type、lifecycle | 0 | 后台任务所有者：注册任务、停止准入、协作取消并在 deadline 内 drain，回报残留与 panic 计数。 |
| reap_locked | 函数 | 124–141 | 简单 | background-task、rust、runtime | 0 | 在已持锁状态下回收已结束任务并统计 panic 数。 |
| [spawn](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs/spawn.md) | 函数 | 43–73 | 简单 | background-task、rust、lifecycle | 7 | 注册一个后台线程任务，携带取消标记；已停止准入时立即失败。 |
| stop_and_drain_until | 函数 | 95–121 | 简单 | background-task、rust、lifecycle | 0 | 停止准入、取消全部任务并在共享 deadline 内等待退出，报告仍未完成的任务。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| BackgroundTaskOwner | 类 | 21–24 | 后台任务所有者：注册任务、停止准入、协作取消并在 deadline 内 drain，回报残留与 panic 计数。 |
| [spawn](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs/spawn.md) | 函数 | 43–73 | 注册一个后台线程任务，携带取消标记；已停止准入时立即失败。 |
| stop_and_drain_until | 函数 | 95–121 | 停止准入、取消全部任务并在共享 deadline 内等待退出，报告仍未完成的任务。 |
