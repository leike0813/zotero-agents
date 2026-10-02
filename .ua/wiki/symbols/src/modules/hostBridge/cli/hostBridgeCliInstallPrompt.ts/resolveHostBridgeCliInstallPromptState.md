
# resolveHostBridgeCliInstallPromptState
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts:resolveHostBridgeCliInstallPromptState -->

探测当前 CLI 安装状态与内置版本差异，决定是否需要向用户提示安装或升级。
类型：函数  
复杂度：复杂  
入边数：1  
标签：host-bridge、installer、detection、version  
所属文件：[src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts](../../../../../../files/src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md)
源码：[src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts:243](../../../../../../../../src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts#L243)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [promptHostBridgeCliInstallOnStartup](../../../../../../files/src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts:346–398 | 在插件启动流程中触发 CLI 安装提示：去重、限时等待用户选择，并把结果回报给调用方。 |

## 调用

该符号没有记录对外调用。
