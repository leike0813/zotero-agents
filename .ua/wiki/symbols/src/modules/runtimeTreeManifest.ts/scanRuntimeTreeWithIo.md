
# scanRuntimeTreeWithIo
<!-- node: function:src/modules/runtimeTreeManifest.ts:scanRuntimeTreeWithIo -->

通过注入的 IO 回调扫描目录树并生成 manifest：记录文件大小、摘要与可比较的结构化警告。
类型：函数  
复杂度：复杂  
入边数：1  
标签：persistence、manifest、tree、injection  
所属文件：[src/modules/runtimeTreeManifest.ts](../../../../files/src/modules/runtimeTreeManifest.ts.md)
源码：[src/modules/runtimeTreeManifest.ts:173](../../../../../../src/modules/runtimeTreeManifest.ts#L173)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [scanRuntimeTree](../../../../files/src/modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts:1788–1821 | 扫描受管目录树并委托 runtimeTreeManifest 生成 manifest，是文件资产比对的上层入口。 |

## 调用

该符号没有记录对外调用。
