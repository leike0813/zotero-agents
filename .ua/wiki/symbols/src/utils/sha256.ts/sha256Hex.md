
# sha256Hex
<!-- node: function:src/utils/sha256.ts:sha256Hex -->

计算字节数组的 SHA-256 并返回小写十六进制摘要。
类型：函数  
复杂度：简单  
入边数：4  
标签：hash、sha256、utility、exported  
所属文件：[src/utils/sha256.ts](../../../../files/src/utils/sha256.ts.md)
源码：[src/utils/sha256.ts:89](../../../../../../src/utils/sha256.ts#L89)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [describeFile](../../../../files/src/modules/zoteroHost/zoteroHostPreparedFiles.ts.md) | src/modules/zoteroHost/zoteroHostPreparedFiles.ts:69–80 | 把一个本地文件描述为相对路径、大小与 sha256 组成的不可变事实。 |
| [assertWrittenMatchesMeasured](../../../../files/src/workflows/archive.ts.md) | src/workflows/archive.ts:500–528 | 校验落盘字节与预期条目事实一致。 |
| [createStoredAttachmentNonResourceSemanticInput](../../../../files/src/workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts:197–219 | 构造忽略资源型字段的附件语义输入，供变更摘要使用。 |
| [createWorkflowPreparedImageScope](../../../../files/src/workflows/workflowNoteImagePreparation.ts.md) | src/workflows/workflowNoteImagePreparation.ts:575–798 | 创建 prepared image 作用域，统一管理 token 到路径的映射与清理。 |

## 调用

该符号没有记录对外调用。
