# Design

## Context

实施依据为 #26 C16 accepted plan（issuecomment-5549998298）及 Q164–Q188；动机见 proposal。当前 JSONL、Provider stream、Preparation CAS 注入和 Gateway 均只有局部调用，需生产组合。插件不能依赖 Node。

## Goals / Non-Goals

目标是一个完整 Conversation owner 路径和最终共享 shell。C17 Skill Run adapter、C18 审计、C19 自动恢复、C20 发布验证不在本次范围；不增加并行 UI、队列、数据库、附件文件系统或权限框架。

## Decisions

- Conversation 协调器负责产品 choreography；执行、持久化和策略继续由各 prerequisite owner 持有。复用现有模块而非建立第二层存储或运行时。
- canonical JSONL 保存消息、turn、工具、资源引用、准备与标题使用事实；SQLite 仅保存 owner metadata。owner 锁内 admission 与 CAS 防止第二 prompt 和过期标题。删除先不可逆标记，再清理，失败保留 cleanup_pending。
- 每次实际模型调用从 canonical selected path 准备；同一 turn 模型、工具、资源冻结。原生 Agent 保留结构化工具和 usage；工具 batch 经 Gateway 持久化和审批，结果不自动重放。
- 文件 preflight 全部成功才复制；复制有界，manifest 原子提交；原路径不跨 durable/model/UI 边界。通过受管 ref 读取 snapshot，复用 C08 quota。
- registry 是纯数据 SSOT。共享 publication、action、region renderer 承载所有 sources；lane/source 窗口内持有，owner-first/page-first，transcript-only 不更新 chrome。
- 辅助模型只用配置引用，标题输入有界且最小；无辅助配置采用确定性 fallback，手动 rename 以 revision 优先。

## Risks / Trade-offs

- C02 写入仍扫描完整 log → 本次避免另加 body mirror，保持已知吞吐限制并记录验证。
- cleanup 或 effect 无法证实 → 保留 cleanup_pending 或 unknown，不自动重试工具。
- shell 跨多个已有 sources → 复用 characterization 和 DOM identity 检查，再运行 build、lint 和完整 core runner。
