
# scripts/system-e2e/familyLifecycle.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/system-e2e](../../../modules/scripts/system-e2e.md)
<!-- node: file:scripts/system-e2e/familyLifecycle.ts -->

E2E 用例族的生命周期管理：声明族成员、解析选择、校验声明完整性，并按阶段驱动族的执行与健康判定。
源码：[scripts/system-e2e/familyLifecycle.ts](../../../../../scripts/system-e2e/familyLifecycle.ts)

## 符号（3）
<!-- node: function:scripts/system-e2e/familyLifecycle.ts:resolvePhase1FamilySelection -->
<!-- node: function:scripts/system-e2e/familyLifecycle.ts:runFamilyLifecycle -->
<!-- node: function:scripts/system-e2e/familyLifecycle.ts:validateFamilyDeclarations -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolvePhase1FamilySelection | 函数 | 81–95 | 简单 | 选择、用例族、入口 | 0 | 按传入选择解析出第一阶段要执行的用例族成员集合。 |
| runFamilyLifecycle | 函数 | 151–220 | 复杂 | 生命周期、编排、e2e | 0 | 驱动用例族完整生命周期：准备、逐成员执行、健康检查与结果收敛。 |
| validateFamilyDeclarations | 函数 | 115–137 | 中等 | validation、用例族、结构契约 | 0 | 校验族声明的成员、顺序与依赖无重复无悬空引用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [run-zotero-compatibility-matrix.ts](../run-zotero-compatibility-matrix.ts.md) | scripts/run-zotero-compatibility-matrix.ts | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |
| [zotero-compatibility-fixture.ts](../zotero-compatibility-fixture.ts.md) | scripts/zotero-compatibility-fixture.ts | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolvePhase1FamilySelection | 函数 | 81–95 | 按传入选择解析出第一阶段要执行的用例族成员集合。 |
| runFamilyLifecycle | 函数 | 151–220 | 驱动用例族完整生命周期：准备、逐成员执行、健康检查与结果收敛。 |
| validateFamilyDeclarations | 函数 | 115–137 | 校验族声明的成员、顺序与依赖无重复无悬空引用。 |
