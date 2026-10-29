# Proposal

## Why

ACP 运行时选项（mode / model / reasoning）当前会推断、折叠和降级：raw model ID
被按后缀折叠成「显示 model + effort」，reasoning 在后端没有显式 `thought_level`
时从 model variant 派生，后端拒绝某项配置后还会静默回退到 current 或
model-default。用户无法知道会话实际用的是哪个模型与推理档位，也无法区分
「我选的」和「插件猜的」，错误的配置请求还会被静默吞掉。

## What Changes

- **BREAKING** 所有 raw model ID 完整保留（`gpt-5@high`、`some-model:v:thinking`、
  `model@low` 各自独立）。不推断后缀、不折叠成 base model、不从 model 派生
  reasoning。
- reasoning 只来自后端显式 `thought_level` 元数据；不再存在 model-derived
  reasoning，也不再补默认值。
- 未指定 mode / model / reasoning 时不发送任何配置覆盖 RPC；UI 显示后端
  current，没有 current 时保持 unset，不回退到 catalog 第一项。
- **BREAKING** 无效或含糊的显式选项保留原值并报
  `provider_profile_option_unavailable`：不回退到 current、不取第一项、不切换到
  另一 variant，也不自动迁移旧 profile。
- 公共字段名保持不变，`acpModelId` 仍为完整 raw model ID；仅删除内部
  model-derived 来源，旧 derived cache 不再执行。profile 失败一律保留请求原值，
  不派生 provider-qualified 形式，也不迁移到裸 model 名。
- 后端拒绝配置时，JSON-RPC `-32601` / `-32602` / `-32603` 原样传播；已存在
  advertised config setter 的 category 报错即失败，不切换 RPC 路径救场；只有缺少
  该 category 时才走原生 model / mode RPC。
- 只有 RPC 成功或后端权威 update 确认才提交 current；启动期配置失败阻止首 prompt，
  且不进入输出 repair 或 result-file fallback。
- 失败证据通过既有 ACP diagnostics 与 `runtime-log.details` 保存（脱敏），
  `message` 包含后端 `data.details`。
- live catalog 以 session 实时元数据为准；backend cache 只用于离线展示与提交前静态
  membership 检查，不用 stale categories 覆盖实时声明。
- 删除 `acpReasoningEffortFallback.ts` 与 Kilo 降级路径。
- 不修改 MiniMax 后端与模型元数据、不改本机配置、不改变 output convergence 与
  native 其他生命周期语义。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `acp-model-effort-selector`: 移除 model suffix 折叠与 Kilo 降级；raw model ID
  完整保留，reasoning 仅来自后端显式元数据。
- `acp-skills-runtime-options`: 未指定选项不发送配置覆盖、current 仅在确认后
  提交、缓存不得覆盖实时 catalog 声明、删除 model-derived reasoning 状态。
- `backend-provider-profile-contract`: 无效显式选项保留原值并返回
  `provider_profile_option_unavailable`，不再静默替换为默认值。
- `acp-skillrunner-compatible-runner`: 删除 Kilo thought-level 降级 Requirement；
  启动期配置失败阻止首 prompt 且不进入 output repair / result-file fallback。

## Impact

- 代码：`src/modules/acp/**`（chat、skillRun、transport、diagnostics）、
  `src/providers/acp/provider.ts`、`src/providers/profile.ts`；删除
  `src/modules/acp/**/acpReasoningEffortFallback.ts`。
- 公共契约字段名与 `acpModelId` 语义保持兼容；行为层面的 fallback 语义为破坏性变更。
- 文档：`docs/components/assistant-workspace-acp-surface-ssot.md`、
  `docs/acp-skills-state-machine-ssot.md`、`docs/components/acp-skillrunner-parity.md`。
- 受影响测试：runtime-options(96)、connection(100)、compatible(107)、
  assistant chrome(192)、acp-model-effort-selector(181) 及相关 Node shards、
  typecheck、scoped lint。
- 不涉及依赖变更、数据库迁移与外部后端改动。
