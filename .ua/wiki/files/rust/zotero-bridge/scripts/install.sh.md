
# rust/zotero-bridge/scripts/install.sh
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/scripts](../../../../modules/rust/zotero-bridge/scripts.md)
<!-- node: file:rust/zotero-bridge/scripts/install.sh -->

POSIX shell 版 Zotero Bridge CLI 安装脚本，提供与 PowerShell 版本一致的目录选择、权限校验、哈希计算与安装摘要输出。
源码：[rust/zotero-bridge/scripts/install.sh](../../../../../../rust/zotero-bridge/scripts/install.sh)

## 符号（2）
<!-- node: function:rust/zotero-bridge/scripts/install.sh:choose_install_dir -->
<!-- node: function:rust/zotero-bridge/scripts/install.sh:well_known_profile_path -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| choose_install_dir | 函数 | 131–152 | 简单 | script、installation、shell、path-resolution | 0 | 在命令行参数、Profile 路径与默认目录之间解析出最终安装目录，并确认目录可写。 |
| well_known_profile_path | 函数 | 154–163 | 简单 | script、installation、shell、path-resolution | 0 | 推导当前平台的 Profile 安装位置（Zotero 宿主 profile 目录），作为安装目录的回退候选。 |
