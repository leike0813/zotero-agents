# Proposal

## Why

`d03aafa89`、`148ac3512` 的工作流选项修复引入了独立默认项、模型切换自动探测及旧选项回写，偏离用户指定的 main/v0.8.4 交互基准。本 change 补录本次已实现的修复及用户确认的行为边界，使源码、主规格与验证记录可追溯。

## What Changes

- 两处工作流表单直接显示缓存中的真实默认选项，不增加默认项或后缀；未手选的值不形成运行覆盖，主动选择才固定模型。
- 切换 model provider 只在 backend 的完整缓存中筛选并选择该提供商首项；打开表单及切换 backend/provider/model 均不自动探测。
- backend 专属选择按 workflow、当前表单生命周期记忆；切回恢复有效的 provider/model/mode/reasoning，丢弃失效记录并采用目标 backend 默认规则。通用设置保留。
- 缺少有效 current 的 model/mode 显示目录首项。缓存过期提示手动刷新并继续展示旧缓存；缺少对应 reasoning 时禁用并保持未指定。
- 统一两处宿主对未回声草稿的衔接，保留切换后继续输入的字段，防止立即确认或迟到回包恢复旧模型与已清除的 reasoning。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `workflow-settings-single-source-submit-flow`：默认显示与显式覆盖、表单内 backend 记忆、手动缓存刷新和草稿一致性。
- `acp-skills-runtime-options`：完整 backend 模型缓存、过期缓存的表单可用性、模型上下文绑定的 reasoning 与实时执行校验。

## Impact

- 共享设置层：`src/modules/workflow/settings/`；宿主：`src/modules/dashboard/dashboardActions.ts`。
- 两处表单：`src/dashboard/components/WorkflowOptionsRegion.tsx`、`WorkflowSettingsDialogRegion.tsx`；共享下拉：`src/shared/customSelect.tsx`。
- reasoning 缓存：`src/modules/acp/chat/acpReasoningCatalog.ts`；对应现有测试、中文/英文提示、组件文档与 `AGENTS.md`。
- 不改变 ACP raw ID、公有 provider-options 字段、后端实时 setter 契约或持久化格式，不新增依赖。
- 本次仅补录 change；主规格已随修复更新。构建、实机验收、提交、归档与发布尚未执行，详见 `verification.md`。
