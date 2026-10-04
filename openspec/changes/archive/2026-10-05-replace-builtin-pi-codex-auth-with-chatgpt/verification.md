# Change C verification

当前工作树基于 `f0b1e7dd`，插件版本 `0.10.0`、Pi SDK `1.0.0`。源码未提交；本页记录开发验证，不是 clean-candidate 发布 receipt。

## 已完成的验证

| 命令 / 入口                                                                 | 结果                    | 范围                                                                                                                                   |
| --------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npx openspec validate replace-builtin-pi-codex-auth-with-chatgpt --strict` | 通过                    | proposal、design、tasks 与 13 个 delta specs                                                                                           |
| Node 定向 `244-pi-credential-store` + `251-pi-chatgpt-auth`                 | 29 项通过               | 加密、CAS、注册、PKCE、JWT 验签、scope、单次回调、伪造签名、取消、轮换、退出 deadline、quota、开发数据清理、API-key 隔离与安全注册通知 |
| Node 定向 `276-pi-runtime-acceptance`                                       | 13 项通过               | ChatGPT live inventory、actual completed/usage/continuation 必需证据、候选错配和缺失 gate                                              |
| `npm run test:node:assistant`                                               | 通过，8 个测试文件      | action/registry、区域 DOM identity、Details 授权动作与 transcript 隔离                                                                 |
| `npm run test:node:dashboard`                                               | 通过，13 个测试文件     | Backend Manager 请求关联、注册控件、草稿与页面区域身份                                                                                 |
| `npx tsc --noEmit`、sidebar / dashboard 类型检查                            | 通过                    | 插件和两条受影响页面边界                                                                                                               |
| `npm run check:pi-mcp-browser-bundle`                                       | 通过                    | 浏览器 bundle 没有 Node MCP SDK 或旧 MCP SDK                                                                                           |
| `npm run test:zotero:case -- lite core`，定向 native callback               | Zotero 9.0.4：1 项通过  | 默认原生 XPCOM listener、loopback HTTP、WebCrypto RS256 与加密凭据                                                                     |
| 同一 core runner，定向 native callback + API-key Provider                   | Zotero 10.0.3：2 项通过 | 原生 callback 与生产 ChatGPT Responses hooks/wire、actual completed/usage；API-key 浏览器执行保持有效                                  |
| 同一 runner 的 `lite ui`，定向 Backend Manager                              | Zotero 10.0.3：3 项通过 | ChatGPT 授权表单、配置保存、目录动作保留草稿与独立页面                                                                                 |

2026-10-04 原生 callback 首次运行失败：写出 200 响应后立即 abort transport 截断缓冲，HTTP 客户端重试已消费的 callback，得到 409。修复采用 output/input EOF 关闭，完成响应不强制 abort；超时和取消仍终止连接。上述原生通过记录来自修复后的同一入口。

Backend Manager 首轮原生 UI 验证为 2 通过、1 失败：fixture 在同一同步栈派发 input 后立即点击保存，尚未让 Preact 提交 draft。Node 页面测试复现了旧标签被提交；fixture 补上微任务边界后，同一原生入口 3 项通过，没有延长固定等待或改变生产保存策略。

最终开发验证于 2026-10-04 完成，以下结果覆盖最后的生产源码：

- `npm run test:node -- --shard runtime-provider-execution`：18 个文件通过，包含完整工具批次校验、历史 namespace、输出前 503 重试、ChatGPT 搜索、认证、标题/压缩逐次调用记账与 Skill Run 同意。
- `npm run test:node -- --shard runtime-platform-persistence`：15 个文件通过，包含字段存在性、实际零值、完整/部分/未知用量、调用去重、SQLite projection 重建、恢复与生命周期。可选缓存字段缺失不降低 canonical complete；先复现错误，再修复并重跑本 shard。
- `npm run test:node:assistant`：最终 8 个文件通过，包含未知用量显示、Details 动作及区域 DOM identity；Dashboard 的 13 个文件已通过，后续源码修改未涉及 Dashboard。
- Runtime 其余 registry/products/task-queue 三个 shard 已通过（6/3/4 个文件），后续审查修改不涉及这些 shard 的生产路径；Runtime 合计 46 个文件。
- `npm run build`：完整通过，包含四个 Synthesis workspace 检查、生产 bundle/XPI 和 root/sidebar/dashboard/synthesis 四个 TypeScript 配置。未安装依赖或启动开发服务器。
- `npm run check:pi-mcp-browser-bundle`：通过，MCP 浏览器探针 1784593 字节，无 Node MCP SDK 或旧 MCP SDK。
- `npm run check:help-docs`：通过，504 个文档、53 个资产；帮助页由源文档重新生成。
- 变更文件 ESLint：零错误；全部 81 个受影响 TS/JS/Markdown/JSON 文件 Prettier 检查通过；`git diff --check` 通过。FTL 新 key 的完整性另按下文记录。
- 定向 Node `276-pi-runtime-acceptance`：最终 13 项通过。OpenSpec strict validation 通过。
- 最终定向 `lite core`：Zotero 10.0.3 两项通过，涵盖默认原生 callback、生产 SDK hooks、真实 completed/usage 的合成证据、函数 namespace/result 全上下文续请求与 API-key 浏览器执行。`lite ui` 三项通过。

独立审查先发现混合工具批次问题：SDK 会在 Runtime hook 前过滤 schema 无效调用，Provider 现先校验完整批次，任何无效调用都阻止该批次全部效果。扩展原生 fixture 复现并修复了 function/result 续请求缺少 namespace；历史已结算工具也使用同一冻结 wire 映射。API-key 回归复现了恢复请求字段时输出上限丢失 SDK 上下文限制，现直接复用 SDK clamp，同一上下文下不同密钥格式的请求上限一致。上述结果来自这些修复之后。

main、title 与 compaction 的每次物理调用各有 canonical usage fact，重复 SDK 通知不重复计数。reported 字段与 unreported 数量经持久化、重建和 UI projection 保留；缺失不冒充零值，订阅费用未知，已有可信 API-key scalar 用量仍显示，但不补造精确测量字段。

Zotero 10 安装树目录标为 10.0.2，实际 `application.ini` 为 **10.0.3 / BuildID 20260917164854**。按实际身份记录开发证据；未恢复或改写安装树，未修改 compatibility matrix 的固定目标。默认系统宿主为 9.0.4。以上都不能冒充正式六宿主矩阵的 receipt。

## 验证边界与待办

`npm run check:localization-governance` 仍失败于基线已有的 locale parity 缺口。与固定 baseline 比较，zh-CN 的缺失项维持 48；其它九个非基础 locale 由 88 降至 81；没有新增缺失 key。本次新 ChatGPT key 在 11 个 locale 中齐全。该全库检查保持未通过，不能写成通过。

原生认证和 Responses 测试使用明确的合成注册、签名 token 和服务响应 fixture；没有真实账号、官方发现或真实搜索的通过声明。原始授权 code/token/响应、账户私有内容和用户绝对路径不进入本页。

用户已选择**新建隔离 profile，并在实现验证通过后手动浏览器登录**。真实账号验证 5.2 保持未完成，必须观察官方 `/v1/models`、文本、函数调用及结果续调用、实际 completed/usage、native search/citations。缺少 SIWC 适用的可靠模型事实或服务能力仍是未通过的 gate，不能借用 API-key 元数据。

隔离环境位于 `.scaffold/test/pi-chatgpt-manual-20261004/`，新建 `profile/`、`data/`、`runtime/`，没有复制真实库或既有授权。`launch.sh` 使用现有 `start:direct` 加载当前生产构建；手工步骤见该目录的 README。该入口的宿主实际为 10.0.3，也不能充当 C20 clean-candidate 六宿主矩阵。

生产构建通过后已运行 `bash .scaffold/test/pi-chatgpt-manual-20261004/launch.sh`；Synthesis sidecar preflight ready，RDP 返回 `Addon installed`，宿主进程仍运行。隔离窗口已留给用户手动登录，未代为登录或读取账号秘密。

C20 的 tasks 2.5 与验收 runbook 已接入 Change C：同一候选须取得真实服务证据，并收集独立的 synthetic old-development Codex cleanup 样本。固定 v0.9.0 基线安装链、六宿主矩阵、容量与数值阈值保留。尚未生成 clean-candidate 接受报告，也未同步、归档或发布。

本地实现与开发验证已完成，任务 1.1–5.1 的开发部分有上述证据。5.2 的真实账号验收与 5.3 的 candidate-bound C20 receipt / installed synthetic cleanup 样本保持未完成；未归档 change，未生成发布接受声明。

## UI 重设计后的真实账号测试恢复

2026-10-04 从 `af36c2e861bbaaea0ddbc13a3dff248e860879f9` 恢复任务 5.2。该提交已完成独立 Zotero Agent 设置窗口及其受控宿主验证。

- `npm run build` 通过，包含帮助文档生成、四个 Synthesis 包检查、插件打包及 root/sidebar/dashboard/synthesis 类型检查。生成文档的 manifest 时间戳发生变化，build identity 的 `source.clean` 为 false，本次构建用于开发测试。
- 经 `stageDirectSynthesisBundle()` 执行当前源码的 locked Cargo 构建并打包 Linux x64 sidecar，通过。bundle ID 为 `25feffeba95538ab0ad0c525ab430cb1be4b1e0b4d1522ba543a9f70d28f16ed`。
- 初次复用 `.scaffold/test/pi-chatgpt-manual-20261004/` 的旧开发 profile 时，sidecar preflight ready，RDP 返回 `Addon installed`，但插件初始化失败。最初仅检查了窗口和控件存在，没有检查初始化终态及页面内容，错误地报告加载成功；该次运行不作为通过证据。
- 用户报告插件入口缺失、设置窗口空白。RDP 检查复现 `initialized:false` 与主窗口工作流菜单缺失；启动错误为 `auth_state_invalid`。只读取配置结构后确认旧 profile 保存 version 1、没有 connections 的开发配置，当前实现只读取 version 2。失败发生在 `initializePiChatGPTAuth()`，设置快照也无法读取该配置。
- 保留旧 profile、data 和 runtime，另建 `.scaffold/test/pi-chatgpt-manual-ui-v2-20261004/` 的空隔离目录，没有复制真实库、授权或旧开发配置。经该目录的 `launch.sh` 使用同一构建和既有 `start:direct` 重新启动。
- 相同初始化检查由失败转为通过：`initialized:true`，主窗口 `Zotero Agents` 工作流菜单及 Execute Workflow、Workspace、Assistant 插件入口均存在。通过既有 `openZoteroAgentSettings` 动作打开设置页，检查实际页面内容，并查看主窗口及设置窗口截图；完整导航、引导、模型工作台入口与 Use the ChatGPT plan 按钮均已呈现。

启动前安装树 `application.ini` 为 10.0.3；启动后的运行时身份及同一文件均为 **10.0.5 / BuildID 20260930214910**。按实际运行版本记录，未调整固定兼容性矩阵。

当前交给用户的窗口使用新 version 2 隔离环境。任务 5.2 和 5.3 仍未完成；本次启动与 UI 加载不证明授权、官方发现、推理、工具续调用、实际 completed/usage 或搜索引用通过。

## 首次 ChatGPT 登录入口修复

2026-10-04 基于 `463ee83f` 修复用户报告的 Sign in with ChatGPT 点击无响应。实际窗口复现为按钮存在、点击后授权动作列表为空：工作台点击分支要求注册已经存在，因此首次登录被跳过。相邻编辑器路径还依赖连接列表首项作为身份，并且没有为未保存的新连接投影账号入口。

工作台首次登录复用连接编辑器的授权及显式保存流程。编辑器以当前连接 ID 投影和派发动作，新建连接也能先授权；没有注册 ID 时，以连接 ID 关联请求。既有注册、草稿保护、取消和宿主验证边界保持原有 owner。

- 现有 `tests/dashboard/254-zotero-agent-settings.test.ts` 增加三个公开 UI 行为用例：已保存连接无注册、引用未知注册，以及新建连接先登录；前两项同时覆盖取消后重试和成功结果绑定回原连接。修复前按真实失败边界观察到失败，修复后该文件 **33 passing**。
- 修改的页面组件、view、controller 和测试通过 Prettier、ESLint；最终 `npm run build` 通过，包含四个 Synthesis 包与 root/sidebar/dashboard/synthesis 类型检查。当前本地 sidecar 经源码 locked Cargo 构建及打包后用于启动。
- 沿用 `.scaffold/test/pi-chatgpt-manual-ui-v2-20261004/` 重启，保留用户已创建的连接。实际宿主为 Zotero 10.0.5；`initialized:true`，主窗口工作流菜单存在。
- 同一实际按钮点击检查由失败转为通过：派发一个非空 request/object scope 的 `pi-chatgpt-connect`，当前编辑器显示授权进度及取消按钮。此次在宿主动作接收前拦截请求，并用关联的 canceled 结果结束 UI 请求，没有执行真实授权。拦截监听已移除，检查窗口关闭后重新打开设置页供用户操作。

以上是按钮与 UI 生命周期的开发验证。真实浏览器授权、官方模型发现及服务能力仍需用户实测，任务 5.2/5.3 未勾选；没有提交、归档或发布。

## 真实浏览器授权与模型发现

2026-10-04 用户在同一 Linux 桌面的浏览器实测，前几次在 `auth.openai.com/sign-in-with-chatgpt/consent` 显示 `Failed to fetch`，后续一次成功。未获得失败请求的浏览器网络证据，因此根因尚未确定；本次诊断没有修改认证实现，不能将后续成功归因于代码修复。

在同一 Zotero 10.0.5 隔离 profile 中，临时被动观察到宿主授权进度 `exchange`、`verify`，最终关联的 `pi-chatgpt-connect` 返回 `ok:true`，用户也确认登录成功。随后通过既有只读设置快照确认：一个注册 `signedIn:true`、`planEnabled:true`、`paused:false`、`reauthorizationRequired:false`，ChatGPT 连接已经绑定该注册，官方模型发现状态为 `ready`。首次欢迎确认仍为 `welcomeAccepted:false`，尚不允许推理。

观察只记录授权阶段、安全结果码和上述状态，不记录账号标识、授权 URL、回调参数或令牌；临时监听与窗口诊断属性已移除。任务 5.2 的文本、工具续调用、actual completed/usage、搜索引用证据以及任务 5.3 仍未完成，两个任务保持未勾选。

## 登录后的模型列表空态修复

2026-10-04 用户报告 Refresh models 显示 Done，但工作台仍提示登录且没有模型卡。实机只读快照确认注册已登录、订阅权限与首次欢迎确认均已完成、连接已绑定、发现状态为 `ready`。页面反馈循环复现零模型卡与登录提示同时存在；通过真实 Add model 按钮打开账号选择器，返回五条 `discovered` 模型，五个添加按钮均可用。工作台模型卡与账号目录是不同对象，刷新不自动创建配置。

根因是页面空态提示没有使用登录状态；模型选择器还在已有模型行时无条件显示无结果提示。controller 现根据登录状态复用既有登录/目录提示，选择器根据当前有界结果页显示空提示，没有新增目录读取、认证请求或自动模型选择。

现有 `254-zotero-agent-settings.test.ts` 增加登录、刷新与选择入口的公开页面用例，并扩展模型选择/添加用例验证结果非空时移除空提示。两处分别在修复前复现失败，修复后同一文件 **34 passing**；未精确断言完整生产文案。

修改的 controller 与页面测试通过 Prettier、ESLint；`npm run build` 完整通过。当前源码 sidecar 经 `stageDirectSynthesisBundle()` 的 locked Cargo 构建及打包后重新启动同一 profile。实机确认 `initialized:true`，已登录注册、首次欢迎确认和连接绑定均保留；原反馈循环返回 `stillAsksToSignIn:false`、`reproduced:false`。真实 Add model 窗口再次显示五条账号模型，五个添加按钮可用，窗口留给用户选择模型并进行后续推理测试。任务 5.2/5.3 保持未完成。

## 账号目录与 Codex 模型目录的差异调查

2026-10-04 用户报告在 Codex 或其他客户端能看到 `gpt-6-sol`、`gpt-6-luna`、`gpt-6.1-sol`，插件却只列出五个模型。通过同一注册、真实 Refresh models 动作，在生产 fetch 边界临时提取模型 ID、可见性、数量及 HTTP 状态，未读取或输出认证头、令牌和原始响应。一次 HTTP 200 响应共有七条模型：`gpt-6-astra`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-5.5` 的 visibility 为 `list`；`gpt-reserve` 和 `codex-auto-review` 为 `hide`。响应没有上述三个用户询问的 ID，也没有 `has_more:true`。页面五条结果不是数量上限或分页截断。

后续一次 `cache:no-store` 探针和一次默认策略刷新均返回 HTTP 403；后一请求通过 Gecko observer 确认一个网络响应、零缓存响应。账号登录、订阅权限、首次欢迎确认及绑定仍在，发现状态变为 `failed`，保留此前成功采用的五条结果。403 的具体原因尚未确定，不能把保留目录视为最新完整可用性证据，也不能推断三个模型永久不可用。临时 fetch 包装与网络 observer 已恢复/移除，诊断属性已清除。

[官方模型发现说明](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) 要求按所选注册请求公共 `/v1/models`，其展示示例过滤 `visibility:list`，同时说明 Codex `model/list` 可能使用内置或缓存目录。本次没有改变发现规则或补造模型事实；真实服务验收仍有未通过项，任务 5.2/5.3 不变。

## 模型测试的原生取消 API 与结果生命周期修复

2026-10-04 用户测试 `gpt-5.6-luna` 时看到未完成及暂停未解除提示。当前账号快照为已登录、订阅权限和欢迎确认均已接受、未暂停。用户再次显式测试后，临时被动观察捕获关联结果 `ok:false`、`provider_terminal_missing`，官方 Responses fetch 边界调用次数为零，没有记录请求正文、认证头或原生异常。

插件 bootstrap 的独立 Web API 环境没有向 SDK 所在作用域提供原生 AbortController/AbortSignal。使用当前安装的 OpenAI SDK、占位凭据和完全离线的模拟 fetch，在具有相同 Web API 的 Gecko sandbox 复现：请求在构建发送参数时失败，缺失 AbortController，fetch 次数为零。仅补齐 sandbox 自有的原生取消 API 后，同一用例返回 completed，fetch 一次；预先取消的后续请求被识别为取消，没有额外发送。bootstrap 现从持久 Web API sandbox 提供 AbortController，并通过其原生 signal constructor 提供 AbortSignal，不依赖设置窗口寿命。

页面同时在用户打开测试确认框时创建失败结果，收到失败动作后又没有把安全失败码投影到模型卡。controller 现仅在用户确认发送后创建待定记录；收到当前请求终态才发布结果，失败码仅在已知项目 Pi failure code 中显示，重新测试和迟到结果继续按 card/request 关联。取消确认不创建测试结果，配置和默认用途不变。

现有公开页面测试增加一个完整生命周期回归，修复前失败、修复后同一文件 **35 passing**，覆盖确认取消、等待态、失败原因、其它模型卡隔离、重试、旧结果拒绝及实际成功结果。Prettier、ESLint 和 `npm run build` 通过；离线 SDK 用例是原生运行环境证据，不是实际 SIWC 推理成功证据。任务 5.2/5.3 保持未完成。

同一 profile 重新启动后，`initialized:true`、插件入口和模型工作台正常，已登录账号、权限和欢迎确认均保留，`paused:false`。用户显式测试的一次 Responses fetch 收到 HTTP 200，但最终安全码为 `provider_response_failed`；该次未捕获流终态结构，不能判定是服务失败还是本地结果校验失败。补上仅记录事件类型和字段有效性的有界流观察后，用户下一次显式测试收到 HTTP 403，没有 Responses 事件，结果仍为 `provider_response_failed`。

随后经同一宿主 fetch 发出一个不带凭据、不执行推理的官方 `/v1/models` 可达性请求：HTTP 403、JSON 响应、非 HTML、无 challenge 标记；仅将已知地区拒绝码归一化为 `region_denied`。这证明当前出口存在官方地区准入阻碍，支持最新推理 403 为同一准入问题的判断，但不能解释前一次 HTTP 200 的终态失败。没有修改网络出口、代理、凭据或认证准入，也没有自动再次发出推理请求。临时观察及离线探针属性已清理，窗口保留供用户后续测试。

`246-pi-api-key-provider-execution.test.ts` **37 passing**，覆盖官方端点、真实终态门禁、工具批次与续调用、用量、普通 API-key 和取消；严格 OpenSpec validation 与 `git diff --check` 通过。上述开发检查及已修复的发送前故障不能替代真实服务验收，任务 5.2/5.3 仍未完成。

用户指出主机由 Mihomo 转发后，继续只读检查网络路径。Zotero `network.proxy.type=5`，桌面系统代理为 none，应用层代理解析为 direct；Mihomo 实际启用 TUN/auto-route，因此应用层 direct 本身不能证明绕过代理。虽然主机有 IPv6 默认路由而 Mihomo 关闭 IPv6，但真实无凭据 `/v1/models` 请求的远端地址是 Mihomo IPv4 Fake-IP，路由指向 Meta/TUN，排除了该次请求的 IPv6 绕行假设。

同期在 Mihomo 连接 API 捕获 `process:zotero-bin`、`host:api.openai.com`、`inboundType:Tun`、匹配 `DomainKeyword/openai`，最终 chain 为国外媒体组、节点选择组及当前日本标签节点。连接在尚无匹配规则时出现的初始 DIRECT 快照不作为已发生直连的证据。未修改代理、规则、节点或系统网络配置。

这次相同无凭据目录请求返回 **HTTP 401**，是缺少认证时的正常响应，说明当次路径能到达 API；先前另一请求的地区 403 不能概括为持续未走代理或持续地区阻塞。此前 HTTP 200 的真实推理终态失败仍缺少结构证据，不能归因于当前节点，也不能声明推理已修复。只读代理及路由探针的窗口属性已清理，任务 5.2/5.3 不变。

## 新连接授权等待时的取消与窗口关闭修复

2026-10-04 用户在新建连接登录时遇到“授权流程无效”，并确认提示位于外部浏览器登录页。Zotero 仍等待浏览器回调；没有该次浏览器失败请求的证据，因此外部授权失败原因尚未确定。

实际设置页确认本地阻塞原因：新连接授权按连接草稿关联 pending，整个字段集被禁用，而取消登录按钮在这个字段集内部；编辑器取消和离开草稿确认也将授权等待误当作不可中断的保存。临时解除当前取消按钮所在字段集的禁用后，通过原有按钮完成取消，宿主返回 `pi-chatgpt-cancel ok:true` 和原连接授权的 `canceled`，当前草稿保留。

正式修复将账号授权控件移出禁用字段集，编辑器与离开确认只在连接保存时阻止退出。取消立即释放匹配请求的页面 pending，保留草稿与已完成的注册；窗口关闭路径取消活动尝试。授权进度同时校验 object/request，取消后迟到进度和结果不能影响重试。

- 现有首次新连接登录用例扩展为取消、保留草稿、立即重试、拒绝旧请求进度与结果，以及失败后解锁。增加编辑器退出和原生窗口关闭的两个公开行为用例，覆盖继续编辑与放弃；既有保存用例同时验证提交保存仍禁止放弃。修复前三个授权退出用例均失败，修复后设置页 **37 passing**；合并宿主和认证生命周期测试 **65 passing**。
- Prettier、ESLint 与完整 `npm run build` 通过，包含各页面类型检查。当前本地 sidecar 通过既有 `stageDirectSynthesisBundle()` locked Cargo 构建并用于 `start:direct`。未提交、归档或发布。
- 重启相同隔离 profile 后，`initialized:true`，主窗口插件入口存在。原生运行时发起两次可取消的浏览器授权等待，仅临时拦截浏览器打开动作，不进行外部登录、令牌交换或推理。第一次真实取消按钮可点击，宿主报告取消，loopback callback 监听关闭，同一草稿能重试。第二次经原生 `window.close()` 进入草稿保护，继续编辑保留草稿和活动授权，再次关闭并放弃后原生窗口实际关闭，callback 监听再次关闭。
- 临时浏览器打开拦截在每次打开边界恢复，观察监听与诊断属性清理。用户原有未保存的新连接名称和注册选择在重启后通过公开输入恢复，未自动保存或重新登录；已登录的注册、连接和模型配置保留。
- 最新只读账号快照仍为 `signedIn:true`、订阅权限和欢迎确认已接受、`paused:false`，但 `reauthorizationRequired:true`。没有重启前紧邻时点的同项证据，不能将该状态归因于本次取消；没有清除轮换保护或自动重新授权，后续真实推理需先由用户完成重新授权。

上述证据验证本地取消与关闭恢复，不证明外部“授权流程无效”或此前真实推理终态失败已修复。任务 5.2/5.3 保持未完成。

## 重新授权后仍提示需要更新的诊断

2026-10-04 用户认为重新登录已经成功，但设置页仍显示 Authorization needs updating。只读宿主快照确认一个已保存注册 `reauthorizationRequired:true`、目录刷新失败，页面最后动作反馈也为失败。该提示由插件的持久认证元数据及未确认轮换标记投影产生，不是直接显示官方账号状态；其最初置位原因尚缺当时证据。

用户再次显式点击原连接的 Reauthorize，临时观察仅记录已知 OAuth grant 类型、HTTP 状态、已知错误码、字段是否存在、授权阶段及项目动作结果。观察到 `waiting -> exchange`，随后官方 `https://auth.openai.com/api/accounts/oauth/token` 的授权码交换返回 **HTTP 403 / unsupported_country_region_territory**，没有新的 access/refresh/ID token。关联的 `pi-chatgpt-connect` 返回 `ok:false`、`auth_rejected`，没有注册成功结果。因此这次重新授权未完成，新凭据没有采用，旧的重新授权保护保留；不能视为成功后页面没有清除状态。

[官方授权流程](https://developers.openai.com/siwc/token-sharing-open-source/sign-in) 明确区分回调、授权码交换与新 ID token 验证。浏览器 loopback 页面仅确认回调接收；只有宿主完成后续交换、身份验证和凭据保存，才会将本地重新授权标记清除。当前泛化错误反馈没有呈现失败阶段和地区拒绝原因，不应将该提示当作官方认定账号失效。

在明确标记的 `.scaffold/pi-acceptance/` 临时诊断中复用既有认证 fixture，将原有中断轮换用例延长至同一注册重新登录、准入检查和 access 读取，**1 passing**：成功重新授权会清除标记并恢复准入。这是合成生命周期证据，不能替代实际服务成功。未修改认证保护、凭据、网络配置或生产实现；HTTP 包装、页面监听及诊断属性已恢复/清理。任务 5.2/5.3 仍未完成。

## 系统路径与显式 SOCKS5 的出口对照

2026-10-04 用户补充 Chrome 系统代理路径提示地区不支持，而显式使用 `192.168.13.2:1080` SOCKS5 时可用。对照仅请求无凭据的 `/cdn-cgi/trace` 和认证端点 GET，不发送授权码、令牌或推理请求，也不修改持久代理配置。

- curl 经 TUN 自动路径和显式本机 HTTP 代理，认证域名 trace 均报告日本 IPv6；认证端点 GET 返回 405，没有已知地区拒绝码。显式 LAN SOCKS5 的 trace 报告美国 IPv6，但随后的认证端点 GET 出现 TLS 传输失败，不能据此声明整个 SOCKS5 授权链路已验证。
- Zotero 原生请求的认证 trace 报告中国 IPv4，认证端点 GET 返回 403 / `unsupported_country_region_territory`；API 域名同期 trace 报告日本 IPv6，模型目录无凭据 GET 返回正常的 401。trace 的地区字段仅反映 Cloudflare 对该次请求出口的识别，不是账号地区事实。
- 将 Gecko 响应的本地 socket 端口与 Mihomo connection metadata 对齐后，认证域名的实际失败连接对应 `Tun` / `DIRECT`，而同期日本代理链属于另一个端口。此前按域名汇总的代理观察不能证明所有认证请求都经同一出口；空规则 DIRECT 快照本身仍不足以定性，须与具体响应连接关联。
- 后续原生对照中，普通连接仍复现中国出口和地区 403，另一新连接的认证 GET 则返回 405 并匹配日本代理链。再次请求时，普通连接与限制连接复用的诊断连接均报告日本 IPv6、GET 405，响应端口均匹配日本代理链。没有改动系统代理、Mihomo 规则或节点。这支持连接复用或分流路径不稳定的调查方向，但没有定位产生直连的具体机制，不能宣称刷新连接已永久修复。

用户真实重新授权的 POST 仍需独立验证；GET 405 只说明这次请求没有复现地区拒绝，不代表授权、模型推理或任务 5.2/5.3 已成功。

## UDP 请求跳过不支持 UDP 的代理并默认直连

2026-10-04 用户再次真实重新授权后确认成功。关联观察记录授权码交换 HTTP 200、新 token 字段存在、direct scope 存在，随后 `exchange -> verify`、连接动作成功。宿主注册的 `reauthorizationRequired` 从 true 变为 false，目录刷新成为 ready，页面重新授权提示消失。此证据证明本次授权与本地状态清除成功；用户随后模型测试仍返回 `provider_response_failed`，没有该次响应状态和终态证据，不能宣称推理成功或将其全部归因于网络。

为追查 DIRECT，读取本机 Mihomo v1.19.29 的运行期规则、代理能力和 journal。实际生效模式为 rule；`DOMAIN-KEYWORD,openai,🌍 国外媒体` 存在，当前媒体组经节点选择组采用日本 Trojan 节点。运行期媒体组、节点选择组、该节点及最后 MATCH 指向的漏网之鱼组均为 `udp:false`。该 Trojan 配置没有启用 udp。

journal 明确记录与之前 Gecko 响应端口关联的请求为 **UDP**，而非 TCP：认证请求端口 51015 和 59269 均为 `auth.openai.com:443 doesn't match any rule using DIRECT`；先前模型域名请求也有同类 UDP 记录。另有标记为 chrome 的两个认证域名 UDP/443 请求采用相同直连兜底。普通 TCP 请求则记录 `match DomainKeyword(openai)` 并使用日本代理链。此前 socket 端口关联的方向有效，但省略 network 字段导致没有及时区分 TCP 与 UDP；连接复用只能解释请求采用哪条已有路径，不能解释 DIRECT 的根因。

[对应版本源码的 match 函数](https://github.com/MetaCubeX/mihomo/blob/v1.19.29/tunnel/tunnel.go#L654-L710) 会跳过 `metadata.NetWork == UDP && !adapter.SupportUDP()` 的匹配项，所有项遍历后返回 DIRECT 和 nil rule；日志函数在该分支输出 doesn't match any rule。[官方规则文档](https://wiki.metacubex.one/config/rules/#_1) 同样说明 UDP 请求会继续向下匹配不支持 UDP 的节点。因此已捕获失败请求不是命中某条显式 DIRECT 规则，而是已匹配域名的出口不可用于 UDP，连最后 MATCH 出口也不可用，触发内置 DIRECT 兜底。

浏览器 UDP/443 路径符合 HTTP/3/QUIC；[Chromium 代理文档](https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md#SOCKSv5-proxy-scheme) 明确 SOCKS5 只代理 TCP URL 请求，不转发 UDP。这为用户显式 SOCKS5 可用而系统路径地区拒绝提供协议层解释，同时保留两路径出口地区不同的已测事实。

准备了只匹配 OpenAI 与 ChatGPT 域名 UDP/443 的两条 REJECT 候选规则，使用现有 `/usr/bin/mihomo -t` 在独立最小配置中验证语法成功；候选仅用于审阅，未加载到运行服务、未修改 `/etc/mihomo/config.yaml`，也未修改浏览器或 Zotero 持久网络设置。实际修复可选择确认并启用节点 UDP 能力，或定向拒绝这些域名的 QUIC 路径以使客户端尝试 TCP，仍需实施后的真实请求验证。授权临时观察已清理。任务 5.2/5.3 保持未完成。

## 用户授权的 QUIC 定向规则试运行

2026-10-04 用户明确要求先试添加上述两条规则。系统配置由 root 持有，当前用户没有非交互 sudo 权限，因此通过现有控制接口进行运行期试加载。原始配置、完整候选和当时的 selector 选择保存于忽略目录中的私有试运行工件；目录权限 0700，配置文件权限 0600，不提交配置内容或控制接口凭据。

完整候选通过现有 Mihomo `-t` 校验后，以 payload 方式 PUT `/configs` 返回 204。GET `/rules` 确认两条 AND/UDP/443/domain REJECT 排在第 1、2 位，总规则由 3527 变为 3529；11 个 selector 的原选择均保留，rule 模式、TUN 保持启用。磁盘 `/etc/mihomo/config.yaml` 未改变，Mihomo 重启或从原文件重新加载后不会保留本次试运行规则。未停止或重启服务，未修改浏览器或 Zotero 网络首选项。

随后通过 Zotero 原生 HTTP 发出四个无凭据 GET：认证与 API 域名 trace 均为 HTTP 200、日本 IPv6；认证端点 GET 为 405，模型目录 GET 为正常无凭据 401，均没有已知地区拒绝码。同期 journal 捕获这些域名的 UDP 请求命中新 AND 规则使用 REJECT，随后 TCP 请求匹配 OpenAI 关键词并走日本代理链，未观察到这些探测走 DIRECT。此次验证没有禁用宿主 HTTP/3，证明规则实际触发后客户端能够回退到代理 TCP。

真实 Chrome 页面和用户模型测试仍需复测。为下一次用户显式测试准备的临时观察只记录 HTTP 状态、已知事件类型和终态字段有效性，不记录凭据或响应正文。任务 5.2/5.3 保持未完成。

## 真实 completed 流的输出项归并修复

2026-10-05 用户再次显式测试后，原生 HTTP 观察和独立响应流观察均确认 `/v1/responses` 返回 HTTP 200。流包含文本 delta、一个 `response.output_item.done` 和一个真实 `response.completed`；终态 status 为 completed、响应 ID 有效、usage 计数字段有效、没有 error，但终态 `output` 为成功解析的空数组。页面动作仍返回项目码 `provider_response_failed`。因此本次失败发生于插件结果校验，不能归因于先前的 UDP 直连或地区拒绝。

现有实现只从终态 output 读取完整结果，导致已收到的流文本无法与空终态数组匹配。provider 现在按每次物理请求持有已完成流输出项，并在 Pi 改写工具名之前保存原始 wire 快照。仅真实 completed 的 output 是空数组时，才使用索引连续且全部完成的输出项进行现有结果校验；非空终态数组仍按原路径校验。缺项、重复、pending、异常终态、文本不一致、工具命名空间与参数不一致仍拒绝；不从文本 delta 或 SDK done 单独推定成功。完成回调获得同一组已验证输出项，保留工具与搜索引用的完整数据。

先扩展现有公开 provider seam 测试，复现文本和工具的两项失败，再实施修复。provider、brokered web tools 与 network 三组共 90 项通过；新增边界覆盖终态不重复输出项、没有 done 项、输出索引缺失、重复 done 项和未完成项，既有 incomplete/missing-terminal 用例现在也携带 done 项以确认终态仍是成功前提。Prettier、ESLint、完整 `npm run build`（包含浏览器包及各 TypeScript 检查）、OpenSpec 严格校验和 diff 检查通过。

已使用当前源码构建并暂存本地 Synthesis sidecar，重启同一隔离 profile 的 Zotero。旧测试进程退出已观察；新插件从 `.scaffold/build/addon` 加载，initialized 为 true，主窗口插件菜单存在，新设置 iframe 完整加载并打开模型工作台。账号与已保存配置保留，尚未主动发出真实推理。临时状态与流结构观察已安装，等待用户显式模型复测；任务 5.2/5.3 保持未完成。

随后用户显式复测同一 5.6 luna 模型并回复成功。原生 HTTP 与流观察再次记录 HTTP 200、真实 `response.completed` 和仍为空数组的终态 output；已完成流项为索引有效、带有效 ID、completed 状态、assistant role 与 output_text 内容的 message。页面动作返回 `ok: true`、`completed: true`，证明新归并路径已在真实 Zotero 和真实账号请求中通过，而不是依赖服务改为重复输出。临时 fetch 包装、HTTP observer 和页面 action listener 已清理，Zotero 保持运行供继续测试。此证据完成该模型连接文本探测；真实工具调用、搜索引用和 C20 验收尚未由本次探测覆盖，任务 5.2/5.3 保持未完成。

## 5.2：5.6-luna 的真实服务验收

2026-10-05，用户授权补齐验收并指定 `gpt-5.6-luna`。实际宿主为 Linux x86_64 / Zotero **10.0.5**；安装目录仍命名为 10.0.2，不据此改动六宿主兼容矩阵。已退出的手工 profile、data 和 runtime 只读复制到独立 compatibility workspace；账号输入保留已完成的真实浏览器授权、已验证身份、direct scope 和欢迎确认，来源不回写。此前本节的浏览器授权成功观察继续作为登录证据，没有把 fixture 当作登录成功。

扩展现有 `306-pi-live-smoke.zotero.test.ts`，经 `npm run test:zotero:e2e` 执行三项公开边界验收：生产 Conversation 的流式文本与持久化；Provider 的真实 namespaced function 调用及携带匹配结果的完整上下文续请求；生产 brokered web tools 经 sealed OpenAI 通道的搜索结果与服务提供的引用。函数仅处理固定合成值，搜索只查询公开 Zotero Connector 信息。所有请求固定同一注册和 `gpt-5.6-luna`，不自动选择其它模型。

官方账户发现返回同一模型及可靠上下文；其工具能力仍为 unknown。测试副本通过生产目录 overlay refresh 为官方 SIWC 目标显式声明官方支持的 namespaced function 协议，并创建临时验收卡，不伪装成发现返回的能力字段，也不补造输出上限。函数和搜索能力另由实际请求验证；默认用途与搜索来源在副本中恢复，临时目录声明不回写用户配置。

搜索首轮没有发出 HTTP：Mihomo 将 `api.openai.com` 解析为 Fake-IP，sealed network 返回项目码 `pi_network_local_approval_required`，原搜索路径将其掩盖为泛化失败。现在仅保留共享网络边界产生的 typed 项目错误，等待 Provider 结算后返回原码；原生异常文本不能被当作码。既有搜索测试扩展到网络拒绝、超时和伪装成网络码的原生错误，确认不泄露异常内容。

用户明确批准仅将 `api.openai.com` 加入 Mihomo `fake-ip-filter`，并永久保留先前两条 OpenAI/ChatGPT 域名的 UDP/443 REJECT。已使用内置 patch 写入 `/etc/mihomo/config.yaml`，语法检查通过；重新加载、DNS/Fake-IP 缓存刷新完成，所有 selector 原选择与模式保留。持久配置及备份含秘密，仅保存在私有忽略目录，不进入验收工件。

排除 Fake-IP 后，搜索暴露 `pi_network_transport_unavailable`。实际宿主 `nsIStringInputStream.setData` 不存在，旧上传逻辑在 POST 发送前拒绝；GET 用例不能覆盖这条路径。原生上传现统一使用 `nsIArrayBufferInputStream`，按 buffer、byteOffset、byteLength 传递原始字节，删除字符串转换。先在公开 native transport seam 复现，再修复；回归覆盖零字节、非 ASCII、255 和数组切片。既有真实宿主 287 用例增加实际 POST 字节核对；fixture 改为 binary input，避免 scriptable string read 在零字节处截断。该文件最终 **12 passing**，包括匿名、重定向、取消、超时和网络准入。

最终真实服务运行 manifest：`57f7dc86-a1c4-4613-980e-e65b0aed9092`，**3 passing**；独立脱敏观察为 `.scaffold/pi-siwc-final-20261005/live-post-upload-observation.json`。文本形成持久完成消息；函数两次 HTTP 200、同模型、stream/store/namespace 契约有效，第二次包含完整上下文与函数结果，两次均有实际 completed 和完整用量；搜索一次派发、HTTP 200、实际 completed、已完成 search/message 输出项和一条服务提供的有效引用。终态 output 仍为空数组，证明实际搜索也通过已完成流项归并，而非依赖服务重复输出。

失败尝试保持原状态：`777e18a6`、`4317ad6f` 与搜索定向观察文件分别保留原搜索失败、Fake-IP 拒绝和原生 POST 不可用，不改写为通过。自动观察只存项目码、计数、状态与契约布尔值，不保存令牌、账户 ID、原始响应或引用内容；自定义 debug 事件未被 system-E2E manifest 持久化，因此独立观察文件随交接保留。

本轮 Provider / web tools / network / acceptance 四文件 **104 passing**；`npm run build` 的浏览器包和所有 TypeScript 配置通过，相关 ESLint、Prettier 与 diff 检查通过。任务 **5.2 完成**；这些是真实服务开发证据，正式 clean-XPI 认证仍由 C20 收集。

## 5.3：合成清理样本与 C20 交接

新增既有 full E2E 下的 `307-pi-synthetic-cleanup.zotero.test.ts`，显式 `ZOTERO_PI_SYNTHETIC_CLEANUP=1` 且初始凭据为空才运行；现有 runner 只增加 PI-06 的重启标识，不引入新 runner。全新专用 profile/runtime 中合成旧 Codex 加密 envelope、连接、卡片、默认引用及账户缓存，同时保留 API-key、其它连接/default、overlay path、Conversation/Skill Run 各一条历史和无关 profile 数据。测试不调用生产清理函数，由安装插件的两次实际启动完成清理及幂等验证。

首轮和第二轮都因合成 pref 尚未写入磁盘就强制重启而丢失凭据，原失败保留。第五轮新增落盘观察，在重启前准确失败为 `synthetic_cleanup_credential_prefs_not_durable`，退出后才出现对应磁盘 pref，定位为 fixture 保存时序。现有 `savePrefFile(null)` 后增加最多五秒的有界实际落盘等待；未修改生产清理逻辑。第六轮 manifest `8cc8ee80-1021-4ed7-9930-60a208ea8e34`，runner 观察两次旧进程退出并恢复，最终 **1 passing**。独立 `.scaffold/pi-synthetic-final-20261005/cleanup-observation-sixth.json` 包含 seed、firstStartup、secondStartup，`startupsObserved:2`；两次都只保留一个 API-key credential、两个其它连接、一张卡、conversation/title 默认项、一个其它账户缓存、两条原历史和无关 profile 数据，旧 Codex 与引用均移除，第二次配置完全一致。

中间诊断曾误用工作树的通用测试 profile，生成测试构建并留下普通探针 pref；该进程已退出，探针项通过内置 patch 移除，生产构建已重建。真实账号的独立手工 profile/data/runtime 未受影响。第三轮两套同副本并发启动造成 fixture/resource 失败，作为无效诊断保留，后续仅单 runner。通用旧 Zotero 进程未终止；最终日常窗口只从用户原手工 profile 启动。

最终 306 定义再次经真实 `gpt-5.6-luna` 验证，manifest `86da825e-e257-4898-8256-e3d0eb36fea0`，**3 passing**，观察 `.scaffold/pi-siwc-final-20261005/live-candidate-observation.json`。306/307 的定向 manifest 缺少 foundation/family 事件，因此 `terminalState:incomplete`，该状态保留；不把定向用例通过当作正式全 suite 通过。独立自动观察与 runner 的实际恢复证据可交接开发事实，不能替代 clean-XPI/manual receipt。

`ZOTERO_BUILD_DEBUG=0 npm run build` 生成非 debug、非 measurement 的 **0.10.0** / capacity **12** 候选；source commit `463ee83f4894d3575f0daf81aa84730f81a1f98e`，`dirty:true`，XPI SHA-256 **`b1c014ab5d2e6fa5766160a84114d15c06993502c654dc1b83cf188fe2a61a08`**。交接 `.scaffold/pi-acceptance/chatgpt-final-20261005/` 保存 candidate.xpi、源码/测试及实际测试 bundle 摘要、两组独立脱敏观察与明确限制，并更新现有 `verify-builtin-pi-runtime-release/verification.md`。

现有 `check:pi-runtime-acceptance` 实际返回 **2 / accepted:false**；两项 ChatGPT manual evidence 保持 missing，自动事实只供 sourceEvidence，不伪造 confirmer 或退出/清除后不可用/重连记录。既有 acceptance 13 个测试继续证明缺失、失败、不匹配候选和不完整人工项被拒绝。固定六宿主矩阵、v0.9.0 baseline、容量和数值阈值未改。任务 **5.3 完成**；本 change 实现与开发验收 **17/17**，C20 正式发布验收独立保持未完成。未提交或归档。

最终以当前源码构建的本地 Synthesis sidecar 暂存到 unpacked add-on，再经 `start:direct` 重启用户原手工 profile。宿主 **10.0.5**、插件 `initialized:true`；新设置页与模型工作台实际加载，一个已保存模型卡和账户退出入口存在，`5.6 luna` 可见。窗口停留在该连接工作台供继续测试，没有自动发出新的模型请求。OpenSpec apply 状态为 `all_done`，strict validation、相关 ESLint/Prettier 和 `git diff --check` 通过。
