# C11 验证记录

- 日期：2026-09-30
- 固定源码基线：`b6cc7f48`（C16 已归档）
- Change：`add-pi-brokered-web-tools`
- 范围依据：[#26 C11 accepted plan](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5535111609)。用户明确将 DeepSeek 原生搜索替换为 [Anthropic 官方 Messages 搜索](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)。

## OpenSpec 核对

| 维度 | 结果 |
| --- | --- |
| 完整性 | 12/12 项任务完成，10 项 ADDED requirement 均有实现 |
| 正确性 | 15 个 scenario 均有对应实现分支及 fixture、共享行为或真实宿主证据 |
| 一致性 | 沿用 C02 canonical transcript、C03 加密凭据、C05 refresh、C06 preparation、C07 Gateway、C09 stdio、C10 SDK owner、C16 Conversation 与现有 Dashboard 区域组件 |

| Requirement | 实现及证据 |
| --- | --- |
| Search sources are explicit and frozen | `piBrokeredWebTools.ts` 保存白名单、默认 Exa、冻结有序来源、精确配置优先级；`261` 覆盖离线、顺序、配置身份 |
| Search preserves provenance and stops unsafe fallback | `searchChain` 一次 dispatch、durable started/terminal、typed fallback、grounded/raw normalization；`261` 覆盖 unknown、取消、合同失败、缺失执行和引用证据 |
| Fetch is anonymous and bounded | detached HTML、text/JSON、UTF-8 与整个 JSON 投影上限；`261`、`262` 和真实 `287` 覆盖匿名、取消、idle timeout、限额 |
| Every outbound hop follows shared address policy | `piOutboundNetworkPolicy.ts` 与 channel redirect veto；`262`、真实 `287` 覆盖全部地址、metadata、明文、grant、peer 和重定向 |
| Web sources reference isolated credentials and official models | `web-source` 加密命名空间与官方模型配置资格；`244`、`261`、既有 provider registry/execution 分片 |
| Official grounded search reuses selected Codex authentication | `piOpenAICodexAuth.ts` 短时 access、CAS 与冻结账号身份；`244`、`251`、`261` 和真实 core 的 Codex fixture |
| Built-in Agent page manages explicit Web source order | 共享 DTO、Backend Manager host/controller/region、requestId 测试和单独保存；Dashboard `251`、真实 UI `278` |
| Curated Search uses the shared network boundary | `piMcpToolSources.ts`、延迟 SDK loader、Brave 已安装 manifest、冻结描述符摘要和参数映射；`249`、`261`、真实 core `283` |
| Web source identities and receipts participate in admission | Gateway identityDigest、effects、authorization keys、callId 和安全 attempt facts；`245`、`261`、既有 Conversation `256` |
| Web source and external trust facts remain turn frozen | C06 safe provenance 与外部数据指令、C16 续调用冻结；`247`、`256` 和真实 Conversation `286` |

## 执行结果

真实宿主均使用标准 `npm run test:zotero:*` runner、当前源码浏览器 bundle 和 `.scaffold/test` 隔离 profile；未使用真实用户库或另建 E2E runner。

| 命令 | 结果 |
| --- | --- |
| `npm run test:node:runtime` | runtime 五分片、38 文件通过；最终实现补跑下面 provider execution 分片 |
| `npm run test:node -- --shard runtime-provider-execution` | 最终 15 文件通过，包含 Gateway、Provider、Preparation、MCP、Codex、Conversation 与 C11 |
| `npm run test:node -- --shard dashboard` | 13 文件通过 |
| `npm run test:node -- --shard ui --shard shared` | UI 16 文件、shared 1 文件通过，包括 Workspace DOM identity |
| `npx tsc --noEmit`、`npx tsc --noEmit -p tsconfig.dashboard.json` | 通过；生产 build 还检查所有页面 tsconfig |
| `npm run lint:check` | 构建结束后串行执行，通过 |
| Zotero 7.0.32：`ZOTERO_TEST_GREP='Pi brokered web' npm run test:zotero:core` | 10 passed：实际插件 sandbox 页面连接测试、匿名、重定向、DNS/peer、已连接取消、真实 idle timer、metadata/cleartext、离线、admission |
| Zotero 9.0.6：`ZOTERO_TEST_GREP='Pi brokered web\|Pi MCP source transport' npm run test:zotero:core` | 12 passed：10 项 C11 与 2 项共享 MCP owner/stdio；1 个 Windows 限定 pending |
| Zotero 9.0.6：`npm run test:zotero:core` | 全量 lite core 115 passed、0 failed；1 个 Windows 限定 pending。随后新增的连接取消、idle、插件 sandbox 三项均通过最终定向重跑 |
| Zotero 9.0.6：`npm run test:zotero:ui` | 全量 lite UI 4 passed、0 failed；包含八来源 panel 的真实页面挂载 |
| `npm run build` | 通过：生产 bundle/XPI 与全部页面 TypeScript 检查 |
| `openspec validate add-pi-brokered-web-tools --strict` | 通过 |
| `git diff --check` 与交接 Markdown 本地链接检查 | 通过；61 个本地链接，0 个缺失 |

## 回归与修正

- 凭据 CAS 替换、控制字符导致 JSON 超限、native responseStatus getter、channel 自动重定向及 stdio 迟到启动均先获得失败用例，再修正共享入口。原生异常只映射为项目码；整个模型结果留出 Gateway envelope 空间，裁剪无法继续时安全失败。
- 首轮真实宿主卡在插件初始化。RDP 得到 `TransformStream is not defined`，确认 Web 静态导入提前初始化 SDK；已复用 C10 的浏览器流准备和延迟 module loader。普通 GET 成功后，GDB 捕获受控 fixture 的 Socket Thread SIGSEGV；将 asyncWait 回调固定到 MainThread，撤销迟到回调、清理 timer 和 accepted transport 后，7/9 定向门禁通过。
- 实际插件 sandbox 与测试窗口的全局对象不同。受控缺失对象测试先证明 `ReadableStream` / `AbortController` 不可用，再复用 `runtimeBridge` 的宿主窗口解析；共享 controller 入口与 MCP loader 一并修正。最终 7/9 用例从真实插件 Backend Manager 发起 SearXNG 测试并获得可用结果。
- [Mozilla esr115 的 channel 接口](https://github.com/mozilla/gecko-dev/blob/esr115/netwerk/protocol/http/nsIHttpChannelInternal.idl) 明确 redirectMode 不执行 channel 策略。实现使用 `nsIChannelEventSink` veto：原响应保留 status/header/peer，自动 replacement 在连接前拒绝；下一跳由 broker 重新分类。peer 校验发生在响应头后、正文发布前，不能表述为请求发送前的 peer 证明。
- 初次 lint 发现改动文件格式和 canary timer 的 prefer-const 问题，均已修正。最终并行 lint 遇到 build 重生成帮助文档 manifest 的瞬时缺失，改为构建完成后串行运行。独立静态审阅最终未报告剩余 P1；审阅没有替代执行测试。

## 验证边界

本次没有使用真实 Anthropic/OpenAI/Codex/Brave/Perplexity/Tavily 账号执行搜索，没有 Windows/macOS 或完整版本矩阵证据；这些属于 C20。Exa 描述符来自官方 hosted tools/list 的只读发现，fixture 不证明公网搜索服务持续可用。来源不可用保持 typed unavailable，不伪造实际搜索或引用。

Change 保留在工作区，未提交、未同步主规格或归档。C11 规格核对覆盖 10 项 requirement 和 15 个 scenario；未发现尚待修正的规格或设计偏离。真实账号和其它平台的验证边界如上。
