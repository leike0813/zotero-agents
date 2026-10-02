
# readCandidateXpi
<!-- node: function:scripts/system-e2e/acceptance.ts:readCandidateXpi -->

读取候选 XPI 内的 manifest 与关键资产，缺失或版本不符即判定候选无效。
类型：函数  
复杂度：复杂  
入边数：1  
标签：读取、产物校验、zip  
所属文件：[scripts/system-e2e/acceptance.ts](../../../../files/scripts/system-e2e/acceptance.ts.md)
源码：[scripts/system-e2e/acceptance.ts:27](../../../../../../scripts/system-e2e/acceptance.ts#L27)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [checkSynthesisSidecarRuntimeXpi](../../../../files/scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts.md) | scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts:33–77 | 读取候选 XPI 条目并逐目标核对其中携带的 sidecar bundle。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readZipArchiveEntries](../../zip-archive.ts/readZipArchiveEntries.md) | scripts/zip-archive.ts:38–125 | 读取 zip 中央目录，返回规范化后的条目列表与归档整体元信息。 |
