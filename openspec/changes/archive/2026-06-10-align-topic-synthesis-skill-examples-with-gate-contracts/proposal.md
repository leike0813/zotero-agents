# 对齐 Topic Synthesis 指令示例与 Gate 深层校验

## Summary

Topic synthesis split skills 已经强化 gate 校验，但 `SKILL.md` 中渲染的 payload 示例仍偏浅，导致 agent 按示例写 payload 后被 gate 打回。此 change 将 agent-facing 示例、payload schema 示例和 runtime gate 合同对齐，使示例成为可提交的结构样例。

## Goals

- 让 generated `SKILL.md` 的 inline payload 示例覆盖当前 gate 的深层字段要求。
- 让 payload schema 自带 examples 不再是浅层占位。
- 用测试捕获“schema 示例能过 AJV 但 runtime gate 会拒绝”的漂移。
- 不削弱现有 gate 和 Host apply 校验。

## Non-Goals

- 不改变 workflow sequence。
- 不改变 apply、持久层或 UI。
- 不改变 runtime-owned artifact 生成语义。
