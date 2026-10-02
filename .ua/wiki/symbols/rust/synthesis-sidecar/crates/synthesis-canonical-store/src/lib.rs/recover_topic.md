
# recover_topic
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:recover_topic -->

按 journal phase 判定并恢复单个 topic 的未完成事务，回滚或前滚。
类型：函数  
复杂度：复杂  
入边数：1  
标签：崩溃恢复、journal、事务、canonical-store  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1893](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L1893)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [recover_all](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1957–1972 | 打开 store 时遍历全部 topic 执行恢复，把首个失败作为主错误。 |

## 调用

该符号没有记录对外调用。
