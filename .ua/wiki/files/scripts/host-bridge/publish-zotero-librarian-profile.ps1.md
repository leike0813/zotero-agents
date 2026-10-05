
# scripts/host-bridge/publish-zotero-librarian-profile.ps1
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/publish-zotero-librarian-profile.ps1 -->

把 profiles/hermes/zotero-librarian 下的 Hermes Profile 源连同 addon/bin 的 Host Bridge CLI 二进制发布到独立的 zotero-librarian-profile 仓库：校验 release-set schema 与 profile 版本一致性，生成 manifest.json 后 clone/commit/push。
源码：[scripts/host-bridge/publish-zotero-librarian-profile.ps1](../../../../../scripts/host-bridge/publish-zotero-librarian-profile.ps1)

## 符号（4）
<!-- node: function:scripts/host-bridge/publish-zotero-librarian-profile.ps1:Clear-DirectoryExceptGit -->
<!-- node: function:scripts/host-bridge/publish-zotero-librarian-profile.ps1:Copy-ProfileSource -->
<!-- node: function:scripts/host-bridge/publish-zotero-librarian-profile.ps1:Invoke-DevGit -->
<!-- node: function:scripts/host-bridge/publish-zotero-librarian-profile.ps1:Invoke-ProfileGit -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| Clear-DirectoryExceptGit | 函数 | 48–53 | 简单 | 脚本、文件系统、utility | 0 | 清空目标目录内容但保留 .git 条目，为发布物覆盖做准备。 |
| Copy-ProfileSource | 函数 | 55–62 | 简单 | 脚本、文件系统、复制 | 0 | 将 Hermes Profile 源目录逐项复制到目标 worktree，用于组装发布仓库内容。 |
| Invoke-DevGit | 函数 | 20–26 | 简单 | 脚本、git、utility | 0 | 在主仓目录执行 git 参数数组，非零退出码抛出带完整命令的异常。 |
| Invoke-ProfileGit | 函数 | 28–34 | 简单 | 脚本、git、utility | 0 | 在 Profile 发布 worktree 中执行 git 参数数组并统一抛出失败异常。 |
