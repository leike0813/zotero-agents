
# migrate_historical_topic_roots
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:migrate_historical_topic_roots -->

把历史遗留的 topic 目录布局迁移到当前规范布局，保持内容与哈希不变。
类型：函数  
复杂度：复杂  
入边数：1  
标签：迁移、兼容、topic、数据完整性  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1321](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L1321)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [open_root](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1270–1319 | 打开或初始化 store root，校验 identity 文件并执行 schema 版本迁移。 |

## 调用

该符号没有记录对外调用。
