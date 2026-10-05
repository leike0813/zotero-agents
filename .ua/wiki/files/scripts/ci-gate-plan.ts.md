
# scripts/ci-gate-plan.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/ci-gate-plan.ts -->

CI 门禁阶段编排的唯一事实源，按 gate 名称返回需要依次执行的 stage 列表，供 run-ci-gate 驱动实际命令。
源码：[scripts/ci-gate-plan.ts](../../../../scripts/ci-gate-plan.ts)

## 符号（1）
<!-- node: function:scripts/ci-gate-plan.ts:getCiGateStages -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getCiGateStages | 函数 | 31–39 | 简单 | ci-cd、gate、configuration、orchestration | 1 | 按门禁名称返回阶段列表：pr 门禁覆盖快速校验集合，release 门禁额外包含完整测试与发布校验阶段。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [run-ci-gate.ts](run-ci-gate.ts.md) | scripts/run-ci-gate.ts | CI 门禁执行入口：按 ci-gate-plan 提供的阶段列表逐个调用对应 npm script，任一阶段失败即整体失败。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getCiGateStages | 函数 | 31–39 | 按门禁名称返回阶段列表：pr 门禁覆盖快速校验集合，release 门禁额外包含完整测试与发布校验阶段。 |
