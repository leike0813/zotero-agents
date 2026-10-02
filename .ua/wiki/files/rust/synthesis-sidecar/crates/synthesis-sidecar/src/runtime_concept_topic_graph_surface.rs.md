
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs -->

Concept KB 与 Topic Graph 的唯一公共适配面：持有公共别名、captured CAS basis，以及由 production client runtime 选定的领域类型化命令。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs)

## 符号（10）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:concept_mutation_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:decide_relation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:delete_concepts -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:query -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:query_labels -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:refresh_topic_discovery -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:review_concept -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:review_topic_graph -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:topic_graph_mutation_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:update_display_text -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| concept_mutation_wire | 函数 | 71–103 | 简单 | concept-kb、rust、wire-projection | 0 | 把概念变更结果投影为 mutation wire DTO，含诊断而不暴露持久化记录。 |
| decide_relation | 函数 | 394–416 | 简单 | concept-kb、rust、runtime | 0 | 提交概念关系决策：确认 broader_than 等关系后触发后置的 topic discovery 刷新。 |
| delete_concepts | 函数 | 378–392 | 简单 | concept-kb、rust、runtime | 0 | 删除指定概念并返回 mutation 结果与受影响范围。 |
| query | 函数 | 257–315 | 中等 | concept-kb、rust、runtime | 0 | Concept KB 查询：按标签与有界上限返回匹配项、别名命中与诊断细节。 |
| query_labels | 函数 | 235–255 | 简单 | concept-kb、rust、runtime | 0 | 从查询输入中提取并规范化标签集合，限制数量与长度。 |
| refresh_topic_discovery | 函数 | 421–438 | 简单 | concept-kb、rust、runtime | 0 | 关系确认后的 post-commit 刷新：失败只作为告警，不回滚已提交边。 |
| review_concept | 函数 | 355–376 | 简单 | concept-kb、rust、runtime | 0 | 提交概念审阅决策并投影为 mutation wire 结果。 |
| review_topic_graph | 函数 | 440–466 | 简单 | concept-kb、rust、runtime | 0 | 提交 topic graph 审阅决策并投影结果。 |
| topic_graph_mutation_wire | 函数 | 105–134 | 简单 | concept-kb、rust、wire-projection | 0 | 把 topic graph 变更结果投影为 wire DTO。 |
| update_display_text | 函数 | 317–353 | 简单 | concept-kb、rust、runtime | 0 | 更新概念的展示文本，校验长度上限后提交。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
