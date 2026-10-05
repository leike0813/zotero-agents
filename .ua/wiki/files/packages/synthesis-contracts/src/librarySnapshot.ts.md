
# packages/synthesis-contracts/src/librarySnapshot.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/librarySnapshot.ts -->

Zotero 文献库快照契约：定义快照请求、条目、完成证据与分页结果的 schema 常量、范围/顺序/批量上限，并提供对应的严格重建函数。
源码：[packages/synthesis-contracts/src/librarySnapshot.ts](../../../../../../packages/synthesis-contracts/src/librarySnapshot.ts)

## 符号（8）
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:integer -->
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:rebuildCreator -->
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:rebuildZoteroLibrarySnapshotCompletionEvidence -->
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:rebuildZoteroLibrarySnapshotItem -->
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:rebuildZoteroLibrarySnapshotPage -->
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:rebuildZoteroLibrarySnapshotRequest -->
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:strings -->
<!-- node: function:packages/synthesis-contracts/src/librarySnapshot.ts:stringValue -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| integer | 函数 | 149–164 | 简单 | validation、contract、parsing | 0 | 读取有界整数字段，越界即失败。 |
| rebuildCreator | 函数 | 191–224 | 简单 | validation、contract、data-model | 0 | 重建文献作者条目：姓名、姓氏与 ORCID 等标识。 |
| rebuildZoteroLibrarySnapshotCompletionEvidence | 函数 | 354–405 | 中等 | contract、rebuild、evidence | 0 | 重建快照完成证据：扫描范围、计数与哈希，界定一次快照的 basis。 |
| rebuildZoteroLibrarySnapshotItem | 函数 | 261–352 | 中等 | contract、rebuild、data-model | 0 | 重建单条快照条目：库键、标题、作者、日期、标签与集合归属。 |
| rebuildZoteroLibrarySnapshotPage | 函数 | 407–502 | 中等 | contract、rebuild、pagination | 0 | 重建快照分页结果，校验页元数据、条目数组与结束标记。 |
| rebuildZoteroLibrarySnapshotRequest | 函数 | 226–259 | 简单 | contract、rebuild、zotero-integration | 0 | 重建文献库快照请求，校验 scope、order、批量与游标字段。 |
| strings | 函数 | 166–176 | 简单 | validation、contract、parsing | 0 | 收敛字符串数组，限制条目数量与单项长度。 |
| stringValue | 函数 | 138–147 | 简单 | validation、contract、parsing | 0 | 把未知输入收敛为受长度约束的字符串。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostRead.ts](hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts | 宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。 |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildZoteroLibrarySnapshotCompletionEvidence | 函数 | 354–405 | 重建快照完成证据：扫描范围、计数与哈希，界定一次快照的 basis。 |
| rebuildZoteroLibrarySnapshotItem | 函数 | 261–352 | 重建单条快照条目：库键、标题、作者、日期、标签与集合归属。 |
| rebuildZoteroLibrarySnapshotPage | 函数 | 407–502 | 重建快照分页结果，校验页元数据、条目数组与结束标记。 |
| rebuildZoteroLibrarySnapshotRequest | 函数 | 226–259 | 重建文献库快照请求，校验 scope、order、批量与游标字段。 |
