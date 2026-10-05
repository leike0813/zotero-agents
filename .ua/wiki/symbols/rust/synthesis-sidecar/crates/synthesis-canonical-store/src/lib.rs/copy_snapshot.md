
# copy_snapshot
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:copy_snapshot -->

将 topic 快照递归复制到目标目录，复制过程中逐文件校验哈希。
类型：函数  
复杂度：复杂  
入边数：2  
标签：快照、文件操作、完整性校验  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:783](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L783)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [archive_current](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1560–1612 | 归档当前 topic：把活动目录移入归档区并更新 current 指针，全程在同一事务边界内。 |
| [promote_locked](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1787–1881 | 在持有写入租约的前提下完成 topic 提升：写 journal、切换 current、生成回执并清理事务。 |

## 调用

该符号没有记录对外调用。
