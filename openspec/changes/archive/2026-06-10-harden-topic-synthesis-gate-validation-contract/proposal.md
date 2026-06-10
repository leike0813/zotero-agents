# 强化 Topic Synthesis Split Runtime Gate 校验

## Summary

Topic synthesis split runtime 的 gate 需要从浅层 payload shape 检查升级为当前阶段合同校验。关键数组、枚举、字符串、数值范围和引用关系必须在对应 stage submit 时失败，不能把非法 payload 放行到 final apply。

## Goals

- 执行当前 stage schema 的深层约束。
- 对最终 Host apply 必需字段增加 stage-specific semantic validation。
- 保持 gate 只校验，不替 agent 补字段、不猜 source refs。
- 保持无新增 npm/Python 依赖。

## Non-Goals

- 不改变 workflow sequence。
- 不改变 Host apply 的最终 artifact validator。
- 不做内容质量评分或自动修复 payload。
