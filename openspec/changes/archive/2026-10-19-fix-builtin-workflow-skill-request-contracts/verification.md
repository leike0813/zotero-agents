# 验证记录

日期：2026-10-19。关联错误：`log-3394691`。

## 根因与复现

真实失败请求的 parameter 包含 `usePlannedTopic`、`plannedTopicId`、`topicSeed`、`language`，其中 `usePlannedTopic=true`。已安装的 create preparation Schema 与修复前仓库版本逐字节一致，只接受 seed/language，因此两个合法新增字段分别触发一次 additionalProperties 错误。原诊断未保留 AJV 的 additionalProperty，只显示两条相同的根路径错误。

这排除了本次故障由安装内容漂移引起的可能。使用生产校验器重放请求可复现原始两条错误；分别移除两个字段会减少错误数量，但会丢失运行时所需意图，不是修复方案。即使越过 preparation，core/finalize 的旧 Schema 也会拒绝序列继承的同一组参数。

历史检查定位到 `f76b5316f`：manifest、Python runtime 与 Skill 指令引入 Planned Topic 入口时，renderer 的 `parameterSchemaForSkill` 未同步。`87b666e1a` 的表单变化再次暴露了这条路径。请求构造器还会合并 manifest 默认值，因此 ad-hoc 请求也可能携带 `usePlannedTopic=false`，问题不限于 planned 模式。

修复后，原始捕获请求未经裁剪通过当前源码 Schema。重放只输出成功状态与参数键，未把原始请求、用户内容或本地路径写入仓库。

## 为什么已有契约加固未发现

存在测试边界遗漏，也存在场景维护滞后。

- `c224e609a` 的 Synthesis 加固针对 sidecar 的 TS/Rust 协议、apply 与持久化；其 workflow producer 分母来自 `workflow:${id}:persisted`，不能证明请求能通过首次 ACP admission。
- 原 `153` 测试断言旧字段列表，并手工构造符合旧 Schema 的请求；新增参数没有进入该测试。
- `124` 的工作流测试到请求构造为止，`155` 直接执行 Python gate；两者都未贯通实际 producer 与 ACP 校验器。
- 调查时，相关四组旧测试仍然通过，而真实请求重放失败。增加局部校验强度并不能弥补生产者与消费者之间缺少联测的问题。

## 实现与覆盖口径

主题 Schema 的事实源仍为 renderer，三个生成文件同步更新。create preparation 按模式要求非空 plannedTopicId 或 topicSeed，允许非活动输入保留空字符串；core/finalize 接受继承字段；update preparation 与 topicId 非空约束保持原有语义。所有相关 Schema 继续拒绝未知字段。

全量内置工作流调查另外修复了两处表单必填声明，以及 Tag Bootstrapper 非空参数命名空间缺少 Schema 的问题。共享 AJV 诊断现在保留额外或缺失属性的 JSON Pointer，不输出提交值。

新的 producer suite 从生产 package 声明推导清单，运行真实 settings normalization、request hooks、ACP adapter 和 sequence runtime，再调用生产 admission validator。Agent 输出由经过输出 Schema 校验的合成 handoff 代替；需要文件的步骤使用临时文件。

| 口径 | 本次结果 |
| --- | --- |
| 已登记内置工作流 | 42 |
| 具备可执行场景的 Skill 工作流 | 32（17 个 job、15 个 sequence） |
| 非 Skill 工作流 | 10（9 个 pass-through、1 个 generic-http），单列、不计入 Skill 校验 |
| producer suite 测试 | 53 项通过，含清单检查与分支场景 |
| 实际调用的不同 Skill | 26 |
| 经校验的不同 Skill/input 或 Skill/parameter 边界 | 44 |
| 无 Schema 且为空的命名空间 | 8，标记 unused，不计入已校验边界 |

分支包括 planned/ad-hoc、update 继承、analysis tagging 与 score-only、deep-reading 翻译与 alignment 复用、PDF 入口、metadata 预检命中/缺标识/未命中/显式跳过、debug 条件步骤与文件 handoff。新登记的 Skill producer 缺少场景，或非空命名空间缺少 Schema，均会使测试失败。这不表示穷尽每个参数组合。

8 个 unused 命名空间为：

- `debug-host-bridge-connectivity-probe/input`
- `debug-host-queue-probe/input`
- `debug-host-queue-probe/parameter`
- `debug-interactive-choice-probe/input`
- `debug-sequence-probe-emit/input`
- `literature-metadata-search/parameter`
- `literature-search-ingest/input`
- `manuscript-literature-framing/input`

## 执行结果

先补失败用例，再实现修复。主题测试首先拒绝新增字段与缺 seed 的 planned 请求；辅助测试首先暴露表单缺必填、Tag Bootstrapper 缺 Schema、诊断丢失字段路径等问题。修复后均通过。

| 命令或检查 | 结果 |
| --- | --- |
| 原始捕获请求 → 当前源码的生产 validator | 通过 |
| 临时 renderer 输出与已提交的四个 parameter Schema 逐字节比对 | 全部一致，含未修改的 update preparation |
| `node --import tsx node_modules/mocha/bin/mocha tests/workflows/builtin-skill-request-contracts.test.ts --require tests/setup/zotero-mock.ts --reporter dot` | 53 passing |
| 下列 ACP/sequence/topic/requiredness 集成命令 | 304 passing |
| `npm run test:node -- --shard workflow-engine --reporter dot` | 22 个文件，退出码 0 |
| `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` | 通过 |
| `npm run check:builtin-workflow-manifest` | 通过，163 个文件 |
| 修改的生产 TS 与五个测试/辅助 TS 的 ESLint | 通过 |
| 全部修改与新增的可格式化文件 Prettier `--check` | 通过 |
| `openspec validate fix-builtin-workflow-skill-request-contracts --strict` | 通过 |
| `git diff --check` | 通过 |

集成命令：

```shell
node --import tsx node_modules/mocha/bin/mocha tests/skillrunner/107-acp-skillrunner-compatible-runner.test.ts tests/skillrunner/154-skillrunner-sequence-runtime.test.ts tests/synthesis/124-synthesize-topic-workflow.test.ts tests/synthesis/153-topic-synthesis-suite-renderer.test.ts tests/synthesis/155-topic-synthesis-split-runtime.test.ts tests/workflows/builtin-skill-requiredness.test.ts --require tests/setup/zotero-mock.ts --reporter dot
```

## 限制与交付边界

本次新证据止于本地 Skill request admission 与合成输出的后续步骤继承。没有执行真实 Agent、远程 SkillRunner、Zotero GUI/E2E 或插件 build，不宣称这些边界已验证。renderer 位于现有 ESLint 忽略范围，运行时行为与生成一致性由其专项测试覆盖；仓库 TypeScript 配置不包含 tests/skills_src。

已安装内容未被修改；源码修复须经独立的内容发布与安装流程才能进入用户运行环境。本次没有发布、提交代码、变更依赖或修改用户库。
