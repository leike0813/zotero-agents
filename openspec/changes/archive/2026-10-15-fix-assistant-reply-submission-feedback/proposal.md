# Proposal

## Why

ACP Chat、ACP Skills 和 SkillRunner 的部分回复入口要等到后端接收或会话准备完成才更新界面。用户无法判断点击是否生效，容易重复提交并触发错误，因此需要把本地提交反馈与后端执行状态分开。

## What Changes

- 有效回复在跨越 bridge 前锁定当前 source/owner 的入口，隐藏已回答的控件，并立即显示本地用户消息；选项显示 label，发送仍使用原始 JSON value。
- 使用既有 actionId 关联提交结果和正式 transcript 条目；有界保留此前提交的关联，使早到、迟到回声及相同文本的不同轮次正确合并。
- 提交失败保留错误行，恢复仍有效的控件和文本草稿，由用户手动重试；后续 agent 执行失败不改写此前回复的接纳结果。
- 排队、恢复和 hydrate 期间显示独立的 submitting 状态；文件选择先防重，校验后显示文件名摘要，认证秘密不进入本地回声。
- 维持 managed region、transcript 行和分页的身份语义，补齐三来源回归、文档及提交提示的多语言资源。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `assistant-shell-interaction-bridge`：增加跨来源、按 owner 隔离的回复即时反馈、防重、失败恢复和回声合并要求。

## Impact

- 共享 wire contract、submission receipt、child/Shell bridge、panel model 和 owner 区域发布。
- ACP Chat session manager、ACP Skills actions/store/surface、SkillRunner run dialog/surface。
- 既有 ACP UI/publication、session、runner、SkillRunner surface 和 managed component 测试。
- Assistant Workspace 文档、ACP Skills 状态机说明、项目 UI 约束和 11 种语言提示。
- 不新增依赖，不修改后端 API 或历史 transcript 存储格式。

本 change 补记已完成的实现与规格变更；主规格中的新增要求已经同步，delta 保留相对于本轮修复前规格的增量。归档和提交另行执行。
