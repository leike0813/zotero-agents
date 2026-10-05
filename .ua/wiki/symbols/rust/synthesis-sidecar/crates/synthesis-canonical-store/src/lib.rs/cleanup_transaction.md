
# cleanup_transaction
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:cleanup_transaction -->

清理已完成事务的 journal 与 staging 残留，失败不覆盖主错误。
类型：函数  
复杂度：简单  
入边数：2  
标签：清理、事务、资源回收  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1883](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L1883)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [discard_import_batch](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:2100–2125 | 放弃未提交的导入批次，清理 staging 目录与 journal 记录。 |
| [promote_locked](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1787–1881 | 在持有写入租约的前提下完成 topic 提升：写 journal、切换 current、生成回执并清理事务。 |

## 调用

该符号没有记录对外调用。
