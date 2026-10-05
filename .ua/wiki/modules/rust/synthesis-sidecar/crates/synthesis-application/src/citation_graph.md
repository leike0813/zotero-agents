
# rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph
> 目录聚合页：3 个文件、16 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs](../../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs.md) | 文件 | 3 | 引用图谱的持久化辅助子模块，把图 rows/state 与 attempt 终态收敛为单个 repository transaction 提交单元。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs](../../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs.md) | 文件 | 10 | 引用图谱读路径子模块：实现 basis-bound 的 page/continuation/neighborhood 读取，短 reader transaction 内重新校验 basis 并对过期游标以 basis_mismatch 失败。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs](../../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs.md) | 文件 | 3 | Citation Graph 应用层的重建调度模块，创建私有 rebuild attempt 并在成功、失败或 basis mismatch 时收敛。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [rust/synthesis-sidecar/crates/synthesis-application/src](../src.md) | 2 |
