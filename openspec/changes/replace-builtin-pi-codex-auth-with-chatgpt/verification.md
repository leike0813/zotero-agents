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
