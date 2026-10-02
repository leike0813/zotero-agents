
# commit_import_batch
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:commit_import_batch -->

提交导入批次：校验全部条目后一次性落到 canonical 布局，失败则整体回滚。
类型：函数  
复杂度：复杂  
入边数：1  
标签：导入批次、提交、事务、原子性  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:2038](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L2038)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [recover_import_batch_on_open](recover_import_batch_on_open.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:2164–2196 | 打开 store 时恢复遗留的导入批次，按 journal phase 决定提交或丢弃。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [durable_write](durable_write.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:737–760 | 以 fsync + 原子重命名方式落盘文件，确保崩溃后不出现半写状态。 |
