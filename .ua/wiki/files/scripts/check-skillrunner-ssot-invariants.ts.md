
# scripts/check-skillrunner-ssot-invariants.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/check-skillrunner-ssot-invariants.ts -->

CI 治理脚本：校验 SkillRunner 单一事实源（SSOT）的不变量文件，检查 current 快照与 facts/ref 引用是否一致、结构是否完整。
源码：[scripts/check-skillrunner-ssot-invariants.ts](../../../../scripts/check-skillrunner-ssot-invariants.ts)

## 符号（4）
<!-- node: function:scripts/check-skillrunner-ssot-invariants.ts:assertCurrentMatchesFacts -->
<!-- node: function:scripts/check-skillrunner-ssot-invariants.ts:assertInvariantShape -->
<!-- node: function:scripts/check-skillrunner-ssot-invariants.ts:deepEqual -->
<!-- node: function:scripts/check-skillrunner-ssot-invariants.ts:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertCurrentMatchesFacts | 函数 | 210–282 | 中等 | validation、assertion、consistency、governance | 0 | 核心一致性断言：逐条核对不变量 current 段与 facts/ref 段是否互相吻合，输出可定位的差异报告。 |
| assertInvariantShape | 函数 | 163–188 | 简单 | validation、assertion、governance | 0 | 校验不变量文件的基础形状（必填键、类型与数组元素结构），不符合即抛错终止。 |
| deepEqual | 函数 | 109–141 | 简单 | validation、comparison、utility | 0 | 对不变量的 current 与 facts 做结构化深比较，忽略键顺序差异，用于判定 SSOT 快照是否漂移。 |
| main | 函数 | 284–334 | 中等 | entry-point、script、validation | 0 | 脚本入口：定位不变量文件、运行全部形状与一致性断言并以退出码反映治理是否通过。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerSsoFacts.ts](../src/modules/skillRunnerSsoFacts.ts.md) | src/modules/skillRunnerSsoFacts.ts | SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。 |
