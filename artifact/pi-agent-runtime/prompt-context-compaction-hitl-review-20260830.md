# Built-in Pi prompt、context、compaction 与资源加载：HITL 决策复核记录

## 状态与使用方式

- 对应票据：[Define prompt, context, compaction, and resource loading](https://github.com/leike0813/zotero-agents/issues/23)
- 地图：[Wayfinder: Plan the Built-in Pi Agent Runtime MVP](https://github.com/leike0813/zotero-agents/issues/10)
- 记录日期：2026-08-30
- 状态：**用户复核完成，本文记录最终决定**
- 本记录是票据 resolution 的本地详细工件，但不授权绕过 Wayfinder/OpenSpec 进入生产实现。

用户约定：写明复核结果的条目按复核覆盖；没有写明复核结果的条目接受推荐默认项。

## 已有事实与范围边界

本轮从既有代码、规格和已关闭 Wayfinder 票继承以下事实，不重新打开：

1. Pi Conversation 与 Pi Skill Run 各自拥有 durable owner；Built-in Pi Runtime 只持有可丢弃的 `Pi Runtime Session` 和 `Pi Runtime Turn`。
2. 每个 owner 的 `Pi Agent Transcript` 是消息、turn、tool lifecycle、branch、compaction 和恢复事实的唯一事实源。模型上下文、Assistant Workspace transcript、索引和 full mirror 都是 projection 或 cache。
3. prompt、Skill、Zotero selection、attachment、workspace trust、context budget 和 compaction 归 Runtime 外部的 shared turn-preparation module。
4. `SkillRunPreparation` 输出 backend-neutral、不可变的 `PreparedSkillRun`；ACP 与 Pi 只附加各自的协议层内容。
5. 每个 Pi Runtime Turn 使用冻结的 `Pi Model Selection Snapshot` 与 immutable tool catalog snapshot。
6. Tool Gateway 是工具目录、能力过滤、审批、路由、receipt 和审计的 owner。Zotero 内容只能通过稳定 DTO、受控 materialization 或 Zotero Native Tools 进入 Agent 路径。
7. 不持久化完整 provider request。`TurnPreparationRecord` 只能保存重建所需的 refs、digests、版本、策略和 token statistics，不能复制 credentials、headers、SDK object 或第二份 message history。
8. Assistant Workspace 只消费 owner transcript projection；context preparation 不得进入整面板 chrome render key，也不得让 transcript-only 更新重建非 transcript region。
9. 本票不决定具体 Zotero Native Tool 集合；该职责仍属于 [Define Zotero Native Tools and capability parity](https://github.com/leike0813/zotero-agents/issues/20)。本票只决定 selection、attachment 和 resource 如何进入模型上下文。
10. 具体数值型 timeout、并发、性能和产品验收阈值由后续 acceptance ticket 收口。本票固定预算结构、触发语义和 fail-closed 行为。

---

## D01 — prompt/context preparation 的外部 Interface 放在哪里？

### 问题

应该创建一个覆盖 ACP Chat、ACP Skills、Pi Conversation 和 Pi Skill Run 的统一 prompt builder，还是只为 Built-in Pi 建立深层 turn-preparation Interface，并复用已确定的 backend-neutral Skill Run preparation？

### 最终决定

采用两层组合，不创建四条执行路径共用的万能 prompt builder：

```text
SkillRunPreparation(request, workflow context)
  -> PreparedSkillRun                    # ACP / Pi 共用，backend-neutral

PiTurnPreparation(owner facts, turn intent, runtime policy,
                  optional PreparedSkillRun)
  -> PreparedPiTurn                     # Pi Conversation / Pi Skill Run 共用
```

`PiTurnPreparation` 是一个深层 Module。它的外部 Interface 只接收稳定项目 DTO 和 immutable snapshot/ref，输出：

- provider-neutral model messages/context blocks；
- immutable tool catalog projection；
- resolved context budget；
- `TurnPreparationRecord`；
- 结构化 preparation failure 或 compaction plan。

Pi Runtime 与 provider Adapter 只能消费这个结果，不得自行读取 prefs、Zotero、workspace、Skill 文件或 transcript，也不得自行决定 compaction。

ACP Chat 保持当前 Adapter 语义；只有未来明确需要共享稳定行为时，才把对应能力下沉到更小的 backend-neutral resolver。不得为了形式统一，把 ACP 的 protocol prompt、Pi 的 system protocol 和 SkillRunner compatibility prompt 合并成一个浅层条件分支集合。

### 其它选项

- 建立所有 backend 共用的 `PromptBuilder`：表面统一，但会把 ACP family、Pi provider、SkillRunner compatibility 和 Conversation/Skill Run 差异暴露给一个巨大 Interface。
- Pi Conversation 与 Pi Skill Run 各自准备 context：实现较快，但会复制 budget、resource、compaction、provenance 和恢复逻辑。

### 推荐理由与影响

这与已确定的“双入口、单内核”和 `PreparedSkillRun` 所有权一致。删除 `PiTurnPreparation` 后，复杂度会重新散落到两个 owner、Runtime、provider Adapter 和恢复路径中，说明该 Module 有实际深度。ACP 只共享已经真实存在的 seam，不为单一实现制造假抽象。

### 复核状态

已确认：接受推荐默认项。

---

## D02 — 指令的权威层级和冲突规则是什么？

### 问题

system instructions、项目/用户指令、Skill 指令、Workflow contract、tool descriptions 和当前 user message 发生冲突时，谁拥有最终权威？是否只依赖 provider 的 message ordering？

### 最终决定

Runtime 与 `PiTurnPreparation` 不解释自然语言指令的含义，不建立 instruction authority taxonomy，也不判断两段不同指令是否语义冲突。它们只负责忠实、确定且可追溯地组装 owner 已提供的 context：

- 保留 source、role、discovery snapshot、render order、content digest 和 provider-neutral block identity；
- 执行结构性校验，例如必需 block 缺失、role/tool pair 不完整或 Adapter 无法表达；
- 允许对完全相同的文本块做确定性去重，但不得通过语义分类器决定哪条自然语言指令“更高”；
- 把组装结果交给 LLM，由 LLM 理解和决策。

`Agent Capability Envelope`、`Resource Policy`、Tool Gateway approval、路径 containment 和不可授予能力仍由宿主控制面机械执行。它们不能只靠 prompt 约束，但也不要求 Runtime 解释文本。`instruction_conflict` 不进入 preparation failure code；结构性问题使用 preparation/transform contract failure。

### 其它选项

- Runtime 建立权威层级并拒绝语义冲突：越过了 context assembly 的职责，也无法可靠替代 LLM 对自然语言的理解。
- 只拼接字符串而不保存 source/order/digest：足够发出请求，但无法解释或重建实际 context。

### 推荐理由与影响

该选择与 OMP 上游一致：core 接收宿主组装的 `systemPrompt`/messages，coding-agent 只按来源、目录深度和文本相等关系排序/去重，不做自然语言冲突裁决。安全边界继续由实际工具和访问控制实施。

### 复核状态

已确认：按用户复核覆盖原推荐项。

### 用户复核：

Runtime 应只忠实组装 context；LLM 如何理解和决策不由 Runtime 控制。

---

## D03 — global、workspace 与 owner instructions 如何发现和冻结？

### 问题

Pi Conversation 和 Pi Skill Run 应在何时读取用户指令与项目指令？是否跟随文件实时变化？External Workspace 中的 `AGENTS.md` 等控制资源何时生效？

### 最终决定

采用显式来源、turn-time snapshot、owner-stable identity：

- Zotero Agents 设置中保存的 global user instructions 在每个新 turn 准备时读取，并记录配置 revision/digest；活动 turn 不受中途修改影响。
- Managed Agent Workspace 中只有 Zotero Agents 物化并登记的 canonical control resources具有指令权威；模型或工具后来写出的同名文件仍是普通数据，除非用户显式提升其信任。
- 每个 session 的 cwd 永远是 Managed Agent Workspace。项目指令发现只在这个 workspace 的受管根到 session cwd 范围内按 canonical 规则运行；父级先、近级后，同层由确定的 provider/source priority 去重。
- External Workspace 只是执行过程中可能访问的外部空间，永远不是 session cwd，也永不参与 `AGENTS.md` 或其它项目控制资源的发现、解析和 prompt assembly。其文件只能作为普通数据经已授权工具访问。
- Pi Skill Run 的 Workflow/Skill snapshot 在 run admission 时冻结，deferred/重启恢复继续使用同一 snapshot；不得读取“当前最新版”替换它。
- Pi Conversation 在每个新 turn 形成新的 instruction snapshot，因此已信任项目文件的后续变化只影响新 turn，不改写历史。

每个 instruction source 记录 logical ref、content digest、source kind、trust classification、discovery rule version 和 snapshot revision。正文只在其 canonical file/snapshot 中保存一次，不复制进 audit 或 owner metadata。

### 其它选项

- 每次 provider invocation 都实时重读：能立即响应修改，但同一个 turn 的多次 invocation 可能出现不同规则，无法可靠恢复。
- Conversation 创建时一次冻结到关闭：行为稳定，但长期 Conversation 无法自然接收用户更新的项目指令。
- 让 External Workspace 参与 instruction discovery：违背 Managed Agent Workspace 作为唯一 session cwd 的领域模型，并使执行目标反向改变 Agent 控制面。

### 推荐理由与影响

turn-time snapshot 与 `Pi Model Selection Snapshot` 的冻结语义一致。Managed Agent Workspace 是唯一指令发现根；External Workspace 的信任或访问授权只影响工具能力，不影响 prompt assembly。

### 复核状态

已确认：接受 turn-time snapshot，并按用户复核排除 External Workspace instruction discovery。

### 用户复核：

External Workspace 永远不参与 `AGENTS.md` 解析；所有 session 的 cwd 都是 Managed Agent Workspace。

---

## D04 — Skill instructions 和 resources 采用 eager 还是 lazy loading？

### 问题

`SKILL.md`、`references/`、`assets/`、`scripts/`、schema 和 Workflow resources 应全部注入 prompt、全部物化后让 Agent 自读，还是按类型分层加载？

### 最终决定

Skill discovery 与资源读取忠实参考固定版本 OMP 上游的 metadata-first progressive disclosure；不自行设计全包 eager 注入：

- `SkillRunPreparation` 冻结 effective Skill identity、source、package snapshot/manifest、runner/output contract 和 digest；ACP/Pi 共用这份事实。
- system prompt 只暴露可用 Skill 的 name、description 和受控读取/调用方式。即使是指定 Skill Run，也不自动把整个 `SKILL.md` 正文内联；Pi Adapter 以固定上游的 Skill invocation 语义启动指定 Skill。
- `SKILL.md` 与 `references/`、`assets/`、`scripts/` 等 relative resources 通过受 containment 保护的 Skill resource read Interface 按需读取。拒绝绝对路径、`..`、越界和不存在的资源，不搜索相邻未声明目录，也不把包复制到 workspace。
- input/output schema 的权威文件继续由 Finalizer/validator 使用；Agent-facing projection遵循固定上游和本项目结果协议的最小需要。
- 优先直接复用所选精确 `pi-agent-core/pi-ai` 版本公开且 Zotero-safe 的 Skills/context seam；高层 `pi-coding-agent` 的 Node/Bun `skill://` 实现只复用语义，通过 Plugin Skill Registry、Tool Gateway 和插件文件抽象提供 Zotero Adapter。
- 精确上游版本、可达依赖和可直接导入范围由兼容性原型票验证；未经验证不得把 current OMP main 的 Bun实现带入 Zotero。

### 其它选项

- 全包正文内联：偏离上游 metadata-first 设计，挤占 context 并破坏 progressive disclosure。
- 直接导入 `pi-coding-agent` 的 Skill loader/protocol：它是 Bun/Node 高层应用，依赖其 filesystem、process和cwd模型，不适合 Zotero插件。
- 每个 backend 各自 materialize/patch：破坏 `PreparedSkillRun` 的唯一事实源。

### 推荐理由与影响

固定上游 OMP 的已发现 Skill 只以 metadata进入 system prompt，正文和relative resources通过受控协议按需读取。项目复用这一语义，同时保留 `PreparedSkillRun` 的 immutable snapshot和本项目自己的 Workflow/result所有权。

### 复核状态

已确认：按用户复核与固定上游源码覆盖原推荐项。

### 用户复核：

忠实参考固定上游 Pi 实现；不增加自创的 Skill eager-loading协议。

---

## D05 — Zotero current view 与 selected items 默认进入多少上下文？

### 问题

Conversation 是否在每一 turn 自动注入当前 Zotero 选区？多选项目和 Workflow selection 应内联多少 metadata？如何避免 UI selection 变化破坏恢复？

### 最终决定

区分“显式附加的 selection snapshot”和“可按需读取的 live current view”：

- Pi Conversation 不在每一 turn 静默注入当前 Zotero view/selection。用户通过明确的“附加当前选择”动作把 selection 绑定到该 turn 或 owner；Agent 若需要未附加的实时上下文，调用 Zotero Native Tool读取。
- Pi Skill Run 只使用 Workflow admission 时已冻结的 selection/input snapshot；运行中 UI 选区变化不影响该 run。
- 被附加的 selection 先转换为 bounded manifest：稳定 `libraryId:itemKey` ref、item kind、title、parent/attachment relation、selection order 和必要的 readiness/count 摘要。abstract、note、tag、collection、attachment正文和完整 metadata 不默认内联。
- 多选保持有序 selection set，不猜测“主要 item”。需要单个 item 的操作必须由 Skill/Workflow input、用户回答或工具调用显式选定。
- 详细 item/note/attachment 内容通过 Zotero Native Tools 按 ref读取。工具读取的是当时 live state，并把实际 source ref/revision/digest写入 tool result/receipt；它不偷偷修改最初 selection snapshot。

### 其它选项

- 每 turn 自动注入当前 selection：操作直观，但后台 selection 变化会造成隐式 prompt 变化、token 浪费和恢复歧义。
- 只暴露 `get_selected_items`，从不保存 selection snapshot：适合临时查询，不适合 Workflow 的可重复输入和 deferred recovery。
- 全量内联所有 selected items：减少工具调用，但对多选文献极易超出 context，并复制敏感正文。

### 推荐理由与影响

现有 host context builder 只提供 bounded identity/title，Zotero MCP 已拥有 `get_selected_items` 和 detail/read 工具。推荐项复用这个分工，并把“用户选中过什么”与“Agent 后来读到了什么版本的内容”保留为两个可审计事实。

### 复核状态

已确认：接受推荐默认项。

---

## D06 — attachments 和用户文件如何进入模型上下文？

### 问题

附件应作为路径、完整正文、provider-native attachment，还是 opaque ref？源文件变化、模型切换和崩溃恢复时如何保证一致性？

### 最终决定

保持两条简单路径，不由 preparation layer 自动物化：

- Zotero attachment 只通过 Zotero Native Tool按稳定 Zotero ref读取；不向 Agent 暴露或推断 Zotero storage路径，具体读取合同由 Zotero Native Tools专票决定。
- 用户文件由宿主提供已授权的原始路径，并把该文件/目录纳入相应 Workspace Scope。Agent使用普通 `read`/Shell按需访问；preparation layer不预先复制到 Managed Agent Workspace。
- prompt只携带必要的路径/ref、display metadata和授权关系，不内联文件正文。实际读取到的内容和结果由tool call/result及receipt记录。
- Agent若主动决定复制文件，复制是一次普通工具操作，遵守能力包络并产生独立receipt；它不是context preparation的隐式步骤。
- 资源在读取前发生变化时，Agent读取的是当时授权路径的live state；已进入transcript的tool result仍是后续context事实。不得用后台自动copy伪造immutable snapshot。

### 其它选项

- 向 Agent提供 Zotero attachment本地路径：泄漏storage layout并绕过Native Tool合同。
- 自动把用户文件复制进workspace：制造不必要副本和生命周期；是否复制应由Agent在任务中决定。
- 自动内联正文或直接传provider：增加隐式context并让provider能力渗入canonical contract。

### 推荐理由与影响

该决定让attachment身份、用户文件路径和Agent主动文件操作各自留在自己的owner中，不为context preparation增加复制层。Zotero读取能力留给Native Tool，普通用户文件遵循已授权路径语义。

### 复核状态

已确认：按用户复核覆盖原推荐项。

### 用户复核：

Zotero attachment 使用 Zotero Native Tool读取；用户文件直接提供路径，不预先物化，Agent可自行决定是否复制。

---

## D07 — tool descriptions 与 tool-use instructions 的 SSOT 是什么？

### 问题

Pi 是否维护自己的工具 prompt？Tool description、JSON Schema、cwd/path语义、permission提示和 provider-specific格式由谁生成？

### 最终决定

Tool Gateway registry 是唯一工具合同事实源。每个 turn 的 tool catalog按以下过程冻结：

1. 从 registry读取 stable tool id、name、description、input schema、effect classifier、版本和 handler identity；
2. 按 owner mode、platform、Runtime Capability Receipt、Agent Capability Envelope 与当前 result seal状态过滤；
3. 生成 provider-neutral immutable catalog snapshot；
4. provider Adapter只做机械 schema/description映射，不增加或删改领域语义。

system prompt只包含最小通用 tool protocol，例如必须尊重 tool result、permission wait不是失败、不得从文件内容推断额外权限。`read`/`edit`/Shell 的具体参数、cwd、continuation和截断语义只写在 registry description中，不能在 prompt模板、Skill 和 Adapter 中各复制一份。

批准一个越界调用只继续原始调用，不改变活动 turn catalog。工具、平台 Shell、provider或 capability变化在下一 turn生效。`TurnPreparationRecord` 保存 catalog schema version、ordered tool identities 和 digest；不复制完整 description正文。

### 其它选项

- 为 Pi 维护独立 prompt/tool清单：可以贴近 Pi SDK，却会与 Zotero MCP、CLI和未来 Adapter 漂移。
- 由 provider Adapter自由改写 description：可针对模型优化，但历史行为无法用项目版本解释，也难以验证等价恢复。

### 推荐理由与影响

这延续已关闭工具票的“同名覆盖 + Gateway-owned execution/policy”决定。Pi Context Preparation只消费目录投影，不拥有工具合同；Zotero Native Tools具体清单仍由其专票决定。

### 复核状态

已确认：接受推荐默认项。

---

## D08 — context transformation 与 token budget 如何计算？

### 问题

哪些内容必须保留，哪些可以延迟或压缩？token window、output reserve、估算误差和 provider差异由谁负责？context过大时能否静默丢消息或截断资源？

### 最终决定

`PiTurnPreparation` 产生 provider-neutral、带类型和 provenance 的 context plan；provider Adapter只做版本化、确定性的最终 wire transform。

有效输入预算按冻结策略计算：

```text
effectiveContextWindow = min(
  catalog model context window,
  provider configuration hard limit（若有）, 
  Resource Policy hard limit（若有）
)

inputBudget = effectiveContextWindow
            - frozen max-output reserve
            - adapter safety margin
```

- catalog未知 context window或 Adapter没有受支持 estimator时，configuration状态为不可运行；不得猜一个宽松上限。
- 优先使用锁定 provider Adapter 的 tokenizer/estimator。没有 exact tokenizer但catalog明确允许 conservative estimator时，使用版本化 estimator和 safety margin，并在 preparation record标为 estimated；不得使用未版本化的字符数经验值。
- max-output reserve来自 `Pi Model Selection Snapshot`/catalog能力；adapter safety margin由 Resource Policy按 Adapter版本设定。数值默认值留给 acceptance ticket，运行时使用的实际值必须冻结和记录。

内容保留优先级固定为：

1. runtime/capability/owner hard instructions；
2. 当前 Workflow/Skill output contract和活动 user turn；
3. 未结算 interaction、permission与完整 tool-call/result配对；
4. selected compaction summary与其 retained tail；
5. owner历史 active path；
6. lazy resource manifests和可再次读取的派生说明。

这是token admission与compaction的结构顺序，不是对自然语言含义或冲突的权威裁决。它也不是按优先级静默删除正文的授权。历史超限必须先走合法 compaction；单个当前 user input、mandatory context block、tool schema或不可拆分 modality本身超过预算时，调用前失败为结构化 `context_budget_exceeded`。大资源保持ref并按需读取；tool输出遵循 Tool Gateway已有 bounded result和scratch-file continuation合同。

provider transform必须保持 message role、assistant text segment、tool call/result pairing、hard boundary与modality identity。不能按 backend/provider字符串特判 transcript coalescing，也不能修改 canonical transcript。transform/schema/Adapter版本与输出 digest进入 preparation provenance。

### 其它选项

- 让 Pi SDK/provider自行截断：实现最少，但项目无法解释丢了什么，也无法恢复等价行为。
- 为各类内容固定百分比配额：可预测，却浪费空闲预算并迫使调用方理解内部布局。
- 字符数乘常数作为所有模型的统一估算：方便，但对多语言、tool schema和不同 tokenizer误差不可控。

### 推荐理由与影响

预算属于 turn preparation，provider能力只是输入之一。公式保持稳定，具体阈值可在 acceptance ticket中调优；任何一次实际调用仍有完整冻结证据。

### 复核状态

已确认：接受推荐默认项。

---

## D09 — automatic/manual compaction 的触发、内容和失败语义是什么？

### 问题

何时自动压缩？用户能否手动压缩？summary由哪个模型生成，保留哪些 tail，冲突或失败后如何恢复？

### 最终决定

compaction 是 `PiTurnPreparation` 调用的独立深层流程，只有在安全边界运行：没有未结算 tool call、permission、interaction或 outcome-unknown effect；当前 transcript revision和active leaf已持久化。

自动触发分两种：

- 新 turn/pre-provider preflight发现完整 context plan超出 `inputBudget`；
- Agent loop在一次模型调用结束、所有tool receipt结算后，预测下一次 invocation会超出预算。

不以固定消息条数触发，也不在 streaming中间压缩。acceptance ticket可以给出 proactive headroom阈值，但即便关闭提前触发，超过硬预算前仍必须 compact或失败。

手动 compaction只在 owner idle且处于同一安全边界时开放，作用于当前 branch。它调用同一 planner、prompt、validator和CAS commit，不另写一套“整理聊天”逻辑。MVP不允许用户直接编辑 summary正文；用户若不接受结果，可保留原branch并不选用该 entry。

summary使用 project-owned、版本化 compaction prompt，默认采用触发时冻结的同一 provider/model configuration，并记录独立 `Pi Model Invocation` usage/cost。禁止因失败静默切换 provider或credential。用户可显式选择另一可用模型执行手动/恢复性 compaction；该选择、cross-model事实与兼容性检查写入 compaction entry。

summary schema至少保留：

- 用户目标、已确认决定和硬约束；
- 当前计划/未完成事项；
- 重要 artifact/resource refs及其用途；
- 已完成 tool effect与receipt refs；
- 未解决问题、pending recovery和禁止自动重放的 unknown state；
- 对后续理解必要的关键事实与来源 refs。

不得把 runtime/system instructions、tool schema、当前 capability envelope或未结算控制状态总结进可替代的自然语言摘要；它们在每 turn重新解析。retained tail必须按完整语义单元保留，不能拆开 user/assistant消息、tool call/result组或interaction/permission边界。tail token目标属于版本化 policy，不以固定消息数表达。

compaction result提交前校验 schema、覆盖范围、retained refs、input digest和token fit，再对 `active leaf + transcript revision`做CAS。stale结果丢弃并重新规划；生成/校验/写入失败都不改变当前context selection。原始entries永不删除。

### 其它选项

- 达到固定消息数自动摘要：实现直观，但消息大小差异使阈值失真。
- provider无关的廉价默认模型：可省成本，却会引入隐式credential/provider切换和恢复差异。
- 本地启发式删除旧tool结果：不花模型调用，但会破坏语义和tool pairing，也绕过append-only compaction事实。

### 推荐理由与影响

推荐项完整继承 ADR-0001 的 branch-scoped append-only entry和CAS规则，同时补足触发、prompt、tail和failure语义。用户手动操作与自动操作共享同一事实源。

### 复核状态

已确认：接受推荐默认项。

---

## D10 — provider/model switching 如何影响 context 和 compaction？

### 问题

切换 provider/model是否重写历史？何时允许切换？新模型的 context window、tool/modality能力不足时如何处理？waiting_user continuation是否属于同一冻结选择？

### 最终决定

provider/model只在新 `Pi Runtime Turn` 生效；活动 turn的 `Pi Model Selection Snapshot`不可变。

- Pi Conversation只在没有活动 turn时修改下一 turn选择。
- Pi Skill Run只在 `waiting_user` 或用户主动 `suspended` 时允许修改，沿用已关闭 Workspace票的产品决定。用户回答/恢复会创建带 `continuesTurnId` 的新 turn，因此可以合法采用新 snapshot。
- 历史 transcript、usage、cost、tool facts和compaction entries不因切换而重写；新的 provider Adapter从稳定 transcript DTO重新投影。
- preflight验证目标模型的 context window、tool use、reasoning和所需 modality。能力不足时返回明确的 `model_capability_incompatible`，不得删除工具、图片或 reasoning level后静默运行。
- 目标模型 window较小时，允许在新 turn前按 D09生成新的compaction entry。自动compaction默认使用准备采用的目标模型；若它连待压缩输入都无法接收，必须让用户显式选择兼容 compaction模型或保留原模型，不能隐式借用其它credential。
- existing compaction summary可以跨provider消费，因为它是项目稳定DTO；entry保留生成它的 provider/model/prompt/schema provenance。Adapter若无法表达其中必须的modality或tool semantics，preflight失败。

### 其它选项

- 同一活动 turn中热切换：减少等待，但会让一次 turn的usage、stream和tool loop跨多个冻结策略，恢复很难定义。
- 切换时重新总结所有历史：行为一致性表面更强，但增加成本，并把切换变成隐式历史改写。
- 能力不足时静默降级：体验顺滑，却违反 provider配置票已确定的“unsupported reasoning不得静默降级”。

### 推荐理由与影响

该规则与 owner-serialized turns、durable wait会释放 Runtime Session、selection snapshot按turn冻结完全一致。“继续同一对话/运行”不意味着复用旧的live turn handle。

### 复核状态

已确认：接受推荐默认项。

---

## D11 — “replay”究竟指 context reconstruction 还是 execution replay？

### 问题

崩溃、重启、eviction或provider切换后，系统可以自动重做哪些动作？如何避免把“重建模型上下文”误解为“重新调用 provider/tool”？

### 最终决定

领域语言明确拆成两个概念：

- **Pi Context Reconstruction（Pi 上下文重建）**：从 canonical transcript、selected compaction、immutable resource snapshots和当前允许的新 turn policy，确定性重建可提交给模型的context projection。它不产生外部副作用，允许自动执行。
- **Execution Replay（执行重放）**：再次发出 provider请求、tool call、Zotero mutation或外部网络操作。它默认禁止自动执行，只有已有专门合同证明幂等并使用原幂等键的same-request reconciliation例外。

恢复流程只返回 assessment和prepared plan，不自行dispatch。规则如下：

- committed message与完整tool call/result pair可以进入重建；partial assistant只用于UI显示，不进入model input。
- provider请求已发出但没有terminal证据时，不自动重发；创建新 attempt需要用户/owner policy明确决定，并保留原failure/unknown accounting。
- tool已started但无权威receipt时进入 `state_unknown/recovery_required`，不自动重放。
- waiting_user、waiting_permission和suspended的continuation创建新 turn，从canonical pending record与tool receipts重建；不复用旧 Runtime Session。
- sealed Skill result、Finalizer、apply receipt和terminal ACK可以按各自幂等合同补齐，不要求模型重新生成结果。
- cache miss、Runtime Session eviction、window unload本身不构成失败；只要canonical facts和immutable resources完整，就自动重建。

该术语已由用户接受，更新到根 `CONTEXT.md`。

### 其它选项

- 统一使用 replay：短，但会混淆无副作用projection与可能重复副作用的execution。
- 所有崩溃都要求用户手动重试：最保守，却会把安全的cache/session重建也变成人工负担。

### 推荐理由与影响

现有 persistence、lifecycle和failure票都已经禁止未知provider/tool outcome自动重放。明确术语能让实现、UI recovery action和测试共享同一含义。

### 复核状态

已确认：接受推荐默认项。

---

## D12 — 等价恢复需要保存哪些 durable evidence？cache 的正确性边界是什么？

### 问题

不保存完整provider request时，怎样证明恢复后的行为等价？资源、catalog或Adapter版本缺失时能否“尽量继续”？是否允许用context cache/full mirror作为恢复捷径？

### 最终决定

每个 provider invocation前先持久化一个 versioned `TurnPreparationRecord`。它是durable provenance，不是prompt-cache key，引用而不复制canonical正文，至少包含：

- owner kind/id、turn id、runtime generation；
- transcript generation/revision、active leaf、selected compaction entry及input digest；
- ordered instruction source refs、trust classification、snapshot revision、content digests和resolver version；
- `PreparedSkillRun` identity/version/snapshot digest、Workflow input/output contract digests（若适用）；
- Zotero selection refs/revisions/digests、Zotero attachment refs、已授权用户文件path refs和resource manifest digest；文件正文只有实际tool read后才进入tool result，不预先物化或hash整份内容；
- ordered tool catalog identities、schema version、catalog digest、capability envelope/ref digest与Runtime Capability Receipt ref；
- `Pi Model Selection Snapshot`的非secret字段、catalog revision、provider Adapter version、reasoning和modality policy；
- effective context window、input/output reserve、estimator/version、safety margin、pre/post transform token stats与budget policy version；
- prompt/instruction/compaction/transform schema versions、最终prepared context digest；
- bounded warnings、missing optional resources和preparation timestamp。

不保存 credentials、headers、plaintext secrets、完整provider wire body、重复message/resource正文、SDK/executable object、绝对用户路径或audit禁止的semantic body。

“等价恢复”定义为：在同一canonical revision和immutable source snapshots上，使用合同兼容的resolver/Adapter/schema，得到相同语义块、顺序、tool identity、budget decision和prepared context digest；不承诺第三方SDK序列化字节、HTTP header顺序或provider内部行为完全相同。

恢复门禁只约束已声明immutable的Skill/Workflow/control snapshot、tool/catalog/Adapter合同和已经进入transcript的事实；用户文件path在实际读取前仍是live resource：

- 必需immutable resource缺失/digest不匹配、catalog identity不可解析、Adapter/transform schema无兼容实现、tool/capability snapshot无法验证时，返回 `recovery_required`；不得用当前文件或catalog静默替代。
- optional lazy resource缺失可以继续，但必须在新 preparation record和Agent-visible manifest中明确标记，不得伪装为历史等价重建。
- 用户明确选择“以当前资源开始新 attempt”时，创建新 turn/branch和新 preparation record，保留旧失败事实；它不是恢复原 invocation。

cache与durable evidence分层，忠实参考固定上游的append-only/stable-prefix设计：

- provider `sessionId`、`promptCacheKey`、`providerSessionState`只作为可失效的transport/cache hint，绝不充当checkpoint、恢复证据或transcript事实；
- stable-prefix cache冻结system prompt与tool specs，按ordered message entry/content digest链寻找最长字节稳定前缀；新增尾部消息只扩展suffix，不因owner revision整体变化而全量miss；
- selection、用户文件path、lazy Skill resource或tool result只在实际进入消息suffix时影响相应segment，不把所有resource digest塞进一个巨型复合key；
- model/provider、system prompt、tool catalog或provider transform发生不兼容变化时，调用上游等价的model-change invalidation并重建prefix；
- whole-context cache可以作为次级优化，但不是主要命中机制。任何cache miss/corruption都删除并从canonical transcript/projection重建。

直接复用顺序为：

1. 若兼容性原型证明所选精确`pi-agent-core/pi-ai`版本的 `AgentMessage` extension、`transformContext -> convertToLlm -> transformProviderContext`、append-only context、token/compaction API在Zotero 7/9中无Node/Bun可达依赖，则直接通过项目seam复用；
2. 只有部分public seam可用时，直接复用可用纯接口，文件、persistence、owner orchestration和cache storage由Zotero Adapter实现；
3. current OMP main或`pi-coding-agent`的Bun/Node session/blob/filesystem实现未经验证不得导入，只语义复用durable entry + ref/digest + rebuild模型。

preparation failure使用既有 `PiFailureCore` taxonomy和 `origin = turn_preparation`。stable code区分required resource missing、budget exceeded、compaction failed/stale、model capability incompatible、transform unsupported与integrity failure；不再包含被D02否定的`instruction_conflict`。公开参数只带安全ref、类别和恢复动作。

### 其它选项

- 持久化完整provider request：可做字节级重放，但复制大量敏感正文，制造第二SSOT，也仍不能证明provider外部行为相同。
- 只保存transcript revision和当前catalog：记录很薄，却无法判断Skill、tool schema或Adapter是否已漂移。
- 有资源漂移时尽力继续：可用性更高，但会把新输入冒充成旧恢复，尤其危险于Workflow和mutation路径。
- 用包含全部digests的单一cache key：实现简单，但任何suffix变化都会摧毁prefix复用，显著降低provider prompt-cache命中率。

### 推荐理由与影响

该记录补齐 ADR-0001 的preparation provenance，同时避免把provenance字段机械等同于cache key。上游最长稳定前缀适合追加式Agent历史；持久化和cache storage仍必须符合Zotero/no-Node约束。

### 复核状态

已确认：按用户复核与固定上游源码重写，优先直接复用经兼容性原型证明可用的public seam。

### 用户复核：

参考固定上游的stable-prefix/append-only context设计，避免巨型复合key；经Zotero兼容性验证后尽量直接复用public seam。

---

## 决策之间的依赖检查

推荐默认项形成的执行链如下：

```text
Owner command / Workflow admission
  -> freeze owner facts and optional PreparedSkillRun        [D01, D03, D04]
  -> assemble ordered instruction/context blocks faithfully  [D02]
  -> snapshot explicit Zotero selection and attachments      [D05, D06]
  -> freeze Tool Gateway catalog and model selection          [D07, D10]
  -> project transcript + selected compaction                 [D08, D09]
  -> enforce budget; compact only at a safe boundary          [D08, D09]
  -> persist TurnPreparationRecord                            [D12]
  -> provider Adapter transform
  -> Pi Runtime invocation

Restart / eviction
  -> assess canonical facts and immutable resources           [D11, D12]
  -> reconstruct context, never infer permission to replay    [D11]
```

交叉检查结果：

- 没有把 prompt/context projection提升为 transcript SSOT。
- 没有让 Runtime 裁决自然语言指令语义或冲突。
- 没有把 Tool Gateway、Zotero Native Tool清单或 Workflow apply并入 turn preparation。
- 没有要求 Node runtime、Node filesystem API、目录 watcher或开发服务器。
- 没有让 provider/model切换修改活动 turn或历史记录。
- 没有允许 compaction删除原始entries或切开tool/interaction边界。
- 没有把 context/transcript revision放入 Assistant Workspace非transcript region signature。
- 没有授权未知provider/tool副作用自动重放。

## 用户复核表

请在复核时按需填写；也可以直接回复“全部接受”，或只写需要覆盖的编号。


| 编号  | 决策简称                             | 当前默认                                            | 用户复核 |
| --- | -------------------------------- | ----------------------------------------------- | ---- |
| D01 | 深层 preparation seam              | `SkillRunPreparation` + `PiTurnPreparation`     | 已确认  |
| D02 | context assembly                 | 忠实组装；不做自然语言权威/冲突裁决                              | 已确认（覆盖） |
| D03 | 指令发现与冻结                          | turn snapshot；只解析 Managed Agent Workspace       | 已确认（覆盖） |
| D04 | Skill 资源加载                       | 上游 metadata-first + containment read             | 已确认（覆盖） |
| D05 | Zotero selection                 | 显式 snapshot + live tools按需读                     | 已确认  |
| D06 | attachment/file                  | Zotero Native Tool；用户文件原始授权路径                  | 已确认（覆盖） |
| D07 | 工具合同 SSOT                        | Tool Gateway registry                           | 已确认  |
| D08 | transform/token budget           | frozen formula + versioned estimator；不静默截断      | 已确认  |
| D09 | compaction                       | safe-boundary、append-only、CAS、同一深层流程            | 已确认  |
| D10 | provider/model switch            | 仅新 turn生效；能力不兼容即失败                              | 已确认  |
| D11 | context reconstruction vs replay | 前者可自动，后者默认禁止                                    | 已确认  |
| D12 | durable evidence/cache           | provenance与cache分层；上游stable-prefix优先             | 已确认（覆盖） |


## 复核后动作

用户已完成复核。收尾动作：

1. 本记录已按复核结果修订；
2. 将确认的新领域词汇更新到 `CONTEXT.md`；
3. 在票据发布收敛后的 resolution并关闭票；
4. 在 Wayfinder map 的 Decisions so far追加只含 gist和票据链接的context pointer；
5. 把精确上游public seam的直接复用验证补充到已有兼容性原型票，不创建重复ticket。
