# Design

## Approach

- 在 `stage-guidance.yaml` 为 Stage 30 增加 `hard_constraints`，说明 paper triage 必须由 LLM 逐篇阅读和判断。
- 在 `stage-guidance.yaml` 为 Stage 30 增加 subagent 委派建议，要求 subagent 只处理分配到的 paper artifact，并只返回当前 schema 可接收的 assessment row。
- renderer 将 `hard_constraints` 渲染为 `SKILL.md` 中的“硬性约束”段落。
- renderer 将 subagent 委派建议和委派 prompt 渲染到 `SKILL.md`。
- runtime stage contract 为 Stage 30 增加 `hard_rules` 和 `subagent_delegation`，并由 gate instruction 原样返回。
- 测试检查 create/update prepare 的 `SKILL.md` 和 Stage 30 gate JSON 都暴露该规则与委派建议。

## Boundary

该约束是执行协议，不是可由 runtime 可靠检测的本机安全策略。runtime 不扫描 shell history、不审计临时文件、不判断 agent 是否曾运行脚本；它只把硬规则和推荐委派方式清楚暴露给 agent。
