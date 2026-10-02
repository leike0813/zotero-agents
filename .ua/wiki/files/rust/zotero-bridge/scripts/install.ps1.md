
# rust/zotero-bridge/scripts/install.ps1
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/scripts](../../../../modules/rust/zotero-bridge/scripts.md)
<!-- node: file:rust/zotero-bridge/scripts/install.ps1 -->

Windows 侧的 Zotero Bridge CLI 安装脚本，负责挑选 Profile 路径、校验写权限、复制预编译二进制并写入安装 receipt。
源码：[rust/zotero-bridge/scripts/install.ps1](../../../../../../rust/zotero-bridge/scripts/install.ps1)

## 符号（5）
<!-- node: function:rust/zotero-bridge/scripts/install.ps1:Add-WindowsUserPath -->
<!-- node: function:rust/zotero-bridge/scripts/install.ps1:Get-DefaultInstallDir -->
<!-- node: function:rust/zotero-bridge/scripts/install.ps1:Get-WellKnownProfilePath -->
<!-- node: function:rust/zotero-bridge/scripts/install.ps1:Parse-Args -->
<!-- node: function:rust/zotero-bridge/scripts/install.ps1:Resolve-Platform -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| Add-WindowsUserPath | 函数 | 151–162 | 简单 | script、powershell、windows、environment | 0 | 把安装目录追加到 Windows 用户级 PATH 环境变量并持久化，避免用户手工配置。 |
| Get-DefaultInstallDir | 函数 | 101–128 | 中等 | script、powershell、installation、path-resolution | 0 | 按平台给出 CLI 二进制的默认安装目录，未显式指定安装位置时作为兜底。 |
| Get-WellKnownProfilePath | 函数 | 129–141 | 简单 | script、powershell、installation、profile | 0 | 返回当前平台下宿主 Profile 的常用安装路径，用于优先复用既有安装位置。 |
| Parse-Args | 函数 | 19–80 | 中等 | script、powershell、cli、parsing | 0 | 解析安装脚本的命令行参数，生成包含平台、安装目录与静默模式的选项对象。 |
| Resolve-Platform | 函数 | 81–94 | 简单 | script、powershell、platform、cross-compilation | 0 | 根据显式参数或当前系统架构推导目标平台标识，映射到七个受支持的目标之一。 |
