
# durable_write
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:durable_write -->

以 fsync + 原子重命名方式落盘文件，确保崩溃后不出现半写状态。
类型：函数  
复杂度：复杂  
入边数：3  
标签：持久化、原子写、fsync、崩溃恢复  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:737](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L737)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [commit_import_batch](commit_import_batch.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:2038–2098 | 提交导入批次：校验全部条目后一次性落到 canonical 布局，失败则整体回滚。 |
| [promote_locked](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1787–1881 | 在持有写入租约的前提下完成 topic 提升：写 journal、切换 current、生成回执并清理事务。 |
| [stage_import_batch](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1974–2018 | 把导入条目 staging 到临时目录并写入 journal，不影响 current topic。 |

## 调用

该符号没有记录对外调用。
