
# src/modules/hostBridge/cli
> 目录聚合页：7 个文件、24 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/hostBridge/cli/hostBridgeCliInjection.ts](../../../../files/src/modules/hostBridge/cli/hostBridgeCliInjection.ts.md) | 文件 | 2 | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [src/modules/hostBridge/cli/hostBridgeCliInstaller.ts](../../../../files/src/modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | 文件 | 3 | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts](../../../../files/src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | 文件 | 3 | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [src/modules/hostBridge/cli/hostBridgeCliResolver.ts](../../../../files/src/modules/hostBridge/cli/hostBridgeCliResolver.ts.md) | 文件 | 2 | 解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。 |
| [src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts](../../../../files/src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | 文件 | 2 | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [src/modules/hostBridge/cli/hostBridgeProfileStore.ts](../../../../files/src/modules/hostBridge/cli/hostBridgeProfileStore.ts.md) | 文件 | 5 | Host Bridge CLI 的 well-known profile 存储：按平台解析 profile 根目录，并把连接所需的 token、端口与主机信息写成 Agent 可发现的 profile 文件。 |
| [src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts](../../../../files/src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts.md) | 文件 | 7 | 为 SkillRunner 后端推导 Host Bridge 运行环境：判定后端连接本地还是远程，据此拼装代理侧连接 Host Bridge 所需的环境变量。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 10 |
| [src/platform](../../platform.md) | 9 |
| [src/modules/hostBridge/server](server.md) | 8 |
| [src/utils](../../utils.md) | 7 |
| [contracts/host-bridge](../../../contracts/host-bridge.md) | 1 |
| [src/backends](../../backends.md) | 1 |
| [src/modules/hostBridge/permissions](permissions.md) | 1 |
| [src/shared](../../shared.md) | 1 |
