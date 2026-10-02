
# scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs -->

Host Bridge CLI 预构建新鲜度检查：比对 Cargo 源码构建指纹、已发布 release manifest 与 addon/bin 下各平台二进制 sha256 是否一致。
源码：[scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs](../../../../../scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs)

## 符号（5）
<!-- node: function:scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs:binaryManifestByPlatform -->
<!-- node: function:scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs:checkHostBridgeCliPrebuildFreshness -->
<!-- node: function:scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs:createFailure -->
<!-- node: function:scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs:readSidecarSha256 -->
<!-- node: function:scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs:sha256File -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| binaryManifestByPlatform | 函数 | 35–43 | 简单 | indexing、manifest、host-bridge | 0 | 把 release manifest 的 binaries 列表索引为 platform 映射。 |
| checkHostBridgeCliPrebuildFreshness | 函数 | 54–197 | 中等 | validation、release-gate、host-bridge | 1 | 主流程：计算构建指纹并逐平台核对二进制与 manifest，输出 JSON 诊断。 |
| createFailure | 函数 | 45–52 | 简单 | diagnostics、utility、reporting | 0 | 构造统一结构的失败诊断条目。 |
| readSidecarSha256 | 函数 | 25–33 | 简单 | hashing、validation、filesystem | 0 | 读取并校验二进制旁置的 .sha256 文件内容。 |
| sha256File | 函数 | 19–23 | 简单 | hashing、utility、filesystem | 0 | 计算文件的 sha256 摘要。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-cli-release-governance.mjs](host-bridge-cli-release-governance.mjs.md) | scripts/host-bridge/host-bridge-cli-release-governance.mjs | Host Bridge CLI 发布治理的单一事实源：构建配方读取、Cargo 源码指纹计算、patch/minor 版本提升、release manifest 读写与七平台二进制摘要登记。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prebuild-zotero-bridge-cli.ts](prebuild-zotero-bridge-cli.ts.md) | scripts/host-bridge/prebuild-zotero-bridge-cli.ts | Host Bridge CLI 预构建的 CLI 入口：锁定发布身份并校验源码状态，派发七平台预构建工作流、下载产物并同步回本地预构建树。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkHostBridgeCliPrebuildFreshness | 函数 | 54–197 | 主流程：计算构建指纹并逐平台核对二进制与 manifest，输出 JSON 诊断。 |
