# Design

## Context

Current-state facts that shape this approach (motivation in proposal.md):

* ACP 目录同时存在 `configOptions`（含 `thought_level`）与 legacy `modes` / `models`，
  多个模块各自补全 category 缺口。
* 存在 `acpReasoningEffortFallback.ts`：按后端标识与错误文案判定 Kilo 拒绝并静默降级。
* 存在 model-derived reasoning 内部状态与 derived cache，靠 provenance 决定是否重算。
* Chat 与 Skills 共享协议级 catalog 归一化，但 current 值归属不同（live session vs
  持久化 run-effective）。
* 已有 ACP diagnostics 与 runtime-log `details` 脱敏通道可承载结构化失败证据。
* 公共字段名与 `acpModelId` 已被多处消费，属于稳定契约。

## Goals / Non-Goals

**Goals:**

* 单值语义：每个 raw model ID 与每个后端声明的 reasoning 值都是独立可选值。
* 无静默替换：任何「用户没选的」或「后端拒绝的」值都不成为生效值。
* 失败可诊断：后端拒绝原样上报，可定位到 method / configId / value。
* 保留既有分层与公共字段名。

**Non-Goals:**

* 不修改 MiniMax 后端实现、模型元数据或本机 profile 配置。
* 不改变 output convergence、result-file fallback 的正常路径语义（只在启动配置
  失败时不再进入这些路径）。
* 不改动 catalog readiness、provider 分组、favorites、transcript 与 native 其他生命周期。
* 不做旧 profile 或旧 derived cache 的数据迁移。

## Decisions

### 1. raw 值直传，不做规范化层

所有 model / reasoning 值以后端声明的字符串原样保存与传输。选择它而非新增
「display alias」字段：alias 会引入第二套标识、需要映射表，且与「不推断」的目标
相悖。代价是 UI 变长，但 picker 已是可搜索的分组列表。

现有 `state.displayModels` 与 `state.rawModels` 双字段可以保留，不要求 rename，
但两者必须一一对应且取值相同（即 display 值就是完整 raw ID），任一字段都不得把
多个 raw ID 折叠成一个共享 model name。保留双字段是为了不牵动已发布的 wire
形状，而不是为了承载两套不同的标识语义。

### 2. reasoning 只有一种来源

reasoning state 仅来自后端显式 `thought_level`（或等价显式 reasoning 元数据）。
删除 model-derived 来源与 derived cache 执行路径，而不是保留但置空：置空会留下
两个分支和 provenance 判定，后续维护者容易重新启用。

### 3. 未指定 = 不发送

category 未指定时不发 `session/set_config_option`，也不调原生 model/mode RPC。
UI 显示后端 current；后端未提供 current 时保持 unset，不取 catalog 首项。选择它
而非「显式发送 unset」：后者需要每个后端都接受清空语义。

### 4. 无效显式选项 = 失败，不替换

`provider_profile_option_unavailable` 携带原始值，不做 current / 首项 / 同族
variant 回退，也不迁移旧 profile。理由：静默替换会让用户以为设置生效，而实际跑在
另一个模型或档位上，错误在长任务里很难发现。

### 5. 配置路径由「是否声明」决定，不由「失败」决定

category 有 advertised config setter 时只用该 setter；失败即失败。缺少该 category
时才使用原生 model / mode RPC。不用「先试 setter，失败再换路径」，因为部分后端在
失败时已改变部分状态，双路径会掩盖真实拒绝原因。

### 6. current 只在确认后提交

生效值提交点为：setter RPC 成功，或后端权威 update 确认。乐观先行提交会让失败值
在 UI 上短暂显示为已生效，且 recovery 会重放错误值。

### 7. 复用既有诊断与 runtime-log 通道

把 `code` / `data` / `method` / `configId` / `value` 交给现有 ACP diagnostics 与
runtime-log `details`，并要求 message 带上后端 `data.details`。不新建错误体系：
新通道会被绕过，且脱敏规则会分叉。

### 8. cache 降级为离线展示与静态检查

live session 声明的 category 集合与选项权威；cache 只服务于离线展示和提交前
membership 预检。不用 cache 补实时缺口，是为了避免 stale category 变成可选项。

### 9. 删除 fallback 模块

`acpReasoningEffortFallback.ts` 整体删除，调用点一并移除。保留文件但空实现会留下
「按后端身份分支」的结构，正是本次要消除的模式。

### 10. 不做历史数据迁移

旧 profile 中的失效值在下次提交时以 `provider_profile_option_unavailable` 暴露，
由用户重新选择。迁移需要猜意图，与本变更目标冲突。

## Risks / Trade-offs

* [用户需重新选择模型] → 失败信息包含原始值与不可用原因，重新选择即可；不做猜测迁移。
* [部分后端只提供折叠 model 且无 thought_level] → 用户直接选带后缀的 raw ID，
  reasoning 保持 unset，符合「不推断」契约。
* [删除 fallback 后原本被静默降级的运行改为失败] → 这是有意的可见化，spec 与诊断
  证据足以定位。
* [删除 model-derived reasoning 影响 Chat 面板既有展示] → 后端无显式 reasoning
  元数据时 reasoning 保持未选，既不显示派生值也不补 default。
* [删文件牵连多处调用点] → 由 tasks 逐个收敛调用点，编译错误作为完整性检查。
