
# registerHostBridgeExportFile
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:registerHostBridgeExportFile -->

登记导出结果文件为 file handle。
类型：函数  
复杂度：简单  
入边数：2  
标签：导出、文件注册、host-bridge  
所属文件：[src/modules/hostBridge/server/hostBridgeFileRegistry.ts](../../../../../../files/src/modules/hostBridge/server/hostBridgeFileRegistry.ts.md)
源码：[src/modules/hostBridge/server/hostBridgeFileRegistry.ts:328](../../../../../../../../src/modules/hostBridge/server/hostBridgeFileRegistry.ts#L328)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [materializeResearchBundlePapers](../../workflow/researchBundleService.ts/materializeResearchBundlePapers.md) | src/modules/hostBridge/workflow/researchBundleService.ts:456–615 | 将一组论文及其产物、附件写入 bundle 目录，返回产物文件与附件的相对路径清单。 |
| [createSynthesisHostExportDeliveryPort](../../../../../../files/src/modules/synthesis/exportDeliveryAdapter.ts.md) | src/modules/synthesis/exportDeliveryAdapter.ts:51–110 | 构造导出交付 port：把导出条目写入运行时目录、注册 Host Bridge 文件句柄并重建交付结果。 |

## 调用

该符号没有记录对外调用。
