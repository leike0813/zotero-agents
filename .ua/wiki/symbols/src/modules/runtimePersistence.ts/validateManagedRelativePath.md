
# validateManagedRelativePath
<!-- node: function:src/modules/runtimePersistence.ts:validateManagedRelativePath -->

managed 相对路径的唯一校验实现：拒绝逃逸、拒绝绝对路径与危险片段，是所有受管落盘写操作的守门人。
类型：函数  
复杂度：复杂  
入边数：2  
标签：persistence、validation、security、path-policy  
所属文件：[src/modules/runtimePersistence.ts](../../../../files/src/modules/runtimePersistence.ts.md)
源码：[src/modules/runtimePersistence.ts:217](../../../../../../src/modules/runtimePersistence.ts#L217)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [copyRuntimeTree](../../../../files/src/modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts:1946–2005 | 复制受管目录树，串行化到独占 copy slot 避免并发物化互相覆盖。 |
| [removeRuntimePath](../../../../files/src/modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts:1848–1916 | 递归删除受管路径，先做策略校验再按平台执行，删除失败时保留可诊断原因。 |

## 调用

该符号没有记录对外调用。
