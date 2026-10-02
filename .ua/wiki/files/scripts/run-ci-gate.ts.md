
# scripts/run-ci-gate.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/run-ci-gate.ts -->

CI 门禁执行入口：按 ci-gate-plan 提供的阶段列表逐个调用对应 npm script，任一阶段失败即整体失败。
源码：[scripts/run-ci-gate.ts](../../../../scripts/run-ci-gate.ts)

## 符号（1）
<!-- node: function:scripts/run-ci-gate.ts:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 29–49 | 简单 | entry-point、ci-cd、gate、orchestration | 0 | 按 ci-gate-plan 返回的阶段顺序依次执行 npm script，任一阶段失败即中断并返回失败码。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ci-gate-plan.ts](ci-gate-plan.ts.md) | scripts/ci-gate-plan.ts | CI 门禁阶段编排的唯一事实源，按 gate 名称返回需要依次执行的 stage 列表，供 run-ci-gate 驱动实际命令。 |
