# Proposal

## Why

dev 分支为 Broker 和 Synthesis Client 增加了有界词法检索（`library.searchItems`、`synthesis.searchEvidence`、`topics.search`），并把库枚举输入从 `query` 改为 `filter`。内置 Pi Agent 的本地工具目录 `zoteroNativeToolCatalog.ts` 仍停留在此前契约，既不暴露这些检索成员，也仍以旧 `query` 表达枚举，Agent 因此无法完成文献、证据与主题检索。

## What Changes

- 在 Pi 本地目录新增三个有界只读检索工具：`library.search_items` → `zotero_library_search_items` → `broker.library.searchItems`；`synthesis.search_evidence` → `zotero_synthesis_search_evidence` → `client.searchEvidence`；`topics.search` → `zotero_topics_search` → `client.topics.search`。
- 目录新增可选的惰性 Synthesis Client resolver。Conversation 与 Skill Run 装配时注入现有 `getDefaultSynthesisClient`；未注入时只提供 Broker 工具，冻结目录不启动 sidecar。
- 枚举类输入（列表、readiness audit、遍历）统一改用 `filter`；`query` 只属于独立检索契约，不保留旧参数别名。
- 三类检索统一声明 `bounded-read`，沿用 Gateway 的预算、取消与 50 KiB 结果上限；结果保留 canonical `status`/`coverage`/`issues`/opaque cursor，不做游标转换、缓存或自动重试，不暴露源路径。
- 检索 schema 复用 canonical Synthesis protocol 的本地化逻辑：`packages/synthesis-contracts/src/protocolSchema.ts` 导出 `materializeSynthesisProtocolDefinitionSchema`，MCP 与 Pi 使用同一闭合定义。
- 包装器识别结构化 `SynthesisClientError`：保留安全 code/details，`internal` 映射为 `internal_error`，未知异常不暴露原生诊断。
- Pi 只读工具计数由 15 变为 16；注入 Synthesis Client resolver 后为 18；23 个 mutation 与 7 个 navigation 不变。
- 同步更新 `pi-zotero-tool-catalog` 主 spec 与 Broker SSOT 文档，并新建本 change 记录；不触碰 C20 发布验收 change。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `pi-zotero-tool-catalog`: 只读工具集新增三个有界词法检索映射与可选 Synthesis Client resolver；枚举输入改用 `filter`，检索输入使用独立 `query`；只读计数与检索结果契约相应更新。

## Impact

实现修改 `src/modules/zoteroNativeToolCatalog.ts`、`src/modules/piConversation.ts`、`src/modules/piSkillRun.ts`，以及 `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts` 与其共享 schema 导出模块。复用既有 Broker、Synthesis Client 与 Gateway 机制，无新依赖、无新运行时开关、无自动重试或缓存。
