# Proposal

## Why

Workflow 设置最近几次修复把原始表单草稿直接交给 provider profile 校验，破坏了空值删除、默认布尔值及默认模型语义。模块测试通过但真实表单无法直接提交，需要统一提交契约并补上表单与宿主之间断开的验收。

## What Changes

- Dashboard 保存、提交窗口确认与执行上下文复用 settings 提交路径：合并删除标记、验证显式值、保留设置快照，再派生运行选项。
- 描述器保留非法显式值及未指定状态，显示投影不承担运行归一化。
- 完整 ACP 目录刷新统一取消、总预算、迟到启动与有界清理。
- 删除无调用者的原生设置窗口及定向探测执行面，保留实际使用的公共辅助函数。
- 用真实表单到真实宿主的集成场景及 Zotero 10/7/9 验收覆盖提交行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `workflow-settings-single-source-submit-flow`: 明确删除标记、合法默认值、显式设置与运行投影的顺序及刷新生命周期。
- `acp-skills-runtime-options`: 明确默认关闭的审批选项与完整目录探测的有界生命周期。

## Impact

涉及 workflow settings、Dashboard 两个表单、provider 校验、ACP probe、现有相关测试和文档。公共字段、消息结构、持久化版本和依赖保持不变；以 v0.8.4 `fe273f37f` 为行为参照，修改前源码基线为 `59e792b8a`。
