
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs -->

Reference/Citation 公共面：处理引用审阅单条与批量决策、related items 回显消费，并把命令失败投影为统一的 wire 结果。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs)

## 符号（3）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs:command_failure -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs:reference_review_decision -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs:reference_review_decisions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| command_failure | 函数 | 90–101 | 简单 | citation-graph、rust、runtime | 0 | 把命令失败投影为统一的 wire 失败结果，含状态码与结构化诊断。 |
| reference_review_decision | 函数 | 103–146 | 简单 | citation-graph、rust、runtime | 0 | 提交单条引用审阅决策，并按目标类型分派到对应领域应用。 |
| reference_review_decisions | 函数 | 148–159 | 简单 | citation-graph、rust、runtime | 0 | 批量提交引用审阅决策，逐条返回结果以支持部分成功。 |

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
