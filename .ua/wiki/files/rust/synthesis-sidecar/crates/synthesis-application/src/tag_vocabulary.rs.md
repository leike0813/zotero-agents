
# rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs -->

标签词表应用层：管理受控标签词表、别名映射与导入准入，是标签规范化与批量维护的最大领域模块。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs)

## 符号（8）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:plan_case_collision_repair -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:promote -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:public_save_candidate -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:TagProtocol -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:TagVocabularyApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:TagVocabularyComputePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:TagVocabularyEntry -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:update_public_entry -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| plan_case_collision_repair | 函数 | 2116–2275 | 复杂 | rust、规划、冲突修复、tag-vocabulary | 0 | 规划大小写冲突修复方案，先在无副作用状态下给出可执行修复计划。 |
| promote | 函数 | 1220–1377 | 复杂 | rust、词表、提交、tag-vocabulary | 0 | 提升暂存中的词表变更，合并暂存记录后写入正式词表。 |
| public_save_candidate | 函数 | 1796–1878 | 中等 | rust、词表、校验、tag-vocabulary | 0 | 生成对外可保存的词表候选，在公开边界上做命名与协议校验。 |
| TagProtocol | 类 | 58–64 | 简单 | rust | 0 | 标签协议约束：描述条目在命名、层级与合并上的合法行为。 |
| TagVocabularyApplication | 类 | 374–383 | 简单 | rust、A、p、l | 0 | 标签词表应用层 owner：管理词表条目、别名、协议约束、导入暂存与宿主副作用提交。 |
| TagVocabularyComputePort | 类 | 310–321 | 简单 | rust、P、o、r | 0 | 词表计算端口：声明建议生成与索引计算能力，application 只负责编排。 |
| TagVocabularyEntry | 类 | 35–54 | 简单 | rust、E、n、t | 0 | 词表条目：受控标签的规范形态、协议与父级绑定，是标签唯一事实源。 |
| update_public_entry | 函数 | 891–972 | 中等 | rust、词表、更新、tag-vocabulary | 0 | 更新公开词表条目并重算父级绑定与协议一致性。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| TagProtocol | 类 | 58–64 | 标签协议约束：描述条目在命名、层级与合并上的合法行为。 |
| TagVocabularyApplication | 类 | 374–383 | 标签词表应用层 owner：管理词表条目、别名、协议约束、导入暂存与宿主副作用提交。 |
| TagVocabularyComputePort | 类 | 310–321 | 词表计算端口：声明建议生成与索引计算能力，application 只负责编排。 |
| TagVocabularyEntry | 类 | 35–54 | 词表条目：受控标签的规范形态、协议与父级绑定，是标签唯一事实源。 |
