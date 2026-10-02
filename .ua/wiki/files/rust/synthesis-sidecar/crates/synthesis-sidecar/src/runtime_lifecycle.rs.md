
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs -->

生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs)

## 符号（11）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:acquire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:atomic_write_json -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:finish -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:fmt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:record_cleanup_issue -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:request_failure -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:request_normal -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:RuntimeOwnership -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:ServeFailure -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:ServeIssue -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:StopSignal -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [acquire](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs/acquire.md) | 函数 | 250–309 | 中等 | lifecycle、rust、runtime | 2 | 获取运行根目录独占锁，清理上一次异常退出残留后返回 RuntimeOwnership。 |
| atomic_write_json | 函数 | 196–240 | 简单 | lifecycle、rust、runtime | 0 | 以临时文件加 rename 的方式原子写出 JSON，避免半写状态被其它读者看到。 |
| finish | 函数 | 169–193 | 简单 | lifecycle、rust、runtime | 0 | 成形并返回唯一一次 terminal result：正常停止返回 Ok，failure 返回 primary 与 secondary issue。 |
| fmt | 函数 | 57–69 | 简单 | lifecycle、rust、runtime | 0 | 生命周期与所有权中的 fmt 步骤实现。 |
| record_cleanup_issue | 函数 | 155–167 | 简单 | lifecycle、rust、runtime | 0 | 登记清理阶段的次要问题；terminal result 已成形时被忽略。 |
| request_failure | 函数 | 135–153 | 简单 | lifecycle、rust、runtime | 0 | 登记一条 lifecycle failure；成形前第一个 failure 成为 primary，后续仅作 secondary。 |
| request_normal | 函数 | 122–133 | 简单 | lifecycle、rust、runtime | 0 | 登记一条正常停止原因（父输入关闭、authenticated shutdown 等），可与其它原因合并。 |
| RuntimeOwnership | 类 | 243–247 | 简单 | lifecycle、rust、type | 0 | 运行根目录的独占所有权：以文件锁阻止并发 sidecar 实例，并在释放时做原子写入与 discovery 移除。 |
| ServeFailure | 类 | 36–40 | 简单 | lifecycle、rust、type | 0 | 终态失败结果：携带 phase、primary code 与按发生顺序排列的清理 issue 列表。 |
| ServeIssue | 类 | 20–23 | 简单 | lifecycle、rust、type | 0 | 单个生命周期问题记录，含发生阶段与错误码。 |
| StopSignal | 类 | 100–102 | 简单 | lifecycle、rust、type | 0 | 带 reason 的停止信号：合并正常停止原因，收集 lifecycle failure 与清理 issue，并只允许成形一次 terminal result。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_file_system.rs](runtime_file_system.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs | 文件系统平台适配：提供目录 fsync 以保证重命名前后的持久性边界，Windows 走 no-op 变体。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_server_loop.rs](runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs | loopback 监听与连接循环：执行连接准入上限管理、handler 注册与回收、共享 deadline 内 drain，并在 socket 中断时及时收敛。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [acquire](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs/acquire.md) | 函数 | 250–309 | 获取运行根目录独占锁，清理上一次异常退出残留后返回 RuntimeOwnership。 |
| finish | 函数 | 169–193 | 成形并返回唯一一次 terminal result：正常停止返回 Ok，failure 返回 primary 与 secondary issue。 |
| record_cleanup_issue | 函数 | 155–167 | 登记清理阶段的次要问题；terminal result 已成形时被忽略。 |
| request_failure | 函数 | 135–153 | 登记一条 lifecycle failure；成形前第一个 failure 成为 primary，后续仅作 secondary。 |
| request_normal | 函数 | 122–133 | 登记一条正常停止原因（父输入关闭、authenticated shutdown 等），可与其它原因合并。 |
| RuntimeOwnership | 类 | 243–247 | 运行根目录的独占所有权：以文件锁阻止并发 sidecar 实例，并在释放时做原子写入与 discovery 移除。 |
| ServeFailure | 类 | 36–40 | 终态失败结果：携带 phase、primary code 与按发生顺序排列的清理 issue 列表。 |
| ServeIssue | 类 | 20–23 | 单个生命周期问题记录，含发生阶段与错误码。 |
| StopSignal | 类 | 100–102 | 带 reason 的停止信号：合并正常停止原因，收集 lifecycle failure 与清理 issue，并只允许成形一次 terminal result。 |
