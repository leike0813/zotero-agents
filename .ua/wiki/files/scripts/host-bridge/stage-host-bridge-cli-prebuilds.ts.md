
# scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts -->

Host Bridge CLI 预构建暂存脚本：把本地预构建目录以固定时间戳与权限复制进目标资产树，使 stage 结果字节可复现。
源码：[scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts](../../../../../scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts)

## 符号（3）
<!-- node: function:scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts:main -->
<!-- node: function:scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts:sha256File -->
<!-- node: function:scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts:stageHostBridgeCliPrebuildSet -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 146–152 | 简单 | entry-point、cli、host-bridge | 0 | CLI 入口：解析参数后执行预构建暂存。 |
| sha256File | 函数 | 36–40 | 简单 | hashing、utility、filesystem | 0 | 计算文件 sha256 摘要。 |
| stageHostBridgeCliPrebuildSet | 函数 | 42–144 | 中等 | host-bridge、release、filesystem | 0 | 复制七个平台二进制、校验 sha256 并写入 addon/bin 资产树。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sync-host-bridge-cli-prebuilds.ts](sync-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts | Host Bridge CLI 预构建同步核心：校验 prebuild result 身份、用内置 zlib 解压并核对 zip 条目、原子替换预构建树与两份 manifest，失败时回滚已改动文件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| stageHostBridgeCliPrebuildSet | 函数 | 42–144 | 复制七个平台二进制、校验 sha256 并写入 addon/bin 资产树。 |
