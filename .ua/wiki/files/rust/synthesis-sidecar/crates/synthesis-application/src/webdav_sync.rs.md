
# rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs -->

WebDAV 同步应用层：驱动远端 bundle 的拉取、合并与推送，复用 durable bundle 与统一 admission，保证同步过程可重放。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs)

## 符号（7）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:load_webdav_sync_state_unlocked -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:sync_once -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:upload_export -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:validate_state -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:WebDavDurablePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:WebDavSyncApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:WebDavSyncState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| load_webdav_sync_state_unlocked | 函数 | 293–337 | 中等 | rust、状态、并发控制、webdav | 0 | 在锁保护下读取同步状态，保证读取与更新之间不出现竞态。 |
| sync_once | 函数 | 596–679 | 中等 | rust、同步、webdav、重入 | 0 | 执行一轮同步：观察远端 head、拉取 bundle 并给出冲突与诊断结果。 |
| upload_export | 函数 | 705–784 | 中等 | rust、上传、webdav、bundle | 0 | 上传导出 bundle，成功后更新本地同步状态与远端 head 记录。 |
| validate_state | 函数 | 880–917 | 中等 | rust、校验、状态、webdav | 0 | 校验持久化的同步状态结构，状态损坏时按确定的失败路径收敛。 |
| WebDavDurablePort | 类 | 104–115 | 简单 | rust、P、o、r | 0 | WebDAV durable 端口：声明远端 bundle 与 head 的读写能力。 |
| WebDavSyncApplication | 类 | 241–252 | 简单 | rust、A、p、l | 0 | WebDAV 同步应用层 owner：编排连接测试、远端 head 观察、bundle 拉取与冲突上报。 |
| WebDavSyncState | 类 | 189–220 | 中等 | rust、S、t、a | 0 | 同步运行时状态：记录上次运行结果、冲突、诊断与重试调度信息。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |
| [durable_bundle.rs](durable_bundle.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs | 持久化 bundle 应用层：负责跨设备同步所需 bundle 的组装、比较与提交，保持 durable 记录与事务边界的单一来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| WebDavDurablePort | 类 | 104–115 | WebDAV durable 端口：声明远端 bundle 与 head 的读写能力。 |
| WebDavSyncApplication | 类 | 241–252 | WebDAV 同步应用层 owner：编排连接测试、远端 head 观察、bundle 拉取与冲突上报。 |
| WebDavSyncState | 类 | 189–220 | 同步运行时状态：记录上次运行结果、冲突、诊断与重试调度信息。 |
