# Tasks

本清单补录本次已完成的实现和自动验证；结果见 `verification.md`。构建、真实 Zotero 验收、提交和归档不计入本次已完成工作。

## 1. 默认显示与缓存读取

- [x] 1.1 两处表单用真实目录项显示默认值，未手选不产生覆盖，同值点击可形成显式选择；通过 `242-dashboard-workflow-options`、`250-dashboard-workflow-settings-dialog` 测试验证。
- [x] 1.2 打开表单及切换 backend/provider/model 只读缓存，保留手动完整刷新与取消隔离；通过 `35-workflow-settings-execution` 的无自动探测、手动刷新取消用例验证。
- [x] 1.3 旧 reasoning 缓存可展示，仍按 model/mode/fingerprint/revision 隔离，缺少匹配上下文时禁用；通过 `111-acp-backend-probe`、`181-provider-profile-selection` 测试验证，并更新 ACP 组件文档和刷新提示。

## 2. backend 记忆与草稿衔接

- [x] 2.1 按 workflow、表单生命周期记忆 backend 专属选项，恢复有效值、丢弃失效记录并保留通用设置；通过 `35-workflow-settings-execution` 的 backend 往返、失效模型和 ACP/SkillRunner 切换用例验证。
- [x] 2.2 两处宿主共用未回声草稿的 source/rebased 衔接；通过连续 provider 切换、继续修改超时、立即确认及迟到描述器用例验证，后续显式模型选择优先。
- [x] 2.3 组件接纳宿主字段删除并保留在途输入，禁用控件不在确认时写回空串；通过 `250-dashboard-workflow-settings-dialog` 回声与无 reasoning 用例验证，并更新 settings SSOT 和 `AGENTS.md`。

## 3. 集成验证

- [x] 3.1 合并运行八个定点测试文件，结果为 160 passing；执行命令记录在 `verification.md`。
- [x] 3.2 主项目与 Dashboard 类型检查、修改文件的 ESLint/Prettier 和 `git diff --check` 通过；验证范围记录在 `verification.md`。
- [x] 3.3 复跑额外 ACP 测试的九个失败，在修复前 HEAD 导出的临时基线中复现相同失败；在 `verification.md` 区分本次回归验证与未解决基线问题。

## 4. OpenSpec 补录

- [x] 4.1 补齐 proposal、design、两份完整 delta、tasks、verification；检查 delta 与已修改主规格一致，并运行 `openspec validate fix-workflow-cached-backend-selection` 与文档格式检查。

## Workflow follow-up

- 如需 XPI 或真实 Zotero 验收，先执行项目 build-preflight，再按既有隔离测试流程收集证据；当前没有这些验收结果。
- 审阅后再按用户授权处理归档和 Git 提交；主规格已更新，归档前需核对 delta 的重命名是否已应用，避免重复同步。
