
# scripts/system-e2e
> 目录聚合页：8 个文件、34 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [scripts/system-e2e/acceptance.ts](../../files/scripts/system-e2e/acceptance.ts.md) | 文件 | 3 | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [scripts/system-e2e/calibration.ts](../../files/scripts/system-e2e/calibration.ts.md) | 文件 | 3 | E2E 校准与晋级策略：校验校准轮次的结构事实，评估分组聚合结果，并判定当前轮次是否达到晋级为金例的条件。 |
| [scripts/system-e2e/familyLifecycle.ts](../../files/scripts/system-e2e/familyLifecycle.ts.md) | 文件 | 3 | E2E 用例族的生命周期管理：声明族成员、解析选择、校验声明完整性，并按阶段驱动族的执行与健康判定。 |
| [scripts/system-e2e/fixture.ts](../../files/scripts/system-e2e/fixture.ts.md) | 文件 | 7 | E2E fixture 注册表与已提交 seed 的治理模块：校验结构事实、可移植性与隐私约束，并把 seed 物化到只读测试工作区。 |
| [scripts/system-e2e/healthGate.ts](../../files/scripts/system-e2e/healthGate.ts.md) | 文件 | 9 | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [scripts/system-e2e/manifest.ts](../../files/scripts/system-e2e/manifest.ts.md) | 文件 | 5 | 系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。 |
| [scripts/system-e2e/runtimeEvidence.ts](../../files/scripts/system-e2e/runtimeEvidence.ts.md) | 文件 | 3 | 采集单个执行 cell 的运行时证据：读取已安装 sidecar runtime、会话记录与运行日志，按 schema 输出可归档证据文档。 |
| [scripts/system-e2e/weeklyRetry.ts](../../files/scripts/system-e2e/weeklyRetry.ts.md) | 文件 | 1 | 周期性重试策略：按周窗口统计失败用例，对稳定复现的失败安排重试，避免偶发失败直接阻塞发布。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [scripts](../scripts.md) | 4 |
| [src/modules](../src/modules.md) | 4 |
| [packages/synthesis-contracts/src](../packages/synthesis-contracts/src.md) | 2 |
| [src/platform](../src/platform.md) | 2 |
| [.](../index.md) | 1 |
| [scripts/synthesis](synthesis.md) | 1 |
| [src/modules/synthesisClient](../src/modules/synthesisClient.md) | 1 |
| [src/utils](../src/utils.md) | 1 |
