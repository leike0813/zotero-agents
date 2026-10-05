
# rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-canonical-store/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs -->

Synthesis 规范存储层（canonical store）主体，提供 SQLite schema、迁移、事务与图谱/标签/引用等规范记录的读写。
源码：[rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs)

## 符号（36）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:acquire_writer -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:archive_current -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:canonical_topic_assets -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:CanonicalError -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:CanonicalStore -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:CanonicalTopicView -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:cleanup_transaction -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:commit_import_batch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:copy_snapshot -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:CurrentTopic -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:discard_import_batch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:durable_write -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:FaultPoint -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:hash_json -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:historical_topic_path_ids -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:ImportBatch -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:Journal -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:migrate_historical_topic_roots -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:open_root -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:prepare_topic -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:PreparedCanonicalTopic -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:promote_locked -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:read_current -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:recover_all -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:recover_import_batch_on_open -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:recover_topic -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:restore_deleted -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:sha256_hex -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:stage_import_batch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:topic_slug -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:validate_declared_hashes -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:validate_identity_part -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:validate_relative_file -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:validate_snapshot_representation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:validated_metadata_hash -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:WriterLease -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acquire_writer | 函数 | 1414–1440 | 复杂 | 并发控制、单写者、事务、canonical-store | 0 | 取得独占写入租约，是所有规范写事务的统一入口，防止并发写交叉。 |
| archive_current | 函数 | 1560–1612 | 复杂 | 归档、事务、topic、状态迁移 | 0 | 归档当前 topic：把活动目录移入归档区并更新 current 指针，全程在同一事务边界内。 |
| canonical_topic_assets | 函数 | 580–610 | 中等 | 资产枚举、topic、canonical-store | 0 | 枚举 topic 目录下的全部资产文件，校验路径形状后返回排序稳定的资产列表。 |
| CanonicalError | 类 | 147–150 | 简单 | 错误处理、类型定义、canonical-store | 0 | 规范存储的结构化错误，携带 kind 枚举与消息，用于区分冲突、缺失、校验失败等语义。 |
| CanonicalStore | 类 | 308–315 | 复杂 | canonical-store、持久化、单例 owner、database | 0 | 规范存储的核心类型，持有 store root 与写入租约状态，是 topic 快照、导入批次与事务日志的唯一 owner。 |
| CanonicalTopicView | 类 | 61–73 | 中等 | 类型定义、topic、只读视图 | 1 | 规范 topic 的只读视图，聚合 topic 快照、资产与状态，供应用层投影使用。 |
| [cleanup_transaction](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/cleanup_transaction.md) | 函数 | 1883–1891 | 简单 | 清理、事务、资源回收 | 2 | 清理已完成事务的 journal 与 staging 残留，失败不覆盖主错误。 |
| [commit_import_batch](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/commit_import_batch.md) | 函数 | 2038–2098 | 复杂 | 导入批次、提交、事务、原子性 | 1 | 提交导入批次：校验全部条目后一次性落到 canonical 布局，失败则整体回滚。 |
| [copy_snapshot](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/copy_snapshot.md) | 函数 | 783–861 | 复杂 | 快照、文件操作、完整性校验 | 2 | 将 topic 快照递归复制到目标目录，复制过程中逐文件校验哈希。 |
| CurrentTopic | 类 | 218–232 | 中等 | 类型定义、topic、状态 | 1 | 当前 topic 的磁盘状态描述，记录 root 路径、状态枚举与快照标识。 |
| discard_import_batch | 函数 | 2100–2125 | 中等 | 导入批次、回滚、清理 | 1 | 放弃未提交的导入批次，清理 staging 目录与 journal 记录。 |
| [durable_write](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/durable_write.md) | 函数 | 737–760 | 复杂 | 持久化、原子写、fsync、崩溃恢复 | 3 | 以 fsync + 原子重命名方式落盘文件，确保崩溃后不出现半写状态。 |
| FaultPoint | 类 | 236–244 | 简单 | 测试设施、故障注入、parity | 0 | parity 测试用的故障注入点枚举，用于在 promote 或 import 流程的指定阶段制造失败。 |
| hash_json | 函数 | 394–398 | 简单 | 哈希、规范化、canonical-json | 1 | 对 JSON 值做规范化序列化后计算哈希，保证键序无关的稳定表示。 |
| historical_topic_path_ids | 函数 | 437–449 | 中等 | 兼容、迁移、topic | 0 | 枚举历史遗留的 topic 路径 ID 变体，用于迁移期识别旧目录布局。 |
| ImportBatch | 类 | 289–294 | 中等 | 导入批次、事务、staging、canonical-store | 1 | 导入批次句柄，聚合 staging 目录、journal phase 与提交/回滚所需的阶段信息。 |
| Journal | 类 | 267–276 | 中等 | 事务、journal、崩溃恢复、持久化 | 1 | 事务日志记录，持久化 phase、transaction id 与 promotion 意图，用于崩溃后的恢复判定。 |
| [migrate_historical_topic_roots](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/migrate_historical_topic_roots.md) | 函数 | 1321–1392 | 复杂 | 迁移、兼容、topic、数据完整性 | 1 | 把历史遗留的 topic 目录布局迁移到当前规范布局，保持内容与哈希不变。 |
| open_root | 函数 | 1270–1319 | 复杂 | 初始化、schema 迁移、canonical-store | 0 | 打开或初始化 store root，校验 identity 文件并执行 schema 版本迁移。 |
| prepare_topic | 函数 | 691–720 | 复杂 | preflight、prepared-plan、校验、canonical-store | 0 | 对候选 topic 内容做无副作用 preflight，产出绑定 revision 与内容哈希的 prepared plan。 |
| PreparedCanonicalTopic | 类 | 89–91 | 中等 | prepared-plan、preflight、canonical-store、安全边界 | 0 | 已通过无副作用 preflight 的 topic 写入计划，绑定 scope、revision 与内容哈希，授权后才允许 native 写入。 |
| promote_locked | 函数 | 1787–1881 | 复杂 | promotion、事务、journal、canonical-store、关键路径 | 0 | 在持有写入租约的前提下完成 topic 提升：写 journal、切换 current、生成回执并清理事务。 |
| read_current | 函数 | 1478–1512 | 中等 | 读取、topic、完整性校验 | 0 | 读取当前 topic 快照并校验其表示与声明哈希，失败时返回结构化错误。 |
| recover_all | 函数 | 1957–1972 | 中等 | 崩溃恢复、初始化、canonical-store | 1 | 打开 store 时遍历全部 topic 执行恢复，把首个失败作为主错误。 |
| [recover_import_batch_on_open](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/recover_import_batch_on_open.md) | 函数 | 2164–2196 | 复杂 | 崩溃恢复、导入批次、canonical-store | 1 | 打开 store 时恢复遗留的导入批次，按 journal phase 决定提交或丢弃。 |
| [recover_topic](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/recover_topic.md) | 函数 | 1893–1955 | 复杂 | 崩溃恢复、journal、事务、canonical-store | 1 | 按 journal phase 判定并恢复单个 topic 的未完成事务，回滚或前滚。 |
| restore_deleted | 函数 | 1614–1648 | 复杂 | 恢复、软删除、topic | 0 | 从软删除状态恢复 topic，重建 current 指针并校验内容哈希。 |
| [sha256_hex](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/sha256_hex.md) | 函数 | 380–384 | 简单 | 哈希、工具函数、内容指纹 | 2 | 计算字节串的 SHA-256 十六进制摘要，作为内容指纹。 |
| stage_import_batch | 函数 | 1974–2018 | 复杂 | 导入批次、staging、事务 | 0 | 把导入条目 staging 到临时目录并写入 journal，不影响 current topic。 |
| topic_slug | 函数 | 410–430 | 中等 | slug、命名、路径安全 | 0 | 由 topic 标题生成文件系统安全的 slug，用于目录命名且保持确定性。 |
| [validate_declared_hashes](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/validate_declared_hashes.md) | 函数 | 499–530 | 复杂 | 完整性校验、哈希、安全边界、canonical-store | 1 | 逐项比对快照声明的哈希与实际内容，不一致即判为篡改或损坏。 |
| validate_identity_part | 函数 | 317–328 | 中等 | 输入校验、路径安全、canonical-store | 0 | 校验 identity 片段不含路径分隔符与保留字符，拒绝可逃逸的标识输入。 |
| validate_relative_file | 函数 | 354–367 | 中等 | 输入校验、路径安全、canonical-store | 0 | 校验相对文件路径合法且不越界，拒绝绝对路径、.. 穿越与超长片段。 |
| validate_snapshot_representation | 函数 | 549–572 | 中等 | 输入校验、topic、canonical-store | 0 | 校验 topic 快照的表示形式合法，包括段数上限、字节上限与字段完备性。 |
| validated_metadata_hash | 函数 | 473–497 | 中等 | 哈希、元数据、稳定性 | 0 | 在受控字段集合上计算 metadata 哈希，排除易变字段以获得稳定表示。 |
| WriterLease | 类 | 297–299 | 简单 | 并发控制、RAII、单写者、canonical-store | 1 | 写入租约 RAII 守卫，保证同一时刻只有一个 writer 进入事务作用域。 |
