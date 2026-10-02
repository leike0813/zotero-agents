
# scripts/host-bridge/prebuild-zotero-bridge-cli.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/prebuild-zotero-bridge-cli.ts -->

Host Bridge CLI 预构建的 CLI 入口：锁定发布身份并校验源码状态，派发七平台预构建工作流、下载产物并同步回本地预构建树。
源码：[scripts/host-bridge/prebuild-zotero-bridge-cli.ts](../../../../../scripts/host-bridge/prebuild-zotero-bridge-cli.ts)

## 符号（7）
<!-- node: function:scripts/host-bridge/prebuild-zotero-bridge-cli.ts:assertLockedHostBridgeCliIdentity -->
<!-- node: function:scripts/host-bridge/prebuild-zotero-bridge-cli.ts:assertPrebuildSourceState -->
<!-- node: function:scripts/host-bridge/prebuild-zotero-bridge-cli.ts:main -->
<!-- node: function:scripts/host-bridge/prebuild-zotero-bridge-cli.ts:parsePrebuildCliArgs -->
<!-- node: function:scripts/host-bridge/prebuild-zotero-bridge-cli.ts:prebuildZoteroBridgeCli -->
<!-- node: function:scripts/host-bridge/prebuild-zotero-bridge-cli.ts:requestIdFromRunTitle -->
<!-- node: function:scripts/host-bridge/prebuild-zotero-bridge-cli.ts:requireFullSha -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertLockedHostBridgeCliIdentity | 函数 | 82–96 | 简单 | assertion、identity、release-gate | 0 | 断言请求的 ref 与 sourceSha 同当前发布身份一致。 |
| assertPrebuildSourceState | 函数 | 98–198 | 中等 | assertion、validation、release-gate | 0 | 校验工作区干净、版本未漂移等预构建前置状态。 |
| main | 函数 | 348–371 | 简单 | entry-point、cli、host-bridge | 0 | CLI 入口：解析参数后调用预构建主编排。 |
| parsePrebuildCliArgs | 函数 | 32–72 | 简单 | cli、parsing、host-bridge | 0 | 解析预构建 CLI 的参数与默认值。 |
| prebuildZoteroBridgeCli | 函数 | 212–346 | 中等 | host-bridge、orchestration、entry-point | 0 | 主编排：状态校验 → 派发 → 观察 → 下载产物 → 同步预构建。 |
| requestIdFromRunTitle | 函数 | 200–210 | 简单 | parsing、github、utility | 0 | 从 workflow run 标题反解出 request id。 |
| requireFullSha | 函数 | 74–80 | 简单 | validation、git、assertion | 0 | 断言参数为完整的 40 位提交 sha。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-host-bridge-cli-prebuild-freshness.mjs](check-host-bridge-cli-prebuild-freshness.mjs.md) | scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs | Host Bridge CLI 预构建新鲜度检查：比对 Cargo 源码构建指纹、已发布 release manifest 与 addon/bin 下各平台二进制 sha256 是否一致。 |
| [github-workflow-run.ts](../github-workflow-run.ts.md) | scripts/github-workflow-run.ts | GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。 |
| [host-bridge-cli-release-governance.mjs](host-bridge-cli-release-governance.mjs.md) | scripts/host-bridge/host-bridge-cli-release-governance.mjs | Host Bridge CLI 发布治理的单一事实源：构建配方读取、Cargo 源码指纹计算、patch/minor 版本提升、release manifest 读写与七平台二进制摘要登记。 |
| [sync-host-bridge-cli-prebuilds.ts](sync-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts | Host Bridge CLI 预构建同步核心：校验 prebuild result 身份、用内置 zlib 解压并核对 zip 条目、原子替换预构建树与两份 manifest，失败时回滚已改动文件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertLockedHostBridgeCliIdentity | 函数 | 82–96 | 断言请求的 ref 与 sourceSha 同当前发布身份一致。 |
| assertPrebuildSourceState | 函数 | 98–198 | 校验工作区干净、版本未漂移等预构建前置状态。 |
| parsePrebuildCliArgs | 函数 | 32–72 | 解析预构建 CLI 的参数与默认值。 |
| prebuildZoteroBridgeCli | 函数 | 212–346 | 主编排：状态校验 → 派发 → 观察 → 下载产物 → 同步预构建。 |
