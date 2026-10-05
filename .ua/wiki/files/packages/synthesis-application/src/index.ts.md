
# packages/synthesis-application/src/index.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/index.ts -->

synthesis-application 包的 barrel 入口：重导出全部应用层模块，并额外实现 Workbench 运行期 chrome 读取（运行中/失败作业与缓存描述符）。
源码：[packages/synthesis-application/src/index.ts](../../../../../../packages/synthesis-application/src/index.ts)

## 符号（5）
<!-- node: function:packages/synthesis-application/src/index.ts:currentFailure -->
<!-- node: function:packages/synthesis-application/src/index.ts:jobFromOperation -->
<!-- node: function:packages/synthesis-application/src/index.ts:readSynthesisWorkbenchOperationalChrome -->
<!-- node: function:packages/synthesis-application/src/index.ts:relatedCacheKey -->
<!-- node: function:packages/synthesis-application/src/index.ts:sourceForOperation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| currentFailure | 函数 | 123–134 | 简单 | 诊断、失败态、workbench | 0 | 从操作记录中提取当前失败诊断，判断该作业是否应作为 Workbench 的当前失败项展示。 |
| jobFromOperation | 函数 | 60–108 | 中等 | 投影、workbench、作业 | 0 | 把 repository 操作记录投影为 Workbench 后台作业行，计算进度、失败原因与来源标签。 |
| readSynthesisWorkbenchOperationalChrome | 函数 | 146–207 | 中等 | workbench、运行状态、读取、有界 | 0 | 读取 Workbench 运行期 chrome 状态：按状态筛出运行中与失败作业上限，并汇总缓存描述符与关联缓存键。 |
| relatedCacheKey | 函数 | 110–121 | 简单 | 缓存、关联、workbench | 0 | 由操作记录推导关联缓存键，使作业行能定位其依赖的 cache basis 条目。 |
| sourceForOperation | 函数 | 44–58 | 简单 | 映射、操作、workbench | 0 | 根据操作类型推导其领域来源（topic、reference、tag 等），供 Workbench 作业行分组与跳转使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../synthesis-repository/src/index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [workbench.ts](../../synthesis-contracts/src/workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| readSynthesisWorkbenchOperationalChrome | 函数 | 146–207 | 读取 Workbench 运行期 chrome 状态：按状态筛出运行中与失败作业上限，并汇总缓存描述符与关联缓存键。 |
