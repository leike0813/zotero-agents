
# scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts -->

Host Bridge CLI 预构建同步核心：校验 prebuild result 身份、用内置 zlib 解压并核对 zip 条目、原子替换预构建树与两份 manifest，失败时回滚已改动文件。
源码：[scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts](../../../../../scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts)

## 符号（13）
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:assertPrebuildResultIdentity -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:clonePrebuildStore -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:extractZipWithNode -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:main -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:readPrebuildResultText -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:replacePrebuilds -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:replacePrebuildsAndManifests -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:rollbackChangedFiles -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:sha256File -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:syncHostBridgeCliPrebuildInternalsForTests -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:syncHostBridgeCliPrebuilds -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:verifyArchiveSet -->
<!-- node: function:scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:verifyPrebuilds -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertPrebuildResultIdentity | 函数 | 188–216 | 简单 | assertion、identity、host-bridge | 0 | 断言 result 的 repo、ref、sourceSha 与 aggregate 身份。 |
| clonePrebuildStore | 函数 | 389–460 | 中等 | git、filesystem、host-bridge | 0 | 从预构建分支克隆 store 到临时工作目录。 |
| extractZipWithNode | 函数 | 218–240 | 简单 | archive、validation、host-bridge | 0 | 用 Node 内置 zlib 解压 zip，并校验目标平台与二进制名。 |
| main | 函数 | 655–698 | 简单 | entry-point、cli、host-bridge | 0 | CLI 入口：解析参数后执行预构建同步。 |
| readPrebuildResultText | 函数 | 119–186 | 中等 | parsing、validation、host-bridge | 0 | 解析并严格校验 prebuild result 的 JSON 文本。 |
| replacePrebuilds | 函数 | 280–297 | 简单 | filesystem、host-bridge、atomicity | 0 | 原子替换预构建目录树。 |
| replacePrebuildsAndManifests | 函数 | 462–557 | 中等 | release、filesystem、manifest | 0 | 替换预构建树并同步仓库与 addon 两侧的 release manifest。 |
| rollbackChangedFiles | 函数 | 306–330 | 简单 | rollback、filesystem、error-handling | 0 | 回滚同步过程中被改动的文件到同步前状态。 |
| sha256File | 函数 | 242–246 | 简单 | hashing、utility、filesystem | 0 | 计算文件 sha256 摘要。 |
| syncHostBridgeCliPrebuildInternalsForTests | 函数 | 700–719 | 简单 | test-seam、host-bridge、exported | 1 | 仅供测试使用的内部 seam，暴露预构建同步的内部步骤以便断言。 |
| syncHostBridgeCliPrebuilds | 函数 | 559–653 | 中等 | host-bridge、release-governance、orchestration | 1 | 主编排：拉取预构建 → 校验身份 → 替换资产树 → 提交变更。 |
| verifyArchiveSet | 函数 | 332–387 | 中等 | validation、archive、host-bridge | 0 | 校验归档集合的 aggregate 与发布身份一致性。 |
| verifyPrebuilds | 函数 | 248–278 | 简单 | validation、host-bridge、filesystem | 0 | 逐平台校验预构建二进制的存在性与 sha256。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-cli-release-governance.mjs](host-bridge-cli-release-governance.mjs.md) | scripts/host-bridge/host-bridge-cli-release-governance.mjs | Host Bridge CLI 发布治理的单一事实源：构建配方读取、Cargo 源码指纹计算、patch/minor 版本提升、release manifest 读写与七平台二进制摘要登记。 |
| [zip-archive.ts](../zip-archive.ts.md) | scripts/zip-archive.ts | 零依赖 zip 归档读取器：直接解析 EOCD 与中央目录，按条目返回压缩方法与解压后尺寸，供 XPI 资产校验使用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prebuild-zotero-bridge-cli.ts](prebuild-zotero-bridge-cli.ts.md) | scripts/host-bridge/prebuild-zotero-bridge-cli.ts | Host Bridge CLI 预构建的 CLI 入口：锁定发布身份并校验源码状态，派发七平台预构建工作流、下载产物并同步回本地预构建树。 |
| [stage-host-bridge-cli-prebuilds.ts](stage-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts | Host Bridge CLI 预构建暂存脚本：把本地预构建目录以固定时间戳与权限复制进目标资产树，使 stage 结果字节可复现。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertPrebuildResultIdentity | 函数 | 188–216 | 断言 result 的 repo、ref、sourceSha 与 aggregate 身份。 |
| readPrebuildResultText | 函数 | 119–186 | 解析并严格校验 prebuild result 的 JSON 文本。 |
| syncHostBridgeCliPrebuildInternalsForTests | 函数 | 700–719 | 仅供测试使用的内部 seam，暴露预构建同步的内部步骤以便断言。 |
| syncHostBridgeCliPrebuilds | 函数 | 559–653 | 主编排：拉取预构建 → 校验身份 → 替换资产树 → 提交变更。 |
