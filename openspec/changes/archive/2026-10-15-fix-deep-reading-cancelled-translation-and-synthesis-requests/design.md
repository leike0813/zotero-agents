# Design

## Context

动机见 [proposal.md](proposal.md)。两个症状出现在同一次深度阅读运行中，但根因分属不同所有者：前者属于工作流包的 apply hook 对 Skill 结果语义的解释，后者属于内置 Skill 运行时构造 Host Bridge 请求时的字段契约漂移。

设计必须保持以下边界：

- 取消是 Skill 输出契约的一部分，不是宿主错误；按结构化 `status` 判定，不匹配 reason 文案。
- 真实失败、缺失产物和非成功诊断状态继续走既有错误路径，不因新增分支被吞掉。
- Synthesis 生产协议与 Rust sidecar 是契约所有者；本次只让调用方发出合法请求，不在插件侧放宽或改写 Schema。
- `skills_src` 是 Skill 源码所有者，`skills_builtin` 是其生成产物；两者必须一致。

## Goals / Non-Goals

**Goals:** 让取消成为无噪声的正常跳过，让深读发出的每一条引用与引用图请求都能通过生产 Schema 校验，并把图容量上限收敛到宿主真实上限。

**Non-Goals:** 不修改宿主协议、Rust 侧校验或 Synthesis 界面；不为请求失败增加重试、截断或降级兜底；不改动 `failed` 状态翻译产物的既有落库行为。

## Decisions

### 1. 在 apply hook 入口按结构化状态分流

读取结果并收集 skill diagnostics 后，立即判断 `status === "cancelled"`；命中则返回跳过结果，不再进入路径解析和产物物化。

把判定放在 `resolve-paths` 之前，可以避免为已取消的运行解析源附件路径。返回体复用包内 `literature-search-ingest` 已有的 `ok / applied / skipped` 表达，不引入新的结果形状；取消原因和 warning 通过既有 `appendSkillDiagnosticsToResult` 保留。按 reason 文案匹配会随文案漂移，因此不采用。

### 2. 让测试用生产 Schema 校验真实请求

既有深读测试的假 Bridge 接受任意输入，因此字段漂移长期未被发现。新增断言在真实 Python runtime 产出请求后，交给生产 `rebuildSynthesisProtocolCapabilityDto` 校验引用索引、图切片与布局三条路径。

校验放在测试侧而不是运行时侧：运行时没有可靠的 Schema 副本，重复实现只会引入第二事实源。假 Bridge 仍保留宽松响应，以免把测试绑定到宿主实现细节。

### 3. 切片与布局分别构造请求

切片请求使用 `filters.includeLowSignal`；布局请求按自身契约保留顶层 `includeLowSignal`，并在切片请求加 filters 之前构造完成。

原先布局请求由切片请求展开得到，任何切片字段变化都会连带影响布局。两个能力的 Schema 已由 sidecar 分别定义，独立构造是唯一能同时满足两者的写法。

### 4. 容量上限向宿主真实上限收敛

深读 context schema 与 runtime 校验/规范化统一为 100 节点、200 边，默认值保持 80/160。

宿主图切片上限为 100/200，而深读此前声明 5000/20000，允许构造出必然被拒绝的请求。选择在提交阶段拒绝而不是静默截断：截断会让 Agent 拿到不完整引用图却无明确信号，拒绝则让失败点在进入 Host 之前可见。

## Risks / Trade-offs

- 取消分支可能掩盖真实失败 → 只匹配 `cancelled`，`failed` 与缺失产物仍按原路径报错，并由既有诊断用例覆盖。
- 上限收紧可能拒绝此前能提交的请求 → 这些请求原本必然被宿主拒绝；默认值未变，只有超限输入的行为从“静默失败”变为“明确拒绝”。
- 测试依赖生产 Schema 校验器 → 该模块为纯 JSON Schema 校验，无运行时副作用；契约变更时测试会与实现同时失败，符合预期。
- 3 项 bootstrap 用例受环境阻塞 → 见 tasks.md 的 Validation boundaries，不能以定点通过替代完整测试域结论。

## Migration Plan

无需数据迁移。Skill 生成文件随同一个插件构建交付；主规格已同步本轮行为。本 change 保留为活动记录，未归档、未提交。构建与发布不属于本次补记。
