## Context

See proposal.md - Why. Dashboard 的三个 Preact 入口（dashboardApp、backendManagerApp、workflowSettingsDialogApp）通过 HTML `<script>` 预载 `custom-select.js`，再以 vendor island 方式消费 `window.createCustomSelect` / `window.createMultiSelect`。Zotero 的 openDialog + 非 remote `iframe type="content"` 弹窗中原生 `<select>` 的 popup 被安全模型吞掉，因此 DOM 模拟下拉在这些 surface 上是功能必需品；tab/侧边栏的 `browser type="content"` 不受此限。ESLint import boundary（`eslint.config.mjs`）允许 dashboard/sidebar/synthesis 组件 import `src/shared/**`。

## Goals / Non-Goals

**Goals:**

- 用 Preact 受控组件承载下拉行为，消除 `window.*` 全局依赖与加载顺序耦合。
- 保持 DOM class 契约与交互平价，现有样式表与基于 class 的测试断言不解约。
- 修复 F1/F2/F3，收敛 F10 的样式双事实源，消除 Backend Manager 弹窗的原生 select 违例。

**Non-Goals:**

- 不新增 vendor 没有的能力（方向键导航、搜索、分组）。
- 不动 preferences（XUL 架构选择）、tab/侧边栏里的原生 `<select>`、sidebar 冗余 jsx pragma。
- 不引入新依赖；不改变任何 wire DTO 或宿主 action 语义。

## Decisions

- **组件放在 `src/shared/customSelect.tsx`**：它是"弹窗安全 select"的页面中立 UI 原语，与 `preactRegionMount.ts`、`regionEquality.ts` 同类；四个页面的 ESLint import boundary 都允许 `src/shared/**`，未来 sidebar/synthesis 弹窗场景可直接复用。备选（放 `src/dashboard/components/`）能工作但语义偏窄，搬迁成本高。
- **保留 `.custom-select*` class 契约而非换名换样式**：三套样式表（`custom-select.css`、`styles.css`、对话框页面）和 242/250 的 class 断言都 targeting 这些钩子；保留钩子把替换风险集中在组件内部。F10 借收敛解决而非新增第三份样式。
- **CSS 收敛以对话框副本视觉为准回填共享文件**：对话框副本更新（2026-07-24 vs 共享文件 2026-06-24）且是发散方；共享文件独有的 `.disabled`/`.open-up` 分支回填保留。备选（共享视觉为准）同样可行但会让对话框视觉回退，两害相权取更新者。
- **outside-click 改为菜单打开时挂、关闭时摘的实例级 document 监听**（`useLayoutEffect` 同步挂摘）：开 A 时点 A 触发器对 B 即 outside，B 在同一事件分发内关闭，F1 自然消失；同时去掉 vendor 的页面级常驻监听。
- **多选 apply-on-close 用受控草稿实现**：open 时从 props 快照草稿，勾选只改草稿，关闭时以新数组提交一次 `onChange`；父级 value-only 更新只触发重渲染，不关菜单——vendor island 靠"value-only 不重建"hack 维持的行为在受控组件中天然成立。
- **Backend Manager auth 下拉预防性替换为 `CustomSelect`**：其运行在 caveats 点名的失效环境中，无法由 Agent 实测；替换在两种可能（限制仍在/已修复）下都安全，且消除禁令孤例。

## Risks / Trade-offs

- [dashboard 主页内联表单下拉视觉跟随变化（圆角 4px→8px、最小高 28px）] → 方案评审时已默认接受；样式数值不进测试断言。
- [245 的 stub seam 消失，断言从工厂调用次数改为 DOM 行为] → 语义等价改写，identity/不重建语义用元素身份与内容断言保持。
- [trigger 点击不再 stopPropagation] → 残留检查未发现依赖 click 冒泡拦截的逻辑；outside-click 语义由实例监听接管。
- [真实 Zotero 弹窗行为无法自动验证] → 人工点验清单列入 tasks 与完成报告。
