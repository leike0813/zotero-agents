# Proposal

## Why

C01–C13 已建立 Pi 执行、持久化、模型、准备、工具和原生文件边界，但尚无产品 Conversation caller。落实 #26 已批准 C16，使 Assistant Workspace 能提供可持久化多轮 Pi Conversation。

## What Changes

- 一次迁移到 Conversations / Skill Runs 两个 lane、五个 source，默认 Conversations / Zotero Agent。
- 增加深层 Conversation 协调器与共享 Workspace adapter，组合既有 owner、Provider、Preparation、Gateway 和 managed-file 边界。
- 接入显式资源、冻结模型、取消、压缩、异步标题及 archive/restore/delete。
- 按 Q172 将用户文件复制为 owner 的不可变 snapshot，原路径只在发送操作中暂存。

## Capabilities

### New Capabilities

- `pi-conversation-integration`: Pi Conversation 的生命周期、发送、工具、资源及标题。

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: source registry、lane/source 选择及 Pi 共享投影。
- `pi-trusted-native-execution`: Conversation 用户文件 snapshot 与只读 managed ref。
- `builtin-pi-provider-configuration`: 可选辅助模型配置引用。

## Impact

新增 `src/shared/assistantWorkspaceSourceRegistry.ts`、`src/modules/piConversation.ts`、`src/modules/piConversationWorkspaceSurface.ts`；修改共享 Workspace host/sidebar/contracts/components，扩展 Pi 前置 owner/runtime/provider/preparation/native-file 接口。复用既有测试和 runner，不新增依赖、不提交代码；C17–C20 保持后续边界。
