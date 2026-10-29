# Tasks

## 1. 独立频道版本

- [x] 1.1 在现有脚本公开 seam 先写失败测试，实现共享频道版本解析、dev patch 计数和单频道 bump/release 参数；验证正式版本与 dev 版本互不修改、无效版本不落盘。
- [x] 1.2 接入 builder 与发布 workflow，增加 descriptor 的 dev_version；用真实 builder CLI 的临时 fixture 验证三频道 feed、ZIP manifest、文件名与发布 URL 的版本一致，并更新发布协调技能命令。

## 2. 内容 freshness

- [x] 2.1 先写分支范围与频道独立发布身份的失败测试，给现有 checker 接入 --current-branch、频道版本及逐频道重建；验证 main/dev*、未知分支、独立 metadata、内容漂移和资产失败。
- [x] 2.2 在 build-preflight 同步后加入内容包检查、状态/恢复与实机安装要求，更新 AGENTS.md；人工核对普通 build 不授予发布权限、失败会阻止 build。

## 3. 集成验收

- [x] 3.1 运行相关 tooling 测试、TypeScript/ESLint/格式与 OpenSpec strict 校验，记录通过证据；调用真实 --current-branch 检查并如实记录待发布阻塞，不执行发布或插件 build。
