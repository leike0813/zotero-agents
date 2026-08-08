## Why

正式 Content Package 发布虽然同时覆盖 stable、beta 与 dev，但维护者无法安全地只发布其中一个频道。现有 workflow 会重建整个 `content-feed` 分支，若把单频道构建直接接入将删除未选频道的 feed；各脚本的频道默认值也不足以表达正式发布范围。

## What Changes

- 为正式 Content Package 发布增加必填的 `--channels` 选择器，支持 stable、beta、dev 的任意非空组合。
- 将频道选择从 release CLI 透传至 GitHub Actions，限定构建、GitHub Release assets、feed 更新和发布后验证的范围。
- 用保留未选频道内容的 feed 分支补丁发布替代当前的整分支清空重建，并串行化对该分支的发布。
- 统一显式频道参数的校验与规范化，同时保持直接构建和校验脚本现有的默认集合。

## Capabilities

### New Capabilities

- `content-package-release`: 维护者对 Content Package 频道进行选择、发布、验证和 feed 分支更新的控制面契约。

### Modified Capabilities

- 无。

## Impact

- 影响 `scripts/prepare-content-package-release.ts`、Content Package 构建/校验脚本和 GitHub 发布 workflow。
- 增加可测试的 feed 分支发布脚本与 Node/Mocha 覆盖；不改变插件的订阅运行时、频道语义或 Gitee 同步流程。
