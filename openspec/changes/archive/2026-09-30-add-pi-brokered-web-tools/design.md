# Design

## Context

C03/C05/C06/C07/C10/C16 已归档。当前生产 caller 是 `piConversation.ts`，而 #26 中的若干文件路径是旧布局；以源码位置接线。计划依据 [C11 accepted plan](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5535111609)。

## Goals / Non-Goals

三个生产模块各持有地址策略、原生传输、领域工具。复用现有 Gateway、凭据和官方 MCP SDK，闭合八种来源，不建立 provider factory 或缓存。实时付费来源 smoke 属于 C20；本次只用受控 fixture 与真实宿主。

## Decisions

- 用户于 2026-09-30 明确将 DeepSeek 来源替换为 [Anthropic 官方搜索](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)：固定 `https://api.anthropic.com/v1/messages`，绑定已有 Anthropic API-key 配置，使用 `web_search_20250305` 与强制工具选择，要求匹配的 server_tool_use 和成功 web_search_tool_result；未实际搜索不得报告成功。使用基础搜索版本，不启用服务器代码执行。

- 网络 SSOT 分类全部 DNS 地址、元数据与每次重定向。原生 anonymous channel 隔离 cookies/referrer/cache，在正文读取前检查 peer；无法获得证据则关闭能力。
- 原生 channel 使用 `nsIChannelEventSink` veto 阻止自动 replacement；`redirectMode` 只是 Fetch 元数据，不能承担策略门禁。MCP SDK 复用 C10 的流对象准备和延迟加载入口。Codex 凭据 CAS 与身份保留分开：仅同账号认证刷新保留身份，重新登录形成新身份。
- 来源 JSON 仅保存白名单字段与 opaque credential/configuration ID。`web-source` 密钥单独加密。原生搜索只引用已启用官方配置；不接受 custom endpoint 冒充。
- source chain 在 owner 创建 turn 时冻结，续调用保持相同事实。每个来源只 dispatch 一次；unavailable/known failure/no results 可以前进，cancel/policy/contract/unknown 停止。
- MCP 执行前发现所选描述符，以 C10 的 name/description/inputSchema 摘要口径校验冻结审阅；Exa 默认摘要来自 2026-09-30 官方 hosted tools/list（含必填 objective）。主动测试只返回可批准的摘要，不发搜索；Tavily/Brave 首次使用须批准该摘要，漂移停止。Brave 启动前读取实际安装 package.json 的 name/version，版本固定 2.1.4。
- 搜索链含连接、描述符发现与执行共用两分钟期限。取消或超时立即停止等待及 fallback，并结算当前来源的未知效果；迟到响应不能发布成功。
- Gateway 的一个搜索调用包含逐来源 started/terminal domain facts。逐来源 receipt 只保存 ID、码、时间、usage 和非秘密模型身份；模型得到 normalized result，原始正文留在暂态。
- 所有 Web 结果带 `external_untrusted`。HTML 用 detached DOM，删除 active/control 节点，保留块、列表、链接。正文 5 MiB，投影 50 KiB，URL 8 KiB，redirect 5，idle 30s，total 120s。
- UI 遵循现有区域 signature；来源设置动作与 Backend Profiles 独立。保存/加载不连接，主动测试返回 requestId。

## Risks / Trade-offs

- 官方 search 服务或 Codex hosted tool 不可用 → 正常 typed unavailable/fallback，绝不推断 search 执行或 citations。
- peer/DNS 原生能力跨 Gecko 版本不同 → 先跑 Zotero canary；证据缺失 fail closed。
- 8 种来源接受不同响应格式 → 内部表格驱动 fixture 验证 trust boundary，统一 DTO。
