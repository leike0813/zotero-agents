# Release Notes - Zotero Skills v0.3.0

**Release Date**: 2026-04-06  
**Previous Version**: v0.2.0  

---

## 概述

v0.3.0 是一次重大更新，引入了 **Workflow Package** 架构，将多个独立 workflow 聚合为可共享代码的包单元。同时完成了 SkillRunner 前端协议升级、Tag 管理功能增强、以及文献处理工作流的统一化重构。

---

## 重大变更 (Breaking Changes)

### 1. Workflow Package 架构升级

- **包名称变更**: `reference-workbench-package` 更名为 `literature-workbench-package`
- **workflow 迁入**: `literature-explainer` 从独立 workflow 迁入文献工作bench 包内
- **兼容性**: workflow ID 保持不变，用户的菜单、配置和调用方式不受影响

### 2. SkillRunner 本地后端版本升级

- 默认版本从 `v0.4.5` 升级到 `v0.5.1`
- 影响文件:
  - `addon/prefs.js`
  - `src/modules/skillRunnerLocalRuntimeManager.ts`
  - 所有相关测试文件

---

## 新增功能

### 1. 自定义 Note 导入/导出

**export-notes workflow 扩展**:
- 支持导出普通 note（之前仅支持 literature-digest 的三类特殊 note）
- 有 payload 的 note 导出为 `.md` 文件
- 无 payload 的 note 导出为 `.html` 文件

**import-notes workflow 扩展**:
- 新增 "Import Custom Note(s)" 按钮
- 支持一次选择多个 markdown 文件
- 导入的 note 标记为 `data-zs-note-kind="custom"` 并包含 base64 payload

**相关文件**:
- `literature-workbench-package/lib/literatureDigestNotes.mjs` - 新增 `exportCustomNote()` / `importCustomNotes()`
- `literature-workbench-package/lib/noteCodecs.mjs` - 统一 note codec 层

### 2. Tag 受控词表订阅/发布

**Tag Manager 增强**:
- 支持从 GitHub 远端词表订阅（`reference/Zotero_TagVocab` 风格）
- 本地保存后自动发布回 GitHub Contents API
- 新增 workflow settings: `github_owner`, `github_repo`, `file_path`, `github_token`
- 远端同步失败时写 runtime log 并给出用户反馈

**相关文件**:
- `tag-vocabulary-package/lib/remote.mjs` - 新增远端同步逻辑
- `tag-vocabulary-package/lib/state.mjs` - 状态管理

### 3. Workflow Debug Probe

- 新增诊断专用 workflow，可在其他 workflow 被 preflight 禁用时运行
- 用于排查运行时故障

**相关文件**:
- `workflows_builtin/workflow-debug-probe/` - 新增诊断 workflow

### 4. Host API 增强

- 新增 `host.file.pickFiles()` 支持多选文件
- 替换原来循环调用 `pickFile` 的粗糙实现

---

## 改进与优化

### 1. SkillRunner 执行模式重构

**单一所有者合同**:
- Reconciler 成为所有可恢复 SkillRunner 执行的唯一 `applyResult` 所有者
- 避免 foreground 和 reconciler 两条路径对同一请求重复 apply
- `auto` 模式的完成总结延迟到 reconciler 收敛时统一发出

**批量提交并行化**:
- 后端支持的 workflow 批次（skillrunner/generic-http）现在全并行分发
- 移除了前端不必要的序列化限制
- 本地 queue 状态语义保持不变

**相关文件**:
- `src/modules/skillRunnerTaskReconciler.ts`
- `src/modules/workflowExecution/deferredCompletionTracker.ts`
- `src/modules/workflowExecution/runConcurrency.ts`

### 2. Zotero 运行时工作流包模块加载器

- `.mjs` 文件使用真模块加载替换 text-transform fallback
- 包内 hook 可使用相对导入（例如 `import { x } from '../lib/foo.mjs'`）
- 保持与旧版单 workflow hook 的向后兼容

**相关文件**:
- `src/workflows/loader.ts`
- `src/workflows/packageHookBundler.ts`
- `src/workflows/hostApi.ts`

### 3. Note Codec 统一化

将分散在多个 workflow 中的 note/artifact 转换逻辑收敛为统一的 codec 层：

- 通用层: HTML ↔ markdown, payload base64 encode/decode
- Note kind 层: digest, references, citation-analysis, conversation-note, custom
- 双向入口: artifact → note / note → artifact

**相关文件**:
- `literature-workbench-package/lib/noteCodecs.mjs`
- `literature-workbench-package/lib/htmlCodec.mjs`
- `literature-workbench-package/lib/referencesNote.mjs`

### 4. 本地后端控制迁移到插件侧桥接组件

- `src/modules/skillRunnerCtlBridge.ts` - 新增桥接层
- 弃用旧版 skillrunner-local 后端 ID
- 一键部署/启动按钮合并逻辑
- 运行时信息状态机固化

### 5. Dashboard 与 UI 优化

- Dashboard 默认窗口大小扩大，显示区域支持 resize
- Tag Manager 暂存窗口重构为网页方式
- Task Dashboard SkillRunner 观察逻辑升级到最新协议
- 所有 workflow 设置弹窗重构（围绕 Dashboard）

---

## Bug 修复

1. **多重 applyResult 动作 BUG** - 修复同一请求被重复 apply 的问题
2. **Task 排队逻辑** - 修复多选提交任务串行排队的行为
3. **Reference Matching workflow** - 修复无法正确工作的 BUG
4. **Toast 不自动消失** - 修复停留时间过长或不消失的 BUG
5. **Backend reconcile 轮询降级策略** - 添加超时降级机制

---

## 技术债务清理

- 重构 workflow 核心设计，允许一个包内携带多个 workflow
- 移除 "采样选区上下文" 及 "校验选区上下文" 按钮（或移入调试控制台）
- 清理硬编码开关决定的 UI 元素
- 进一步抽取可复用的手搓 UI 控件

---

## 新增文件清单

### 核心模块
- `src/modules/skillRunnerCtlBridge.ts` - SkillRunner 控制桥接
- `src/modules/skillRunnerExecutionMode.ts` - 执行模式管理
- `src/modules/pluginStateStore.ts` - 插件状态存储
- `src/modules/workflowDebugProbe.ts` - Debug Probe 模块
- `src/modules/workflowPackageDiagnostics.ts` - Package 诊断
- `src/modules/workflowExecution/deferredCompletionTracker.ts` - 延迟完成追踪
- `src/utils/runtimeBridge.ts` - 运行时桥接工具

### Workflow 相关
- `src/workflows/hostApi.ts` - Host API 扩展
- `src/workflows/packageHookBundler.ts` - Package Hook 打包器
- `src/workflows/errorMeta.ts` - 错误元数据

### 测试文件
- `test/core/48-workflow-execution-seams.test.ts`
- `test/core/52-runtime-bridge.test.ts`
- `test/core/55-workflow-apply-seam-risk-regression.test.ts`
- `test/core/57-backend-manager-risk-regression.test.ts`
- `test/core/58-suite-governance-constraints.test.ts`
- `test/core/74-skillrunner-ctl-bridge.test.ts`
- `test/core/85-deferred-workflow-completion-tracker.test.ts`
- `test/core/87-workflow-package-runtime-diagnostics.test.ts`
- `test/core/88-workflow-runtime-scope-diagnostics.test.ts`
- `test/core/89-workflow-debug-probe.test.ts`
- `test/workflow-tag-manager/66-tag-manager-github-sync.test.ts`
- `test/workflow-tag-manager/67-tag-vocabulary-package-lib.test.ts`

### 文档
- `openspec/changes/archive/2026-04-*` - 20+ 个 openspec change 文档
- 多项架构决策记录更新

---

## 开发者注意事项

### 构建与测试

```bash
# 构建
npm run build

# 运行测试
npm run test:lite          # 快速测试
npm run test:full          # 完整测试
npm run test:gate:pr       # PR gate
npm run test:gate:release  # Release gate
```

### Workflow Package 开发

新增 workflow package 需遵循以下结构：

```
workflows_builtin/my-package/
├── workflow-package.json   # 包索引
├── lib/                    # 共享代码
│   └── runtime.mjs
└── my-workflow/
    ├── workflow.json
    ├── hooks/
    └── README.md
```

---

## 升级指南

### 从 v0.2.0 升级

1. 备份用户配置和 workflow settings
2. 安装新版本后，SkillRunner 本地后端将自动升级到 v0.5.1
3. workflow package 会自动迁移，workflow ID 保持不变

### 兼容性问题

- 如果遇到 workflow 设置丢失，请检查 `workflowSettingsJson` preference
- 如果 SkillRunner 任务状态异常，尝试重启 Zotero 刷新 reconciler 状态

---

## 致谢

感谢所有贡献者和测试用户的反馈！

---

**完整变更集**: 239 个文件，+139,400 行，-5,246 行
