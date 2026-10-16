# Proposal

## Why

Content Package 的 dev 调试发布与 stable/beta 共用版本计数，频繁开发迭代会消耗正式版本号。插件构建预检尚不核对已发布内容，实机测试可能运行旧工作流或旧 Skill，造成源码与业务行为错位。

## What Changes

- stable/beta 继续使用正式 `version`；dev 使用独立的 `dev_version` 和 `X.Y.Z-dev.N` 计数，开发迭代不修改正式版本。
- bump、构包、发布标签与校验统一按频道解析版本；保留发布频道隔离、不可变资产及订阅端既有 SemVer 升级/回退语义。
- build-preflight 在生成内容同步后核对当前工作区与 GitHub 已发布包：main 检查 stable/beta，所有以 dev 开头的分支检查 dev。
- 复用发布校验器，分别固定每个远端频道自己的 revision/时间戳，校验本地重建内容和远端 ZIP/checksum；内容漂移或无法取证时阻止 build 并报告修复步骤。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `content-package-release`：独立开发版本序列，以及按分支选择频道的构建 freshness 检查。

## Impact

涉及 content-package 版本描述符、版本解析/bump、feed 构建和校验脚本、发布 workflow、build-preflight 与发布协调技能及现有 tooling 测试。更新项目约束和发布操作文档。不增加依赖，不修改插件安装状态格式，不执行提交、推送或远端发布。
