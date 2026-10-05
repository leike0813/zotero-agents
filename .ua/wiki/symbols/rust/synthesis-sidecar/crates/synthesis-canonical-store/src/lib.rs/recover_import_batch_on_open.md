
# recover_import_batch_on_open
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:recover_import_batch_on_open -->

打开 store 时恢复遗留的导入批次，按 journal phase 决定提交或丢弃。
类型：函数  
复杂度：复杂  
入边数：1  
标签：崩溃恢复、导入批次、canonical-store  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:2164](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L2164)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [open_root](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1270–1319 | 打开或初始化 store root，校验 identity 文件并执行 schema 版本迁移。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [commit_import_batch](commit_import_batch.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:2038–2098 | 提交导入批次：校验全部条目后一次性落到 canonical 布局，失败则整体回滚。 |
| [discard_import_batch](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:2100–2125 | 放弃未提交的导入批次，清理 staging 目录与 journal 记录。 |
