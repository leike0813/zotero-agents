
# scripts/zip-archive.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/zip-archive.ts -->

零依赖 zip 归档读取器：直接解析 EOCD 与中央目录，按条目返回压缩方法与解压后尺寸，供 XPI 资产校验使用。
源码：[scripts/zip-archive.ts](../../../../scripts/zip-archive.ts)

## 符号（2）
<!-- node: function:scripts/zip-archive.ts:normalizeEntryName -->
<!-- node: function:scripts/zip-archive.ts:readZipArchiveEntries -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeEntryName | 函数 | 26–36 | 简单 | validation、路径归一、安全 | 0 | 归一化归档条目名，拒绝绝对路径与 `..` 穿越等不安全条目。 |
| [readZipArchiveEntries](../../symbols/scripts/zip-archive.ts/readZipArchiveEntries.md) | 函数 | 38–125 | 中等 | zip、解析、入口 | 3 | 读取 zip 中央目录，返回规范化后的条目列表与归档整体元信息。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](system-e2e/acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [check-plugin-host-bridge-assets.ts](host-bridge/check-plugin-host-bridge-assets.ts.md) | scripts/host-bridge/check-plugin-host-bridge-assets.ts | 插件 Host Bridge 资产校验：核对 zotero-bridge-release.json、七平台原生二进制、skill bundle zip 的 manifest、路径安全与 digest 是否一致。 |
| [sync-host-bridge-cli-prebuilds.ts](host-bridge/sync-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts | Host Bridge CLI 预构建同步核心：校验 prebuild result 身份、用内置 zlib 解压并核对 zip 条目、原子替换预构建树与两份 manifest，失败时回滚已改动文件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [readZipArchiveEntries](../../symbols/scripts/zip-archive.ts/readZipArchiveEntries.md) | 函数 | 38–125 | 读取 zip 中央目录，返回规范化后的条目列表与归档整体元信息。 |
