# Design

## Context

动机见 [proposal.md](proposal.md)。本记录补录已完成实现，代码基线为 `7387880a64d86a2d01b26de5f31dbddf748238a3`，修复仍位于工作区。主规格已经包含本次新增场景；delta 保存对应完整 requirement，后续同步应为无语义差异。

日志与复现分别定位到三条路径：带图摘要复用普通笔记校验，触发 50,000 字符上限；私有 transfer 调用公开详情 enrichment，导致完整 Citation 加派生 Markdown 超过 1 MiB；并行笔记暂存在首个失败后继续运行，与清理争用文件。XPC 读失败与复制取消还可能在原生停止前释放传输槽。

Windows 验收另复现了解压目录删除失败：63 个解压文件带有只读属性。该问题有独立实机证据，不据此推断用户历史日志中 PNG 锁的具体持有者。

## Goals / Non-Goals

**Goals:**

- 在既有 Broker、managed-note owner、文件传输和 archive owner 内修复边界与生命周期。
- 保持完整 payload、provenance、图片和事务失败时的旧笔记；错误清理完成后仍能观察到原始业务失败。
- 保持 Zotero 插件运行时兼容，不引入 Node-only 生产依赖。

**Non-Goals:**

- 不扩容公开详情，不截断 Citation，不新增公共 API、DTO 或内容包版本。
- 不修改 ZIP writer 的同步写入方式，不增加删除重试预算，不修改源 ZIP 或库内文件权限。

## Decisions

### 校验按所属领域分开

从普通内容校验提取现有 image slot/binding 校验，managed parent-set 仅复用图片部分，并复用 owner 的 `assertManagedWriteWithinLimit` 验证最终计划内容。提高普通笔记上限会改变无关接口；跳过 managed 预算会削弱写入边界，两者均不采用。

### 私有 transfer 消费语义数据

`readForTransfer` 保留 revision 一致性、canonical 读取与 payload 校验，只投影 `kind/ref/revision`，managed 分支再带 `noteKind/payload/provenance`。HTML、payload blocks、tags 仍作为独立 transfer facts 返回。公开 `getNoteDetail` 的 enrichment 与 1 MiB 限额保持原状，因此无需扩容、截断或新增文件型公开接口。

### 资源所有者等待在途操作结束

笔记暂存改为顺序遍历。文件传输已有单并发约束，额外并行笔记读取不会增加文件吞吐，却使失败清理需要等待兄弟任务。串行路径让首错后不再启动下一笔记，使用既有 cleanup 即可；cleanup 失败通过 runtime log 独立记录并重抛原业务错误。

XPC 读失败记录首错并请求取消，复制 abort 同样记录终态意图；两者由 `onStopRequest` 结算并释放传输槽。停止时显式关闭源输入流，读侧关闭异步输入流，复制 sink 仍由 native copier 关闭。cancel 抛错仅关闭 pipe/sink 请求终止，继续等待停止回调；启动失败则关闭已经取得的流后返回错误。重复取消和迟到回调不重复结算。

### 临时解压副本可清理

原生 extraction 每生成一个受 scope 所有的目标文件，就复用 `setRuntimeFilePermissions(target, 0o600)` 设置 owner read/write。Windows 将其映射为可写属性，避免只读 ZIP 条目使临时目录无法删除。修改点位于解压 owner，不改变通用删除器或源文件。

## Risks / Trade-offs

- 顺序读取大量笔记可能增加纯读取耗时 → 文件传输本已串行；真实宿主完成两轮 25 张用户图片及 payload 图片的导出、完整性校验与清理。
- 原生取消依赖停止回调到达 → 用可控延迟回调测试验证停止前不释放占用，覆盖取消抛错、启动失败与迟到回调；不以提前结算掩盖仍活动的 I/O。
- 外部程序仍可能长期锁定文件 → 保留现有失败语义和有界重试，历史 PNG 锁的持有者未确认。
- 实机覆盖为 Windows Zotero 10.0.2 → 未声称 Zotero 7/9 或用户原库已验证。

## Migration Plan

无数据迁移。安装修复后的 XPI 即可，继续使用现有 Content Package `0.8.10-dev.14`。回滚可换回先前 XPI，既有笔记与导出格式未变。

Content Package collector 只收集 `workflows_builtin/`、`skills_builtin/` 的交付内容，本次没有这些目录的变更。`check:content-package-release -- --current-branch` 已复验 dev：425 文件，5,021,043 字节，SHA-256 `5396105cd3fd17ddfbb942835f0345b6d40b7533e7015e54059b9cbea5e6a633`。用户指定的“归档、提交、dev patch 发布”流程适用于后续确实改变 Content Package 的情形，本次不触发发布。
