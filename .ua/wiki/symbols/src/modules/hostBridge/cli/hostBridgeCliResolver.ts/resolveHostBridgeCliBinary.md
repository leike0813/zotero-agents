
# resolveHostBridgeCliBinary
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliResolver.ts:resolveHostBridgeCliBinary -->

按候选根目录顺序探测已安装的 CLI 二进制，返回可执行路径、来源与版本诊断。
类型：函数  
复杂度：复杂  
入边数：2  
标签：host-bridge、path-resolution、cli、resolution  
所属文件：[src/modules/hostBridge/cli/hostBridgeCliResolver.ts](../../../../../../files/src/modules/hostBridge/cli/hostBridgeCliResolver.ts.md)
源码：[src/modules/hostBridge/cli/hostBridgeCliResolver.ts:147](../../../../../../../../src/modules/hostBridge/cli/hostBridgeCliResolver.ts#L147)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [materializeHostBridgeCliRunInjection](../../../../../../files/src/modules/hostBridge/cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts:169–294 | 为一次 Agent 运行物化 Host Bridge CLI 注入包：写入 scope/profile/README，并绑定写审批登记与认证令牌。 |
| [installHostBridgeCli](../../../../../../files/src/modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts:506–700 | 执行 CLI 安装：从打包资产读取二进制、校验摘要、设置执行权限，Windows 下额外写 shell shim 与用户 PATH。 |

## 调用

该符号没有记录对外调用。
