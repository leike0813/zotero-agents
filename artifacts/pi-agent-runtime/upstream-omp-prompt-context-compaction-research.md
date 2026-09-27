# OMP 上游 prompt、context、compaction 与资源加载研究

## 结论摘要

当前 OMP 的边界很清楚：`@oh-my-pi/pi-agent-core` 是由宿主提供 `systemPrompt`、messages、tools、`convertToLlm` 和可选 context transforms 的通用 agent loop；它不发现 `SKILL.md`、`AGENTS.md`，也不保存 session。技能/项目指令发现、system prompt 拼装、自动/手动 compaction 编排、session JSONL、模型切换后的 provider-state 清理，均属于 `@oh-my-pi/pi-coding-agent` 这个 Bun/Node 高层应用，而非 core/ai 可复用契约。[core public exports](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/index.ts) [core agent state and options](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/agent.ts#L99-L355) [coding-agent package](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/package.json#L1-L150)

这支持用户对 D02 的复核：上游 runtime 并不对自然语言 instruction 作“权威/冲突”语义裁决。它会按来源优先级与目录深度去重 context files、按顺序渲染 prompt，并以文本块相等检测避免重复的 always-apply 内容；这些是 discovery/rendering policy，不是对 LLM 指令含义的分类器或仲裁器。[context-file capability](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/capability/context-file.ts#L14-L45) [prompt dedup and assembly](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/system-prompt.ts#L74-L145) [assembly result](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/system-prompt.ts#L956-L1039)

## 研究范围与版本基线

- 源码快照：官方仓库 `can1357/oh-my-pi` 的 `main`，固定为 `51f03804476c3fd3c15748ae07e4849d1efc883b`（2026-08-30 获取）。该 commit 位于已发布 `v18.0.11` tag `b8ce33a58911c26bed1d84f0db9a5e2e727c49a2` 之后，因此以下以“main 当前源码”表述，不能把它当成不可变发布包行为。
- 当前 main 的 `@oh-my-pi/pi-agent-core`、`@oh-my-pi/pi-ai` 都标记为 `18.0.11`，并声明 `bun >=1.3.14`；前者还依赖 `pi-natives` 与 `snapcompact`。这不是 Firefox/Zotero 插件的受支持执行环境。[agent manifest](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/package.json#L1-L83) [ai manifest](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/ai/package.json#L1-L90)
- 本仓库此前研究过的锁定包是另一条发布线：`@earendil-works/pi-agent-core@0.84.4` 和 `@earendil-works/pi-ai@0.84.4` 的官方 npm manifest 声明 `node >=22.19.0`，而不是当前的 `@oh-my-pi/*` / Bun manifest。[legacy core manifest](https://registry.npmjs.org/@earendil-works/pi-agent-core/0.84.4) [legacy ai manifest](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4) 旧包能否经现有 IIFE guard/browser build 使用，必须以该精确 tarball + importer 的构建验证为准；不能由当前 main 的源码结论倒推。

除上述官方仓库源码、仓库内官方文档与 npm 发布 manifest 外，本研究未使用二手资料。

## 1. Skills、项目指令与渐进披露

### 上游实际分层

| 主题 | 当前源码事实 | 对本票的含义 |
| --- | --- | --- |
| core/ai | core 的 `AgentState` 只有 `systemPrompt`、model、tools、messages 和 stream state；宿主在 `AgentOptions` 注入 `convertToLlm`、`transformContext`、`transformProviderContext`。没有技能或文件发现接口。 | Pi runtime 只应消费已准备好的 turn context；发现/加载必须在 Runtime 外的 preparation/host 层。 |
| 技能发现 | coding-agent 的 `loadSkills()` 从 capability providers、custom dirs、managed skills 合并；同名按 precedence/first-wins，custom dir 可覆盖默认 provider。过滤由 source toggle、disable、ignore/include 组成。 | 可语义复用“显式 source、确定顺序、去重、snapshot”的模式；不要直接抄其目录与 provider 列表。 |
| `SKILL.md` 的首轮内容 | 已发现 skill 只以 name + description 进入 system prompt，且仅在有 `read` 工具、skill 未 `hide` 时显示。正文不自动内联。 | D04 应采用上游的 metadata-first disclosure，而非把全包正文塞入 prompt。指定 run 的 task contract 是否 eager 是本项目自己的产品层决定，不应声称是 Pi core 行为。 |
| `references/assets/scripts` | `skill://<name>` 返回 `SKILL.md`；`skill://<name>/<relative>` 在 skill baseDir 内解析。实现拒绝绝对路径、`..`、越界及不存在的文件；它不会搜索相邻资源，也不会自动读取 references/assets/scripts。 | 语义上应使资源通过受控 read/tool interface 按需取用。Zotero 版应以 Tool Gateway/插件文件抽象实现，不应 materialize 到 workspace。 |
| 项目 instructions | `AGENTS.md` provider 从 cwd 向上走，产生有 depth 的 project context；context-file capability 以 `user` 或 `project:depth` 作去重 key。同层由 capability provider priority 遮蔽。 | 本项目 session cwd 固定为 Managed Agent Workspace 后，只在那里解析项目 instructions；用户已明确排除 External Workspace，因此不可沿用 OMP 的 external cwd traversal。 |

证据：[`AgentLoopConfig` context seams](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/types.ts#L147-L250)；[`loadSkills`](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/extensibility/skills.ts#L120-L330)；[skill 提示词与 slash invocation](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/extensibility/skills.ts#L500-L570)；[`skill://` containment](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/internal-urls/skill-protocol.ts#L28-L123)；[AGENTS walk](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/discovery/agents-md.ts#L49-L143)；[官方 Skills 文档](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/docs/skills.md#L1-L186)。

### 与用户 D04/D06 复核的直接对应

“完全参考上游 Pi”可精确落为：**技能目录的发现只形成可发现元数据；正文与其 relative resources 由模型经受 containment 的 read capability 按需读取；不做全目录 eager materialization。** 但 OMP 的 `skill://` 是 coding-agent 的 Node/Bun 文件协议，不能直接带入 Zotero。对 attachment，上游技能机制没有要求“复制到 workspace”；用户的“Zotero attachment 只走 Zotero Native Tool、用户文件先给路径”与上述 progressive-disclosure 原则一致。

## 2. System prompt、context assembly 与 instruction 冲突

coding-agent 的 `buildSystemPrompt()` 并发读取 context files、system customization、skills、workspace tree 和环境信息，然后渲染系统模板/项目模板为有序 `string[]`；它可接受调用方预加载的 `contextFiles`、`skills` 与 custom prompt。core 的 `Agent` 则只是保存这些 strings，并在 loop 内将 agent messages 经 `transformContext`、`convertToLlm`、provider context transform 后发送。[build options/result](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/system-prompt.ts#L578-L680) [build implementation](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/system-prompt.ts#L681-L1039) [core mutators](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/agent.ts#L900-L929)

因此，当前上游不存在“把 instruction 解析成 authority classes、识别语义冲突并拒绝 provider call”的 runtime。可见的规则只有：(1) 同 scope 的 context-file provider 选择；(2) 按 depth 排序并去除被包含的 context 文件；(3) 对完全相同的段落块去重 always-apply rule/系统 prompt source。它不会判定两个不同文本谁覆盖谁，更不会解释 LLM 如何理解两条指令。[context-file load/dedup](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/system-prompt.ts#L404-L505) [textual dedup](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/system-prompt.ts#L74-L145)

**建议映射：**按 D02 复核，将 `PiTurnPreparation` 限定为忠实、可审计的 assembly：记录 source、trust、discovery snapshot、render order 与 digest，构造 provider-neutral blocks；不实现自然语言 conflict classifier 或 `instruction_conflict` gate。Capability envelope、tool approval、文件访问 containment 仍是 host 的可执行安全边界，但它们是工具/数据访问 policy，不是让 runtime 解释文本指令。

## 3. Context projection、预算、compaction 与 model/provider switching

### Core 可用的抽象，和它不做的部分

- core 清楚划出两层 projection：`transformContext(AgentMessage[])` 用于 context window/pruning/external injection；`convertToLlm` 把 host custom messages 变为 provider `Message[]`；`transformProviderContext` 是最终 provider payload hook。它还允许 `AgentMessage` 由宿主扩展，故很适合保持 transcript/owner facts 为 SSOT、只投影到单次请求。[projection contracts](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/types.ts#L147-L250) [host-extensible messages](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/types.ts#L650-L875)
- `AppendOnlyContextManager` 将 system prompt + tool specs freeze 成 StablePrefix，并以消息 digest 找到最长字节稳定前缀；模型变化有 `invalidateForModelChange()`。这是 provider prompt-cache 优化，不是 durable transcript、session persistence 或正确性 SSOT。[append-only implementation](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/append-only-context.ts#L1-L340)
- core compaction 导出 token usage/threshold/preparation/summary APIs：优先 provider-reported `contextTokens`，兼顾本地 stored-conversation estimate，reserve/threshold/keep-recent 均有明确输入；`CompactionResult` 携带 `firstKeptEntryId`、`tokensBefore`、`details` 与 `preserveData`。这些是可学习的预算与 provenance 结构，不等于 plugin 可直接 import 的实现。[token and threshold policy](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/compaction/compaction.ts#L151-L380) [compaction preparation and cross-provider portability](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/compaction/compaction.ts#L1234-L1415)
- 单独调用 core `setModel()` 只替换 model 并同步 tokenizer。coding-agent 才在模型/供应商变化时关闭 provider session、清 inherited cache key、刷新 append-only prefix，并重算工具集；所以 provider cache/session reset 是高层 owner adapter 的职责，不能靠 core setter 自动完成。[core `setModel`](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/agent.ts#L919-L929) [coding-agent switch path](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/session/agent-session.ts#L7774-L7939)

### Automatic 与 manual compaction 的归属

上游 core 提供 compaction algorithm，并可选择 provider-native remote replay；其 `compact()` 接受 model、credential、session/cache identifiers、provider state、fetch 和 converter。自动触发、手动命令、取消、重试、session entry append、重建 context、关闭被重写历史的 provider session 是 coding-agent session maintenance 的编排层。官方文档也明确把 compaction entry 作为 session history，而非普通消息，并把 manual `/compact` 与 auto-maintenance 区分开。[`compact()` inputs](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/compaction/compaction.ts#L1522-L1608) [compaction method selection](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/session/compaction-methods.ts#L1-L122) [official compaction model](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/docs/compaction.md#L1-L111)

**建议映射：**本项目应在 durable owner transcript 中保存 compaction plan/result 的 boundary、summary/ref、usage、model snapshot 与 method/provenance，并由 TurnPreparation 将其投影为下一请求 context。自动/手动触发语义、provider switch 时 remote replay 是否仍可读、失败恢复，放在 Zotero adapter/owner lifecycle，而不是 Pi core loop 或 UI cache。不得将 OMP 的 prompt-cache append log、remote opaque replay payload 或 `snapcompact` 图像档案当作本项目 durable evidence 的唯一副本。

## 4. Session restore、cache/checkpoint/digest/provenance

core/ai 没有 session storage：`AgentState` 是内存 state，主入口只导出 loop、compaction、telemetry 等模块。完整 JSONL session tree、title slot、branch/compaction entry、blob externalization、load/migration/context reconstruction 都在 `pi-coding-agent`。其官方 session 模型还明确区分“append-only durable entries”与“根据 active leaf 重建的 LLM context”，这与本项目已有 owner transcript SSOT 决定一致。[core exports](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/index.ts) [official session format and reconstruction](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/docs/session.md#L1-L82) [compaction entries in session docs](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/docs/session.md#L117-L164)

在 `pi-ai`，provider context 只是 `{ systemPrompt, messages, tools }`；`sessionId`、`promptCacheKey`、`providerSessionState` 都是一次 agent session 的 transport affinity/cache hint。它们可以帮助 provider replay 或 cache hit，却不能替代 owner 的 durable checkpoint、审计或 evidence。跨 provider 的 message compatibility transform 也只能用作 wire adapter，不能承担用户可见 history 的语义重建。[AI Context type](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/ai/src/types.ts#L1285-L1289) [stream/session fields](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/ai/src/types.ts#L392-L505) [cross-provider handoff guidance](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/ai/README.md#L811-L902)

coding-agent 的 persistence 还会截断/外置图片 payload，loader 在 restore 时解析 JSONL、resolve blob refs、修复被截断的 snapcompact frames；默认 file storage 直接用 `node:fs`、`Bun.file`、`Bun.write` 和本机路径。可借鉴的只有 durable entry + reference/digest + rebuild 的**语义**，不能复用其 storage、blob 或 checkpoint 代码到 Zotero plugin。[persistence transform](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/session/session-persistence.ts#L318-L372) [load and blob resolution](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/session/session-loader.ts#L240-L430) [Node/Bun file storage](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/coding-agent/src/session/session-storage.ts#L1-L260)

## 复用判定矩阵

| 上游资产/模式 | 判定 | 理由与 Zotero 落点 |
| --- | --- | --- |
| core 的 `AgentMessage` 扩展、`transformContext → convertToLlm → transformProviderContext` 边界 | **语义复用，但需 Zotero adapter** | 可作为 `PiTurnPreparation` 到 provider adapter 的清晰 projection seam；不得把 core 当作 instruction discovery owner。 |
| Skills metadata-first + `skill://` relative-resource containment/progressive disclosure | **语义复用，但需 Zotero adapter** | Managed Workspace 的 Skill Registry 冻结 package snapshot，Tool Gateway 提供 bounded read；直接实现不能使用 Node path/fs/Bun 文件协议。 |
| coding-agent 的 project AGENTS discovery/provider precedence | **语义复用，但需 Zotero adapter** | 只对 Managed Agent Workspace session cwd 做 canonical discovery；External Workspace 永不参与。保留 source/digest/order 记录，不做 language-level conflict arbitration。 |
| `AppendOnlyContextManager` 的 stable-prefix/digest cache 观念 | **语义复用，但需 Zotero adapter** | cache 可加速请求，不是 transcript/provenance SSOT；模型/工具 catalog/instruction snapshot 改变必须失效。 |
| core token budget、`CompactionPreparation` / `CompactionResult` 字段语义 | **语义复用，但需 Zotero adapter** | 保存边界、usage、summary/ref、method 与 model/provider snapshot，重建 projection。具体 summarizer、remote replay 与 triggers 由 owner adapter 决定。 |
| current `@oh-my-pi/pi-agent-core` / `@oh-my-pi/pi-ai` main 的可执行 package | **不应直接复用** | package manifest 声明 Bun；源码含 `Bun.env`、`Bun.sleep`、`Bun.hash`、Node imports，且 core 依赖 natives/snapcompact。Firefox/Zotero 没有该运行时。见 [agent Bun references](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/agent/src/agent.ts#L1-L58) 与 [ai stream Node/Bun imports](https://github.com/can1357/oh-my-pi/blob/51f03804476c3fd3c15748ae07e4849d1efc883b/packages/ai/src/stream.ts#L1-L5)。 |
| `pi-coding-agent` 的 system-prompt builder、skill discovery implementation、JSONL/blob/session manager、slash command、TUI、filesystem tools、provider registry/auth | **不应直接复用** | 它们是完整 CLI 应用层，强依赖 Node/Bun filesystem、process/env、Bun glob/server/SQLite 或高层 session manager；它们也会把外部 cwd 当项目边界，违背本项目 managed-workspace 模型。 |
| 已锁定 `@earendil-works/*@0.84.x` 的精确 browser build | **待独立构建验证，不能由本研究授权** | 它是另一发布线；本研究只证明官方 manifest 的 Node engine。是否可通过精确 importer guard 打包，是该版本的实际构建/运行测试问题。 |

## 对票据复核的可操作结论

1. 接受 D02 用户复核：runtime 做 snapshot、discovery、assembly、tool/data access enforcement 与 evidence；不做 LLM instruction semantics/冲突裁决。
2. D03 按用户覆盖：session cwd 永远是 Managed Agent Workspace；External Workspace 不发现/解析 `AGENTS.md`。
3. D04 改为上游一致的 metadata-first progressive disclosure：不全包注入、`SKILL.md` 与 references/resources 经受控 read 按需读取；“指定 Skill Run 的最小 task/contract 是否首轮附带”应在本项目的 `PreparedSkillRun` 契约中单独说明，而不能误称 Pi upstream 已规定。
4. D06 按用户覆盖：Zotero attachment 通过后续票定义的 Native Tool 读取；用户文件只提供受控路径。准备层记录 ref/path/digest/turn snapshot，不主动复制/物化；agent 主动作副本时由其工具 receipt 另行记录。

这些结论不修改实现、不关闭 Wayfinder 票，也不替代后续针对旧锁定包的浏览器构建验证。
