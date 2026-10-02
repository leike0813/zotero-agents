
# rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs -->

概念知识库（Concept KB）应用层：维护概念 identity、别名归一与知识条目准入，向 topic 层提供概念维度的事实来源。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs)

## 符号（8）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:apply_replacement -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:ConceptKbApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:ConceptKbComputePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:ConceptProposal -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:ingest_proposals -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:merge_concept_proposal -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:QueryAdmission -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs:review -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_replacement | 函数 | 878–943 | 中等 | rust、替换、概念归一、concept-kb | 0 | 以新概念替换旧概念，重写引用与别名绑定并保持知识库内部一致。 |
| ConceptKbApplication | 类 | 306–312 | 简单 | rust、A、p、l | 0 | Concept KB 应用层 owner：编排概念提案、审阅、导入与展示更新的准入与提交。 |
| ConceptKbComputePort | 类 | 207–219 | 简单 | rust、P、o、r | 0 | 概念计算端口：承载概念索引构建与相似度计算，保持 application 只做编排。 |
| ConceptProposal | 类 | 102–123 | 简单 | rust、P、r、o | 0 | 概念提案：携带概念名称、别名候选、置信度与关系，是概念知识入库的唯一入口载体。 |
| ingest_proposals | 函数 | 375–483 | 中等 | rust、提案、准入、concept-kb | 0 | 批量接收概念提案并转换为知识库候选，按置信度与关系类型合并同义提案。 |
| merge_concept_proposal | 函数 | 1219–1368 | 复杂 | rust、概念归一、合并、concept-kb | 0 | 合并单个概念提案：处理别名归一与已有概念冲突，产生合并或新增结论。 |
| QueryAdmission | 类 | 228–232 | 简单 | rust | 0 | 概念查询准入：把 QueryState 转换为可用租约，避免高成本查询并发失控。 |
| review | 函数 | 540–678 | 复杂 | rust、审阅、admission、concept-kb | 0 | 执行概念审阅动作（接受、拒绝、替换），只在 admission 允许时提交。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [topic.rs](topic.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs | Topic 领域应用层：管理主题 identity、成员变更、合并与查询，并结合 concept KB 与 topic graph 投影跨域主题视图。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ConceptKbApplication | 类 | 306–312 | Concept KB 应用层 owner：编排概念提案、审阅、导入与展示更新的准入与提交。 |
| ConceptKbComputePort | 类 | 207–219 | 概念计算端口：承载概念索引构建与相似度计算，保持 application 只做编排。 |
| ConceptProposal | 类 | 102–123 | 概念提案：携带概念名称、别名候选、置信度与关系，是概念知识入库的唯一入口载体。 |
| QueryAdmission | 类 | 228–232 | 概念查询准入：把 QueryState 转换为可用租约，避免高成本查询并发失控。 |
