
# readPackagedBinaryAsset
<!-- node: function:src/modules/packagedAssetResolver.ts:readPackagedBinaryAsset -->

读取打包二进制资产：依次尝试 fetch 与 XHR 回退路径，并附上每次失败的原因用于诊断。
类型：函数  
复杂度：复杂  
入边数：3  
标签：packaged-asset、file-io、binary、fallback  
所属文件：[src/modules/packagedAssetResolver.ts](../../../../files/src/modules/packagedAssetResolver.ts.md)
源码：[src/modules/packagedAssetResolver.ts:287](../../../../../../src/modules/packagedAssetResolver.ts#L287)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readBundledInstallSource](../../../../files/src/modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts:434–469 | 从插件打包资产中读取待安装的 CLI 二进制，失败时返回带诊断的错误对象。 |
| [materializeHostBridgePluginSkillBundle](../../../../files/src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts:230–364 | 把 Host Bridge agent skill 包物化到插件目录：以 surfaces 契约为事实源生成内容，用 SHA-256 身份判断是否需要重写。 |
| [copyPackagedBinaryAsset](../../../../files/src/modules/packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts:332–349 | 把打包二进制资产复制到运行时目录，读取失败时保留完整诊断链。 |

## 调用

该符号没有记录对外调用。
