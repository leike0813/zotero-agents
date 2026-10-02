
# scripts/host-bridge/publish-host-bridge-cli-bundle.ps1
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/publish-host-bridge-cli-bundle.ps1 -->

把 addon/bin 下预编译的 Host Bridge CLI 二进制连同 zotero-bridge-cli wrapper skill 物化到一条隔离 git 分支：校验每个平台的 sha256 与 release-set 身份，在临时 worktree 里组装 manifest.json 后提交，并可选推送到远端。
源码：[scripts/host-bridge/publish-host-bridge-cli-bundle.ps1](../../../../../scripts/host-bridge/publish-host-bridge-cli-bundle.ps1)

## 符号（6）
<!-- node: function:scripts/host-bridge/publish-host-bridge-cli-bundle.ps1:Fetch-PublishBranch -->
<!-- node: function:scripts/host-bridge/publish-host-bridge-cli-bundle.ps1:Get-BinaryNameForPlatform -->
<!-- node: function:scripts/host-bridge/publish-host-bridge-cli-bundle.ps1:Need-Command -->
<!-- node: function:scripts/host-bridge/publish-host-bridge-cli-bundle.ps1:Read-Sha256File -->
<!-- node: function:scripts/host-bridge/publish-host-bridge-cli-bundle.ps1:Test-LocalBranch -->
<!-- node: function:scripts/host-bridge/publish-host-bridge-cli-bundle.ps1:Test-RemoteBranch -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| Fetch-PublishBranch | 函数 | 87–98 | 中等 | 脚本、git、发布分支 | 0 | 将远端发布分支强制抓取到 refs/remotes/<remote>/<branch>，失败即终止；返回 remote-tracking ref 供后续作为 worktree 基点。 |
| Get-BinaryNameForPlatform | 函数 | 64–70 | 简单 | 脚本、跨平台、utility | 0 | 按平台目录名推导 zotero-bridge 可执行文件名，win32-* 使用 .exe 后缀，其余平台无后缀。 |
| Need-Command | 函数 | 34–39 | 简单 | 脚本、前置校验、错误处理 | 0 | 检查外部命令（git、node）是否在 PATH 中，缺失时以红色日志直接终止脚本。 |
| Read-Sha256File | 函数 | 55–62 | 简单 | 脚本、校验和、utility | 0 | 读取 .sha256 校验文件的首个空白分隔字段并归一化为小写十六进制，文件不存在时返回空串。 |
| Test-LocalBranch | 函数 | 72–76 | 简单 | 脚本、git、分支探测 | 0 | 通过 git show-ref 判断本地是否存在指定分支。 |
| Test-RemoteBranch | 函数 | 78–85 | 简单 | 脚本、git、分支探测 | 0 | 用 git ls-remote 判断远端是否已有发布分支，输出为空视为分支不存在。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [publish-zotero-library-agent-bundle.ps1](publish-zotero-library-agent-bundle.ps1.md) | scripts/host-bridge/publish-zotero-library-agent-bundle.ps1 | 把 zotero-library-agent skill、zotero-bridge-cli wrapper skill、evidence bundle schema、helper 脚本与 Host Bridge CLI 二进制组装成 zotero-library-agent-bundle 发布仓库，校验 cli-release.json 摘要后生成 manifest 并推送。 |
