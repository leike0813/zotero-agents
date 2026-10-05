
# validate_declared_hashes
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:validate_declared_hashes -->

逐项比对快照声明的哈希与实际内容，不一致即判为篡改或损坏。
类型：函数  
复杂度：复杂  
入边数：1  
标签：完整性校验、哈希、安全边界、canonical-store  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:499](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L499)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [read_current](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:1478–1512 | 读取当前 topic 快照并校验其表示与声明哈希，失败时返回结构化错误。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [hash_json](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:394–398 | 对 JSON 值做规范化序列化后计算哈希，保证键序无关的稳定表示。 |
| [sha256_hex](sha256_hex.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:380–384 | 计算字节串的 SHA-256 十六进制摘要，作为内容指纹。 |
