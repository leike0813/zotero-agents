
# packages/synthesis-application/src/topicApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/topicApplication.ts -->

主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。
源码：[packages/synthesis-application/src/topicApplication.ts](../../../../../../packages/synthesis-application/src/topicApplication.ts)

## 符号（11）
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:completeCandidate -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:createSynthesisTopicApplication -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:failureResult -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:preflightBundleAssets -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:projectionValue -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:projectList -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:recordProjection -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:resolverState -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:topicArtifactDependencyRecords -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:topicDependencySnapshot -->
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:topicReadinessView -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [completeCandidate](../../../../symbols/packages/synthesis-application/src/topicApplication.ts/completeCandidate.md) | 函数 | 514–595 | 复杂 | 主题、候选、组装、依赖 | 1 | 组装完整的主题候选视图：合并定义、resolver 结果、引用 artifact 列表与资产清单，标记缺失的依赖。 |
| createSynthesisTopicApplication | 函数 | 708–1108 | 复杂 | 工厂函数、主题、核心、读取、就绪度 | 0 | 主题应用工厂：提供主题列表、主题详情与就绪度读取命令，结合 bundle 资产预检结果与 resolver 状态产出投影与失败诊断。 |
| failureResult | 函数 | 691–706 | 简单 | 失败处理、诊断、主题 | 0 | 构造主题读取失败结果，附带结构化诊断与受影响的主题 ID，便于上层展示恢复入口。 |
| [preflightBundleAssets](../../../../symbols/packages/synthesis-application/src/topicApplication.ts/preflightBundleAssets.md) | 函数 | 641–689 | 复杂 | 预检、资产校验、主题、有界 | 1 | 对主题 bundle 声明的资产做无副作用预检：校验路径安全、文件存在与大小上限，产出可用与缺失清单。 |
| projectionValue | 函数 | 262–289 | 中等 | 解析、安全读取、投影 | 0 | 从 JSON 存储字段中安全提取投影值，处理缺失、类型不符与嵌套对象三种情形。 |
| projectList | 函数 | 333–369 | 中等 | 投影、列表、分页、主题 | 0 | 投影主题列表视图，按更新时间与状态排序并施加分页上限，附带轻量就绪度标记。 |
| recordProjection | 函数 | 291–331 | 中等 | 投影、主题、repository | 0 | 把 repository 主题状态记录投影为应用层主题视图，解析定义、哈希与时间字段。 |
| resolverState | 函数 | 597–639 | 中等 | resolver、状态、主题 | 0 | 读取并归一化主题 paper resolver 的状态与诊断，判断引用解析是否已就绪。 |
| topicArtifactDependencyRecords | 函数 | 405–435 | 中等 | 依赖、artifact、主题 | 0 | 枚举主题依赖的引用分析 artifact 记录，按 paperRef 归并并标注缺失与过期项。 |
| topicDependencySnapshot | 函数 | 145–189 | 中等 | 依赖快照、主题、聚合 | 0 | 汇总主题对引用分析、资产与 resolver 产物的依赖快照，作为刷新判定与失效检测的输入。 |
| topicReadinessView | 函数 | 219–260 | 中等 | 就绪度、主题、聚合 | 1 | 计算主题就绪度视图：聚合来源材料百分比、resolver 状态与资产缺失情况，给出可应用或需刷新的结论。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](../../synthesis-contracts/src/common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [index.ts](../../synthesis-engine/src/index.ts.md) | packages/synthesis-engine/src/index.ts | Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。 |
| [index.ts](../../synthesis-repository/src/index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [topicApplication.ts](../../synthesis-contracts/src/topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts | 主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。 |
| [topicApplyDecision.ts](topicApplyDecision.ts.md) | packages/synthesis-application/src/topicApplyDecision.ts | 主题结果包 apply 决策：校验 synthesis 结果 bundle 的结构、基线哈希与直接写键白名单，据此判定 create、update_full、update_patch 或拒绝应用。 |
| [topicCanonical.ts](topicCanonical.ts.md) | packages/synthesis-application/src/topicCanonical.ts | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |
| [topicDomain.ts](../../synthesis-contracts/src/topicDomain.ts.md) | packages/synthesis-contracts/src/topicDomain.ts | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisTopicApplication | 函数 | 708–1108 | 主题应用工厂：提供主题列表、主题详情与就绪度读取命令，结合 bundle 资产预检结果与 resolver 状态产出投影与失败诊断。 |
