# Design

## Problem

`stage-guidance.yaml` 和部分 payload schema examples 仍停留在最小形状示例。例如 Stage 40 的 taxonomy route 示例只包含 `definition` 和 `source_paper_refs`，但 runtime submit 会提前校验 Host apply 所需的 `core_problem`、`mechanism`、`strengths`、`limitations`、`maturity` 等字段。结果是 agent 按指令示例生成 payload 后会被 gate 打回。

## Approach

- 将稳定的 stage-specific gate 要求同步进 payload schema。
- 将 guidance examples 写成 submit-ready payload 示例，覆盖深层字段。
- renderer 继续从 SSOT 渲染，不手改 generated package。
- 测试同时验证 schema examples、inline examples 和 runtime gate submit，避免再次出现浅层示例漂移。

## Constraints

- `SKILL.md` 保持 current-state only。
- 不为示例引入历史迁移说明或旧字段说明。
- 不降低 gate 严格度，不让 runtime 自动补 agent 应填写的语义字段。
