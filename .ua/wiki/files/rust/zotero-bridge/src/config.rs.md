
# rust/zotero-bridge/src/config.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/config.rs -->

Bridge 配置与 profile 解析：加载 CLI 配置、要求访问 token、定位 profile 文件（显式路径或 well-known 路径），并归一化 endpoint 与连接模式。
源码：[rust/zotero-bridge/src/config.rs](../../../../../../rust/zotero-bridge/src/config.rs)

## 符号（5）
<!-- node: class:rust/zotero-bridge/src/config.rs:BridgeConfig -->
<!-- node: function:rust/zotero-bridge/src/config.rs:load -->
<!-- node: function:rust/zotero-bridge/src/config.rs:load_profile -->
<!-- node: function:rust/zotero-bridge/src/config.rs:normalize_endpoint -->
<!-- node: function:rust/zotero-bridge/src/config.rs:well_known_profile_path -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| BridgeConfig | 类 | 12–18 | 简单 | config、type-definition、认证 | 0 | Bridge 运行时配置聚合体：endpoint、token、scope、connection mode 与 operation id。 |
| load | 函数 | 39–116 | 复杂 | config、优先级合并、环境变量 | 0 | 按 CLI 参数、环境变量、profile 文件的优先级装配 BridgeConfig，缺失 endpoint 时报 config_missing_endpoint。 |
| load_profile | 函数 | 170–193 | 简单 | config、反序列化、容错 | 0 | 读取并反序列化 profile JSON，文件缺失时静默返回 None 而非报错。 |
| normalize_endpoint | 函数 | 195–210 | 简单 | utility、归一化、endpoint | 0 | 归一化 endpoint 字符串，剥除末尾斜杠等噪声，保证后续 URL 拼接稳定。 |
| well_known_profile_path | 函数 | 139–168 | 简单 | config、路径解析、profile | 0 | 在用户配置目录与 Zotero 数据目录下推导 well-known profile 文件位置。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| BridgeConfig | 类 | 12–18 | Bridge 运行时配置聚合体：endpoint、token、scope、connection mode 与 operation id。 |
| load | 函数 | 39–116 | 按 CLI 参数、环境变量、profile 文件的优先级装配 BridgeConfig，缺失 endpoint 时报 config_missing_endpoint。 |
| load_profile | 函数 | 170–193 | 读取并反序列化 profile JSON，文件缺失时静默返回 None 而非报错。 |
| normalize_endpoint | 函数 | 195–210 | 归一化 endpoint 字符串，剥除末尾斜杠等噪声，保证后续 URL 拼接稳定。 |
| well_known_profile_path | 函数 | 139–168 | 在用户配置目录与 Zotero 数据目录下推导 well-known profile 文件位置。 |
