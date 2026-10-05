
# scripts/host-bridge/publish-zotero-library-agent-bundle.ps1
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/publish-zotero-library-agent-bundle.ps1 -->

把 zotero-library-agent skill、zotero-bridge-cli wrapper skill、evidence bundle schema、helper 脚本与 Host Bridge CLI 二进制组装成 zotero-library-agent-bundle 发布仓库，校验 cli-release.json 摘要后生成 manifest 并推送。
源码：[scripts/host-bridge/publish-zotero-library-agent-bundle.ps1](../../../../../scripts/host-bridge/publish-zotero-library-agent-bundle.ps1)

## 符号（3）
<!-- node: function:scripts/host-bridge/publish-zotero-library-agent-bundle.ps1:Clear-DirectoryExceptGit -->
<!-- node: function:scripts/host-bridge/publish-zotero-library-agent-bundle.ps1:Copy-DirectoryContents -->
<!-- node: function:scripts/host-bridge/publish-zotero-library-agent-bundle.ps1:Invoke-BundleGit -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| Clear-DirectoryExceptGit | 函数 | 53–58 | 简单 | 脚本、文件系统、utility | 0 | 删除目标目录中除 .git 外的全部内容，为 bundle 物化腾出干净工作区。 |
| Copy-DirectoryContents | 函数 | 45–51 | 简单 | 脚本、文件系统、复制 | 0 | 逐项复制源目录内容到目标目录（自动创建目标），用于搬运 skill 目录树。 |
| Invoke-BundleGit | 函数 | 25–31 | 简单 | 脚本、git、utility | 0 | 在 bundle 发布 worktree 中执行 git 参数数组，失败时抛出含命令的异常。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [publish-zotero-librarian-profile.ps1](publish-zotero-librarian-profile.ps1.md) | scripts/host-bridge/publish-zotero-librarian-profile.ps1 | 把 profiles/hermes/zotero-librarian 下的 Hermes Profile 源连同 addon/bin 的 Host Bridge CLI 二进制发布到独立的 zotero-librarian-profile 仓库：校验 release-set schema 与 profile 版本一致性，生成 manifest.json 后 clone/commit/push。 |
