
# sha256_hex
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:sha256_hex -->

计算字节串的 SHA-256 十六进制摘要，作为内容指纹。
类型：函数  
复杂度：简单  
入边数：2  
标签：哈希、工具函数、内容指纹  
所属文件：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:380](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs#L380)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [hash_json](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:394–398 | 对 JSON 值做规范化序列化后计算哈希，保证键序无关的稳定表示。 |
| [validate_declared_hashes](validate_declared_hashes.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:499–530 | 逐项比对快照声明的哈希与实际内容，不一致即判为篡改或损坏。 |

## 调用

该符号没有记录对外调用。
