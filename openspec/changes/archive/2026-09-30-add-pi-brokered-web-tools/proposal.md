# Proposal

## Why

Pi Conversation 已完成 C16，但生产工具目录尚缺网络搜索与网页读取。落实 #26 已接受的 W4 C11，补齐可授权、可追溯的网络工具。

## What Changes

- 增加单一 `web_search {query,maxResults?}` 和匿名 `web_fetch {url}`，经现有 Gateway 执行。
- 保存八种显式有序来源，仅默认启用 Exa；冻结来源及模型/凭据身份，同配置原生搜索获得本轮优先级。
- 共享 MCP 与 Web 的地址策略和 Zotero 原生传输；有界读取、重定向、取消和失败脱敏。
- Backend Manager 内置 Agent 页管理来源、排序、凭据、审批和主动测试。

## Capabilities

### New Capabilities

- `pi-brokered-web-tools`: 受控搜索链、匿名读取、来源回执及不可信内容投影。

### Modified Capabilities

- `pi-tool-gateway-policy`: 冻结隐藏 Web 来源身份与逐来源持久证据。
- `pi-turn-preparation`: 冻结搜索事实及外部内容信任指令。
- `pi-mcp-tool-sources`: Web/MCP 共用地址与传输策略及 curated search 描述符。
- `builtin-pi-provider-configuration`: Web 专用加密命名空间及官方原生搜索引用。
- `pi-openai-codex-auth`: 官方搜索复用短时认证。
- `backend-manager-ui`: 来源管理与请求关联测试。

## Impact

新增 `piOutboundNetworkPolicy.ts`、`piBrokeredWebHttp.ts`、`piBrokeredWebTools.ts` 与共享 DTO；窄改 MCP、凭据、turn preparation、Conversation、Backend Manager 和 prefs。更新交接与验证记录；不新增依赖。
