# 身份与连接

在信任命令帮助或实时 Host Bridge 结果之前，先阅读本参考。

## 选择唯一安装

优先使用当前工作区附带的本地运行 shim。如果不存在，使用与本 skill 同一发布仓库中打包的 CLI 二进制。不要混用来自不同 Release Set 的 wrapper、二进制、manifest 或 profile。

在连接之前运行 `zotero-bridge surface identity --json`。将 `protocol`、`cliSchema`、`version`、`buildFingerprint` 和 `commandCatalogChecksum` 与发布信封进行对比。应用 `references/control-invariants.md` 中的字段级不匹配策略：SemVer 本身仅供参考；catalog 或 build 不匹配时需用当前 CLI 确认命令；protocol/schema 不匹配仅在无法确认所需命令合约时构成阻断。

## 选择唯一 Profile

如果提供了作用域的 `ZOTERO_BRIDGE_PROFILE`，使用它。否则使用显式的 `ZOTERO_BRIDGE_ENDPOINT` 加 `ZOTERO_BRIDGE_TOKEN`，或已安装的默认 profile。绝不在证据中打印或持久化 bearer token。

本地模式可以返回已验证的本地路径。远程模式返回已注册的文件交付，需要 `file download`；不要将远程路径视为本地可读。

## 按顺序诊断

1. `surface identity` 仅证明嵌入的离线合约。
2. `bridge status` 证明未认证的可达性。
3. `bridge manifest` 证明已认证的协议和 capability。
4. `bridge profile inspect` 显示脱敏后的有效 profile 状态。
5. `bridge profile diagnose` 报告缺失或冲突的 profile 输入。
6. `bridge backend list|status` 诊断已配置的运行时。
7. 仅当这些检查无法解释故障时，才加载诊断命令手册。

不要用文献库读取来诊断 profile 问题，也不要将成功的离线身份调用视为 Zotero 正在运行的证明。
