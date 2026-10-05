
# publishDirectResearchBundle
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:publishDirectResearchBundle -->

发布直连研究包：物化目录、生成索引清单、注册 Host Bridge 文件句柄并返回下载描述符。
类型：函数  
复杂度：复杂  
入边数：1  
标签：物化、导出交付、文件注册、研究包  
所属文件：[src/modules/hostBridge/workflow/researchBundleService.ts](../../../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md)
源码：[src/modules/hostBridge/workflow/researchBundleService.ts:839](../../../../../../../../src/modules/hostBridge/workflow/researchBundleService.ts#L839)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createDirectResearchBundleApplication](../../../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts:1158–1391 | 构造直连研究包的应用层用例：解析 selector、装配依赖并把请求编排为发布流程。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [materializeResearchBundlePapers](materializeResearchBundlePapers.md) | src/modules/hostBridge/workflow/researchBundleService.ts:456–615 | 将一组论文及其产物、附件写入 bundle 目录，返回产物文件与附件的相对路径清单。 |
