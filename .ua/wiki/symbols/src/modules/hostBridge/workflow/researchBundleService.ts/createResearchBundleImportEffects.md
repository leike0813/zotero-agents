
# createResearchBundleImportEffects
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:createResearchBundleImportEffects -->

构造研究包导入所需的宿主 effects：创建文献、写入附件、建立 parent set 并汇总 mutation 凭证。
类型：函数  
复杂度：复杂  
入边数：1  
标签：导入、effect、broker、mutation-authority  
所属文件：[src/modules/hostBridge/workflow/researchBundleService.ts](../../../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md)
源码：[src/modules/hostBridge/workflow/researchBundleService.ts:1597](../../../../../../../../src/modules/hostBridge/workflow/researchBundleService.ts#L1597)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createResearchBundleImporter](../../../../../../files/src/modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts:2209–2623 | 研究包导入的主用例：校验 portable ref 与产物形态、逐项执行 effects 并输出可回放的导入回执。 |

## 调用

该符号没有记录对外调用。
