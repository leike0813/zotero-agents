
# rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs -->

文献库快照索引的仓储实现，追踪 library 快照 basis 以支撑增量 rebuild 的变更检测。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs)

## 符号（8）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:begin_library_snapshot_generation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:current_library_snapshot_generation -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:LibrarySnapshotGenerationRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:LibrarySnapshotIndexItemRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:LibrarySnapshotPromotion -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:list_current_library_snapshot_items -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:promote_library_snapshot_generation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs:stage_library_snapshot_items -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| begin_library_snapshot_generation | 函数 | 44–74 | 中等 | library-snapshot、事务、生命周期 | 0 | 开启一个新的快照 generation，写入 staging 状态记录作为后续写入的锚点。 |
| current_library_snapshot_generation | 函数 | 230–257 | 中等 | library-snapshot、读取、basis | 0 | 读取当前生效的快照 generation 记录，作为增量 rebuild 的输入 basis。 |
| LibrarySnapshotGenerationRecord | 类 | 8–18 | 简单 | library-snapshot、数据契约 | 0 | 文献库快照 generation 记录，标识 snapshot、library、状态与内容摘要。 |
| LibrarySnapshotIndexItemRecord | 类 | 21–26 | 简单 | library-snapshot、索引 | 0 | 快照内的单条索引项，关联 item 与其稳定标识。 |
| LibrarySnapshotPromotion | 类 | 29–37 | 简单 | library-snapshot、提升 | 0 | 快照 generation 的提升结果，声明获胜 generation 与被取代者。 |
| list_current_library_snapshot_items | 函数 | 259–292 | 中等 | library-snapshot、分页读取、读取 | 0 | 分页列出当前 generation 的索引项，供 Host 侧构建文献库视图。 |
| promote_library_snapshot_generation | 函数 | 137–228 | 复杂 | library-snapshot、事务、提升 | 0 | 在同一事务内把 staging generation 提升为 current，并清理被取代的 generation。 |
| stage_library_snapshot_items | 函数 | 76–135 | 中等 | library-snapshot、写入、批量 | 0 | 把本轮采集到的库内条目分批写入 staging generation。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| begin_library_snapshot_generation | 函数 | 44–74 | 开启一个新的快照 generation，写入 staging 状态记录作为后续写入的锚点。 |
| current_library_snapshot_generation | 函数 | 230–257 | 读取当前生效的快照 generation 记录，作为增量 rebuild 的输入 basis。 |
| LibrarySnapshotGenerationRecord | 类 | 8–18 | 文献库快照 generation 记录，标识 snapshot、library、状态与内容摘要。 |
| LibrarySnapshotIndexItemRecord | 类 | 21–26 | 快照内的单条索引项，关联 item 与其稳定标识。 |
| LibrarySnapshotPromotion | 类 | 29–37 | 快照 generation 的提升结果，声明获胜 generation 与被取代者。 |
| list_current_library_snapshot_items | 函数 | 259–292 | 分页列出当前 generation 的索引项，供 Host 侧构建文献库视图。 |
| promote_library_snapshot_generation | 函数 | 137–228 | 在同一事务内把 staging generation 提升为 current，并清理被取代的 generation。 |
| stage_library_snapshot_items | 函数 | 76–135 | 把本轮采集到的库内条目分批写入 staging generation。 |
