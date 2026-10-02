
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs -->

文件系统平台适配：提供目录 fsync 以保证重命名前后的持久性边界，Windows 走 no-op 变体。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_lifecycle.rs](runtime_lifecycle.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs | 生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。 |
| [runtime_webdav_runtime.rs](runtime_webdav_runtime.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs | WebDAV 运行时适配：以文件状态存储保存同步状态（原子写入），并提供可被停止信号中断的重试调度器。 |
