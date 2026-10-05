
# parseWorkflowPackageManifestFromText
<!-- node: function:src/workflows/loaderContracts.ts:parseWorkflowPackageManifestFromText -->

解析并校验工作流包 manifest 文本，含官方内容声明与默认配置。
类型：函数  
复杂度：复杂  
入边数：1  
标签：parsing、validation、contract  
所属文件：[src/workflows/loaderContracts.ts](../../../../files/src/workflows/loaderContracts.ts.md)
源码：[src/workflows/loaderContracts.ts:477](../../../../../../src/workflows/loaderContracts.ts#L477)

## 被调用

没有节点记录了对它的调用。

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [getWorkflowPackageManifestValidator](../../../../files/src/workflows/loaderContracts.ts.md) | src/workflows/loaderContracts.ts:83–95 | 惰性构建并缓存工作流包 manifest 的 Ajv 校验函数。 |
