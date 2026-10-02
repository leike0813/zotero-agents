
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs -->

WebDAV 运行时适配：以文件状态存储保存同步状态（原子写入），并提供可被停止信号中断的重试调度器。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs)

## 符号（5）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs:FileWebDavStateStore -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs:InterruptibleWebDavRetryScheduler -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs:load_unlocked -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs:save_unlocked -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs:wait -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| FileWebDavStateStore | 类 | 12–15 | 简单 | webdav、rust、type、lifecycle | 0 | 文件态 WebDAV 同步状态存储：读取状态文件并以原子写保存更新。 |
| InterruptibleWebDavRetryScheduler | 类 | 106–109 | 简单 | webdav、rust、type、lifecycle | 0 | 可中断重试调度器：按退避等待重试，并在停止信号到达时立即返回。 |
| load_unlocked | 函数 | 33–44 | 简单 | webdav、rust、runtime | 0 | 在已持锁状态下读取同步状态，缺失时返回默认状态。 |
| save_unlocked | 函数 | 46–79 | 简单 | webdav、rust、runtime | 0 | 在已持锁状态下原子保存同步状态，失败时不留下半写文件。 |
| wait | 函数 | 112–127 | 简单 | webdav、rust、lifecycle | 0 | 执行一次可中断等待，返回是否因停止而提前结束。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_file_system.rs](runtime_file_system.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs | 文件系统平台适配：提供目录 fsync 以保证重命名前后的持久性边界，Windows 走 no-op 变体。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| FileWebDavStateStore | 类 | 12–15 | 文件态 WebDAV 同步状态存储：读取状态文件并以原子写保存更新。 |
| InterruptibleWebDavRetryScheduler | 类 | 106–109 | 可中断重试调度器：按退避等待重试，并在停止信号到达时立即返回。 |
