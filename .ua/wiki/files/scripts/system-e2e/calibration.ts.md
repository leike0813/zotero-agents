
# scripts/system-e2e/calibration.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/calibration.ts -->

E2E 校准与晋级策略：校验校准轮次的结构事实，评估分组聚合结果，并判定当前轮次是否达到晋级为金例的条件。
源码：[scripts/system-e2e/calibration.ts](../../../../../scripts/system-e2e/calibration.ts)

## 符号（3）
<!-- node: function:scripts/system-e2e/calibration.ts:evaluateCalibrationGrouping -->
<!-- node: function:scripts/system-e2e/calibration.ts:evaluateE2EPromotion -->
<!-- node: function:scripts/system-e2e/calibration.ts:validateCalibrationRounds -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| evaluateCalibrationGrouping | 函数 | 121–152 | 中等 | 评估、校准、分组 | 0 | 按平台与版本分组评估校准结果，识别分组内部的不一致。 |
| evaluateE2EPromotion | 函数 | 154–180 | 中等 | 晋级策略、评估、e2e | 0 | 基于分组结论与重复次数判定是否允许把该用例晋级为金例。 |
| validateCalibrationRounds | 函数 | 48–110 | 中等 | validation、校准、结构契约 | 0 | 校验校准轮次的轮次号、样本量与平台指纹等结构事实是否自洽。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [manifest.ts](manifest.ts.md) | scripts/system-e2e/manifest.ts | 系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。 |
| [zotero-compatibility-fixture.ts](../zotero-compatibility-fixture.ts.md) | scripts/zotero-compatibility-fixture.ts | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| evaluateCalibrationGrouping | 函数 | 121–152 | 按平台与版本分组评估校准结果，识别分组内部的不一致。 |
| evaluateE2EPromotion | 函数 | 154–180 | 基于分组结论与重复次数判定是否允许把该用例晋级为金例。 |
| validateCalibrationRounds | 函数 | 48–110 | 校验校准轮次的轮次号、样本量与平台指纹等结构事实是否自洽。 |
