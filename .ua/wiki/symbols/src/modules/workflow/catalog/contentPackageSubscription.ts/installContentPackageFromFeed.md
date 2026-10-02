
# installContentPackageFromFeed
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:installContentPackageFromFeed -->

从 feed 安装内容包的主流程：校验兼容性、事务化解包落盘、发布进度并更新安装状态。
类型：函数  
复杂度：复杂  
入边数：1  
标签：安装、事务化、主流程、内容包  
所属文件：[src/modules/workflow/catalog/contentPackageSubscription.ts](../../../../../../files/src/modules/workflow/catalog/contentPackageSubscription.ts.md)
源码：[src/modules/workflow/catalog/contentPackageSubscription.ts:1175](../../../../../../../../src/modules/workflow/catalog/contentPackageSubscription.ts#L1175)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [installOfficialWorkflowPackageWithProgress](../../../../../../files/src/hooks.ts.md) | src/hooks.ts:437–465 | 在进度 toast 反馈下安装官方内置工作流包，失败时保留错误码与阶段信息。 |

## 调用

该符号没有记录对外调用。
