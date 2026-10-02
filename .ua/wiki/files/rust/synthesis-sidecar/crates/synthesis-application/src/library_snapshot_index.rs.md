
# rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs -->

文献库快照索引：为一次 library snapshot 建立可寻址的索引结构，使读路径能在同一 basis 下定位条目而不做全库 projection。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs)

## 符号（5）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs:consume_page -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs:LibrarySnapshotIndexApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs:LibrarySnapshotIndexRepositoryPort -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs:page_basis -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs:PageBasis -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| consume_page | 函数 | 122–182 | 中等 | rust、分页、索引、游标 | 0 | 消费一页索引结果并更新消费游标，是分页读取索引条目的唯一入口。 |
| LibrarySnapshotIndexApplication | 类 | 24–26 | 简单 | rust、A、p、l | 0 | 文献库快照索引应用层：为一次 snapshot 建立可寻址索引，让读路径无需全库 projection。 |
| LibrarySnapshotIndexRepositoryPort | 类 | 11–21 | 简单 | rust、P、o、r | 0 | 快照索引持久化端口：声明索引建立与页读取能力，是该领域唯一允许的存储接口。 |
| page_basis | 函数 | 52–89 | 中等 | rust、basis、校验、读路径 | 0 | 计算并校验页级 basis，绑定 snapshot 与过滤条件，basis 变化即整次获取失败。 |
| PageBasis | 类 | 28–34 | 简单 | rust、B、a、s | 0 | 页级 basis：绑定 snapshot 与过滤条件，使分页读取在 basis 变化时整体失败而非混页。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| LibrarySnapshotIndexApplication | 类 | 24–26 | 文献库快照索引应用层：为一次 snapshot 建立可寻址索引，让读路径无需全库 projection。 |
| LibrarySnapshotIndexRepositoryPort | 类 | 11–21 | 快照索引持久化端口：声明索引建立与页读取能力，是该领域唯一允许的存储接口。 |
| PageBasis | 类 | 28–34 | 页级 basis：绑定 snapshot 与过滤条件，使分页读取在 basis 变化时整体失败而非混页。 |
