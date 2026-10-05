# Design

## Context

See proposal.md - Why. dev 已把 `library.searchItems`、`synthesis.searchEvidence`、`topics.search` 三个有界词法检索成员并入 Broker 与 Synthesis Client，并把库枚举输入由 `query` 改名为 `filter`。这些语义已由 `zotero-host-broker-capability-api`、`synthesis-evidence-search`、`synthesis-topic-lexical-search` 等主 spec 锁定。

Pi 的 `zoteroNativeToolCatalog.ts` 是一个独立、显式的本地只读投影：它按 `domain.member` 映射 canonical capability ID 与 `zotero_*` 工具名，声明 effects 与闭合 schema，经 `piToolGateway.ts` 冻结目录。Broker 检索与 Synthesis 检索来自两个不同的执行入口：前者是进程内 Broker，后者是可选注入的 Synthesis Client（真实实现为 `getDefaultSynthesisClient`，会拉起宿主 sidecar）。

## Goals / Non-Goals

**Goals:**

- 让 Pi Agent 能通过三个只读工具使用 dev 新增的文献、证据与主题检索，并复用 canonical DTO、coverage 与 opaque cursor 语义。
- 让枚举类工具改用 `filter`，检索类工具使用 `query`。
- 在不改变计算语义的前提下，把 MCP 侧的 canonical 检索 schema 本地化逻辑提炼为共享导出，供 Pi 与 MCP 共用。
- 保持 Broker-only 组合的可用性：无 Synthesis Client resolver 时保留文献检索，不注册证据与主题检索；冻结目录不启动 sidecar。

**Non-Goals:**

- 不在本轮引入检索结果缓存、自动重试、游标转换或新的持久化。
- 不改变 Broker、Host Bridge、MCP 或 Synthesis sidecar 的既有语义与边界。
- 不扩展 C20 发布验收 change。

## Decisions

**惰性 Synthesis Client resolver 而非急切注入。** 目录增加一个可选 resolver，只有冻结时提供才注册两个 Synthesis 检索工具；未提供时只注册 Broker 工具。这样只读/离线组合不会因为冻结目录而启动 sidecar，符合 Pi browser bundle 的不可达导入约束。备选的急切注入会让所有 turn 都承担 sidecar 启动与凭据解析成本。

**共享 canonical 检索 schema，而非为 Pi 重写一份。** 契约模块导出 `materializeSynthesisProtocolDefinitionSchema(schemaId, definition)`（`packages/synthesis-contracts/src/protocolSchema.ts`），MCP 与 Pi 用同一函数把 canonical Synthesis 协议定义裁剪为只含可达定义的闭合输入 schema。备选做法是在 Pi 目录内复制 schema，会制造第二个事实源并与 MCP 漂移。

**枚举 `filter` 与检索 `query` 分离，不留别名。** 这与 Broker SSOT 一致；别名会让 Agent 无法区分“确定性枚举”和“相关度检索”，因此旧 `query` 参数直接被闭合 schema 拒绝。

**沿用 Gateway 预算、取消与 50 KiB 上限，不做缓存或重试。** 三个新工具都声明 `bounded-read`，结果原样透出 `status`/`coverage`/`issues`/`nextCursor`；超限走既有 `resource_limited` 失败路径。缓存与自动重试由调用方或后端负责，Pi 层不引入。

**结构化错误映射。** 读取包装器识别 `SynthesisClientError`，保留安全 code/details，`internal` 归一为 `internal_error`，未知异常只产生安全诊断，防止 Provider/Client 原生异常泄漏。

## Risks / Trade-offs

- schema 共享后 MCP 与 Pi 同时受影响 → 以现有 MCP 契约测试与 Pi 目录测试共同锁定；schema 定义只单向收敛到契约模块。
- 两个 Synthesis 工具依赖注入 resolver，装配遗漏会静默少两个工具 → 在 Conversation 与 Skill Run 装配测试中锁定冻结目录包含 18 个只读工具。
- 检索结果体量较大 → 由既有 Gateway 50 KiB 上限与物理 settle 控制，超限失败而非截断。

## Migration Plan

无持久化状态迁移。实现顺序：先扩展现有 Pi 目录/Conversation/Skill Run 与真实宿主镜像测试，再实现检索映射与 schema 共享，最后运行 Node runtime、Host Bridge、TypeScript 与插件构建检查。回滚只需还原目录与装配改动，不影响 Broker 或 sidecar。
