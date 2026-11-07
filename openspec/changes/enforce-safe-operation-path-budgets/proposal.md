# Proposal

## Why

MinerU 在 Windows 上写入相邻 Markdown 时，最终路径尚未超限，嵌入论文全名的暂存与原子写入路径却已超过传统路径上限；失败回滚还可能误伤旧输出。仅限制文件名长度无法约束完整操作路径，需要在共享文件系统边界提前拒绝不安全路径，并保护已有文件。

## What Changes

- 在 runtime persistence 统一校验完整绝对路径、目录与路径分量预算，区分 Windows UTF-16 和 POSIX UTF-8 计量。
- 原子写入、目录复制、ZIP 和工作流相邻输出使用独占短暂存目录；预检已知最终、暂存、备份及后代目标。
- 新生成的附件物理主文件名服从完整目标路径的剩余预算，保留扩展名和显示标题；伴随文件路径不静默改名。
- 在原生附件创建/替换前预检 storage 和辅助缓存路径；撤销“删除旧文件再重试写入”的失败恢复方式。
- MinerU、翻译和深读的回滚仅撤销已确认的本次副作用；结果不确定时保留恢复材料。
- **BREAKING**：过去可能交给底层尝试的超预算路径现在提前失败；不更改公共成员名、存储根或历史文件身份。Workflow file 的目录请求增加可选 `exclusive` 标志。

## Capabilities

### New Capabilities

无；复用现有能力边界。

### Modified Capabilities

- `runtime-persistence-governance`：增加完整操作路径预算、独占暂存、目录后代预检与失败保全要求。
- `attachment-file-lifecycle`：扩展物理文件名预算语义，增加原生目标预检和相邻输出回滚所有权要求。

## Impact

- 共享实现：`src/modules/runtimePersistence.ts`、`src/platform/path.ts`、`src/modules/runtimeFileRegistry.ts`。
- Workflow Host：`src/workflows/{file,archive,zipBundleReader,types}.ts`。
- 附件所有权：`src/modules/zoteroHost/{zoteroHostPreparedFiles,zoteroHostNativeMutations}.ts`。
- 工作流包：`workflows_builtin/mineru/hooks/applyResult.mjs`、`workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs`。
- 对应回归用例、生命周期/Host/持久化文档、MinerU README、项目约束及上述两份主规格。
- 不增加依赖，不引入 Windows 长路径绕过，不迁移用户目录，不改变远程请求形状或发布身份。

## Recording Status

本 change 补记用户已批准并实施的路径治理；两份主规格已包含本 change 的 delta。保留当前主规格，不回滚后再重复同步；tasks 区分已验证工作与未完成验收，不自动归档。
