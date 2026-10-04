# Zotero Agent 配置原型：服务商与模型目录

[第三版交互原型](index.html) · [第二版对照](revision-2.html)

## 用户明确的范围

独立窗口、首次引导、连接工作台及卡片内默认用途设置继续保留。具体会话的模型选择由现有 model picker 负责，完全属于本地图范围之外；配置原型已移除相关按钮、对话框与演示状态。

## 本轮修订

- API Key 服务商选项来自项目当前的 Pi 模型目录，不再写死三家。预置服务商采用目录中已有的服务信息，配置入口要求选择服务商、命名连接和填写密钥。
- “目录与维护”提供按服务商筛选、模型搜索和分页浏览，并能直接创建所选服务商的连接。
- API Key 连接保存后，从该服务商目录中添加需要配置的模型。多个模型复用同一连接，在各自卡片中设置默认用途。
- 未适配项和退休项保留明确状态。不可配置的服务商不能创建连接；界面不建议用户以自定义端点绕过缺失的执行或认证适配。
- ChatGPT 模型仍使用模拟的账户发现事实；公共 OpenAI API 模型不自动作为 ChatGPT 账户的可用模型。
- 模型目录每页呈现 12 条，模型添加列表沿用相同的有界投影。连接选择和目录维护没有真实网络请求。

## 离线事实与能力边界

构建脚本读取 `src/config/piModelCatalogSeed.json`，调用现有纯函数 `normalizePiOfficialCatalog` 归一化，再将显示所需字段注入原型。浏览器没有导入生产运行时或凭据模块。

当前 seed 原始记录含 42 个服务商、1,601 个条目；归一化后为 40 个服务商、1,520 个聊天模型条目。非聊天类型及旧 Codex 目录由既有归一化规则排除。

离线候选条件要求目录条目可用、已知正数上下文和输出上限、支持文本输入。当前得到 33 个服务商、1,165 个候选模型。这是离线配置条件，不证明账户权限、有效凭据或真实调用成功。

Cloudflare AI Gateway 与 Cloudflare Workers AI 的 seed 地址还包含账户或网关参数。本版从目录目标中的未展开参数识别这项配置需求，将它们显示为“需补充服务商参数”，暂时禁用普通 API Key 入口；其余 31 个候选服务商展示普通连接入口。正式服务商参数字段、目标解析及能力判定由后续契约确定，不能从目录条目数推断已完整适配。

插件执行适配仅注册 `openai-responses`、`openai-completions`、`anthropic-messages`、`google-generative-ai`。Pi SDK 的全部服务商能力不能直接等同于当前插件支持范围。

当前没有可配置条目的服务商为 Amazon Bedrock、Azure OpenAI、GitHub Copilot、Google Vertex、Mistral、NVIDIA NIM 和 Radius。原因分属执行协议、缺少端点事实或模型声明的额外 headers；认证能力也必须按插件实际支持情况判断。自定义端点不会增加执行协议、OAuth、云认证或 header 适配。

事实源：

- `src/modules/piModelCatalogData.ts`：支持协议集合、目录归一化、可用性和额外 headers 处理。
- `src/modules/piProviderExecution.ts`：实际执行协议注册。
- `src/modules/piProviderConfiguration.ts`：认证类型及模型能力准入。
- 已安装 `@earendil-works/pi-ai@1.0.0` 的 README：SDK 服务商与认证说明。

## 评审路径

1. 从“目录与维护”选择 DeepSeek，查看其模型并添加连接；只填写示例密钥，无需手工填写官方端点。
2. 在工作台给同一连接添加两个模型，分别设置常用或工作流用途。
3. 选择 OpenRouter，浏览多页模型并按名称搜索。
4. 查看 Amazon Bedrock 等不可配置项；检查它们没有被引导到自定义端点。
5. 在首次引导和日常工作台中确认具体会话的模型选择入口已移除。

登录、密钥保存、目录更新及调用全部模拟。正式持久化、默认用途保存、服务商认证和连接目标绑定契约由后续决策票确定；此原型不构成 Zotero 或 ChatGPT 实机验收。
