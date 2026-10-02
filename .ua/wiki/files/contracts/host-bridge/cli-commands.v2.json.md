
# contracts/host-bridge/cli-commands.v2.json
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[contracts/host-bridge](../../../modules/contracts/host-bridge.md)
<!-- node: config:contracts/host-bridge/cli-commands.v2.json -->

Host Bridge CLI 命令契约，声明 bridge 命令行暴露的全部命令、参数 schema 与能力映射。预编译 CLI 二进制与插件侧技能包据此生成 agent-facing 指令，保证 CLI 表面与 capability 契约一致。
源码：[contracts/host-bridge/cli-commands.v2.json](../../../../../contracts/host-bridge/cli-commands.v2.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [surfaces.json](surfaces.json.md) | contracts/host-bridge/surfaces.json | Host Bridge 面向代理的 surface 清单，列出 MCP、CLI 与插件内置 skill 包三类 surface 及其发布身份。是判断某个能力从哪条代理通道暴露、以及 CLI 发布版本的权威配置。 |
