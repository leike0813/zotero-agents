# Design

## Context

动机与范围见 proposal.md。固定比较基线为 v0.8.4 `fe273f37f2093c4a34be15f93e7d46a3b3484791`；修改前 HEAD 为 `59e792b8aff16a31a1081a9cff9fbaee1bfee7a5`，工作区干净。`148ac3512` 将 provider profile 校验直接接到原始表单值，绕过 settings domain 的 null 删除契约。最近四次变更的 raw ID、reasoning、缓存与显式选择规则继续生效。

## Goals / Non-Goals

**Goals:** 在现有 settings 模块内集中提交语义，确保真实控件、保存与运行消费同一份显式设置；probe 完整生命周期有界。

**Non-Goals:** 不恢复自动或定向探测，不引入持久化迁移、依赖或新表单状态框架，不修改 Host Bridge agent-facing surfaces。

## Decisions

- settings domain 保留 patch 与完整替换语义，统一消费删除标记。共享提交函数接收 workflow、已解析 backend 与设置，返回显式设置快照及其运行投影；两个宿主与执行上下文调用同一函数，避免每个调用者自行修剪空值。
- 描述器只做 UI 投影：运行默认值用于显示而非覆盖显式输入。非法非空值保留，strict provider 校验先验证输入再运行归一化。ACP false 在 provider 归一化中保留；SkillRunner schema 空默认值不参与非空目录 membership，但 provider-aware engine 仍要求有效提供商。
- 继续复用既有 schema retention、provider 切换和 source/rebased 回声规则。只有用户切换上下文时丢弃失效 reasoning，普通刷新不修复或删除显式值。
- 完整 probe 使用既有 bounded wait 与 cancellation 工具，取消、超时、late launch 和 cleanup 汇入统一路径。删除无生产调用者的定向路径，测试当前完整目录路径。
- 通过现有 Preact + Dialog/dispatcher 测试 seam 连接生产参与者；测试只替代窗口和后端，不内联实现宿主规则。旧原生窗口、专用模型和专用测试删除，保留实际宿主使用的辅助函数。

## Risks / Trade-offs

- 严格校验可能揭露旧配置中的非法显式值 → 保留原值与结构化错误供纠正，不自动迁移。
- 模块测试不能证明 Zotero 消息、控件及打包正确 → Zotero 10 完整交互，7/9 抽验；构建前执行 preflight。
- workflow 域既有 Host 契约扫描失败涉及两个内置工作流的 `globalThis.Zotero` → 在 verification 中独立登记，不修改该域、不算通过。

## Migration Plan

沿用现有设置版本及公共消息。完成源码与文档后运行最小相关测试、workflow 域、类型/lint/格式检查，再预检、构建与实机验收；任务仅在对应证据成立后勾选。保留未提交改动，不提交、不切分支。
