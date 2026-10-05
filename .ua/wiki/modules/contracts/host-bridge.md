
# contracts/host-bridge
> 目录聚合页：3 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [contracts/host-bridge/capabilities.v2.json](../../files/contracts/host-bridge/capabilities.v2.json.md) | 配置 | 0 | Host Bridge v2 能力契约的单一事实源，以 5 万余行 JSON Schema 声明每项 Zotero 宿主能力的输入输出、mutation 语义与 note 详情结构。Rust 侧桥与插件侧校验器都从这份契约派生，保证 MCP/CLI 暴露面与 Zotero 宿主实现不漂移。 |
| [contracts/host-bridge/cli-commands.v2.json](../../files/contracts/host-bridge/cli-commands.v2.json.md) | 配置 | 0 | Host Bridge CLI 命令契约，声明 bridge 命令行暴露的全部命令、参数 schema 与能力映射。预编译 CLI 二进制与插件侧技能包据此生成 agent-facing 指令，保证 CLI 表面与 capability 契约一致。 |
| [contracts/host-bridge/surfaces.json](../../files/contracts/host-bridge/surfaces.json.md) | 配置 | 0 | Host Bridge 面向代理的 surface 清单，列出 MCP、CLI 与插件内置 skill 包三类 surface 及其发布身份。是判断某个能力从哪条代理通道暴露、以及 CLI 发布版本的权威配置。 |

## 子目录
- [schemas](host-bridge/schemas.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/hostBridge/cli](../src/modules/hostBridge/cli.md) | 1 |
| [src/modules/hostBridge/server](../src/modules/hostBridge/server.md) | 1 |
