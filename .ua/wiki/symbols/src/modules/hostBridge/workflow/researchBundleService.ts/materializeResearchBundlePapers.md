
# materializeResearchBundlePapers
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:materializeResearchBundlePapers -->

将一组论文及其产物、附件写入 bundle 目录，返回产物文件与附件的相对路径清单。
类型：函数  
复杂度：复杂  
入边数：2  
标签：物化、文件写入、研究包、产物导出  
所属文件：[src/modules/hostBridge/workflow/researchBundleService.ts](../../../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md)
源码：[src/modules/hostBridge/workflow/researchBundleService.ts:456](../../../../../../../../src/modules/hostBridge/workflow/researchBundleService.ts#L456)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createResearchBundleMaterializer](../../../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts:617–660 | 注入文件系统依赖后构造研究包物化器，屏蔽运行时 adapter 差异。 |
| [publishDirectResearchBundle](publishDirectResearchBundle.md) | src/modules/hostBridge/workflow/researchBundleService.ts:839–1033 | 发布直连研究包：物化目录、生成索引清单、注册 Host Bridge 文件句柄并返回下载描述符。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [registerHostBridgeExportFile](../../server/hostBridgeFileRegistry.ts/registerHostBridgeExportFile.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts:328–335 | 登记导出结果文件为 file handle。 |
