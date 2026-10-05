
# createWorkflowArchiveApi
<!-- node: function:src/workflows/archive.ts:createWorkflowArchiveApi -->

创建工作流归档 API，绑定限额、持久化适配器与运行时探测。
类型：函数  
复杂度：中等  
入边数：2  
标签：factory、archive、api、exported  
所属文件：[src/workflows/archive.ts](../../../../files/src/workflows/archive.ts.md)
源码：[src/workflows/archive.ts:682](../../../../../../src/workflows/archive.ts#L682)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createResearchBundleMaterializer](../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts:617–660 | 注入文件系统依赖后构造研究包物化器，屏蔽运行时 adapter 差异。 |
| [createWorkflowHostApi](../hostApi.ts/createWorkflowHostApi.md) | src/workflows/hostApi.ts:98–685 | 装配并返回 Workflow Host API v12 实例，版本与各 owner 一并校验。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createStoreZipBytes](../../../../files/src/modules/zipStore.ts.md) | src/modules/zipStore.ts:84–159 | 把一组文本或字节条目打包为完整的 ZIP 字节流，含本地文件头、中央目录与 EOCD。 |
