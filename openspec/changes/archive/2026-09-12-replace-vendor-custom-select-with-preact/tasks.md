## 1. 新组件（TDD）

- [x] 1.1 先写 `tests/shared/customSelect.test.ts`（class 契约、开 B 关 A、同 label 选中、Enter/Space/Escape、open-up、disabled、apply-on-close、value-only 不关菜单）并确认初始失败
- [x] 1.2 实现 `src/shared/customSelect.tsx`（`CustomSelect`/`CustomMultiSelect` 受控组件）并确认新测试 8 个用例全部通过

## 2. 消费方迁移

- [x] 2.1 `WorkflowOptionsRegion.tsx` 删除 vendor 工厂类型与 `createCustomSelect` 全局（保留 `zoteroAgentsWorkflowNumberFields`），island 改为直接渲染 `CustomSelect`，并确认测试 242、250 通过
- [x] 2.2 `RuntimeLogsRegion.tsx` 删除第二份 vendor 类型声明与 `MultiSelectIsland`，改用 `CustomMultiSelect`，并确认测试 245 通过
- [x] 2.3 `BackendManagerRegion.tsx` 的 auth 下拉由原生 `<select>` 改为 `CustomSelect` 并删除 `SelectField`，确认 dashboard 域测试通过

## 3. 样式收敛与死代码清理

- [x] 3.1 将 `workflow-settings-dialog.css:436-520` 副本的新视觉回填 `addon/content/components/custom-select.css`（保留 `.disabled`/`.open-up` 分支），删除对话框副本，确认两文件无重复 `.custom-select*` 定义
- [x] 3.2 删除 `custom-select.js`、`custom-progress.js`、`custom-progress.css` 及三个 HTML 中的 vendor `<script>` 标签，确认 rg 无活引用
- [x] 3.3 清理 `backend-manager.css` 中死去的 `.backend-select` 规则

## 4. 测试与基建更新

- [x] 4.1 242/250 移除 custom-select.js 注入、245 移除 stub seam 改为真实 DOM 行为断言，确认三文件共 37 个用例通过
- [x] 4.2 `scripts/run-node-test-shards.ts` 新增 `shared` shard，确认 `--shard shared` 与 `--domain dashboard` 均 exit 0

## 5. 文档与验证

- [x] 5.1 重写 `docs/components/ui-render-caveats.md`（修正路径漂移、禁令收窄至 openDialog 弹窗、规范改为 Preact 组件用法）
- [x] 5.2 运行四个 tsconfig 类型检查、ESLint、Prettier、`zotero-plugin build`，全部通过
- [x] 5.3 在真实 Zotero 中人工点验 backend manager auth 下拉、workflow settings 对话框下拉（含 disabled 态）、runtime logs 多选筛选的打开/勾选/关闭应用

