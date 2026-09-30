# Tasks

## 1. Configuration and frozen facts

- [x] 1.1 白名单来源配置、Exa 默认、显式启用及同配置优先级；领域行为测试证明冻结和保存离线。
- [x] 1.2 增加 web-source 加密凭据隔离；凭据读取和脱敏测试通过。

## 2. Native network boundary

- [x] 2.1 共享 URL/DNS/peer/metadata/redirect/credential 策略并接入 MCP；网络边界测试通过。
- [x] 2.2 原生 anonymous 有界请求、取消和 timeout；真实 Zotero 7/9 受控 canary 证明行为。

## 3. Brokered tools

- [x] 3.1 匿名 HTML/text/JSON extraction 与 UTF-8 限制；行为测试证明内容信任及上限。
- [x] 3.2 三个 curated MCP 与三个 direct raw adapters；fixture 验证工具映射及 normalized DTO。
- [x] 3.3 OpenAI API/Codex 和 Anthropic forced search；fixture 验证实际执行证据、缺失 citations 与身份。
- [x] 3.4 一次 dispatch、fallback 停止条件、逐来源证据；Gateway 测试证明原始响应不入 transcript/receipt。
- [x] 3.5 接入 Conversation 与 preparation 的冻结来源及外部信任指令；既有 Conversation/preparation 测试通过。

## 4. Product UI

- [x] 4.1 内置 Agent 页来源 enable/order/bind/test/approval/billing；现有 UI 行为测试证明 request-bound 状态与独立保存。

## 5. Integration evidence

- [x] 5.1 完成类型、lint、build、Node 相关分片、真实 Zotero core/UI 门禁与 OpenSpec verification；如实记录失败和未完成验证。
- [x] 5.2 更新交接记录、修正 C16 状态并记录 C11 边界与下一步；核对链接有效。
