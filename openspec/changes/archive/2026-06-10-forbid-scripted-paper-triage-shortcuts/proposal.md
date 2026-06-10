# 禁止 Stage 30 脚本化 Paper Triage 捷径

## Summary

Stage 30 paper triage 必须由 LLM 逐篇阅读 runtime 导出的 paper artifacts 并写出 paper-local 判断。当前指令只强调 payload shape 和材料来源，没有明确禁止 agent 通过临时脚本批量抽取、归纳或生成 triage，容易导致偷懒式、低质量 triage。

## Goals

- 在 `SKILL.md` 中把 Stage 30 的执行方式写成硬性约束。
- 在 gate JSON 中返回同一条 Stage 30 hard rule，让执行时即时可见。
- 恢复 Stage 30 的 subagent batching 建议，并提供符合当前 payload schema 的委派 prompt。
- 保持 runtime 只负责流程、schema 和 payload 校验，不尝试检测 agent 是否运行过脚本。

## Non-Goals

- 不新增脚本行为检测或审计。
- 不改变 Stage 30 payload schema。
- 不改变 resolver cascade 或 context view 生成逻辑。
