# Issue #36 验收记录

基线：`9d5e08e447d570f96437d177517d3e11617cf0a2`。参考 Issue #36 最终设计说明与原型 `c2f60173`。

## 实现

- 生产页面补齐 Pi Skill Runs iframe；导航分为两行，支持键盘、来源记忆、数量与待处理标记。
- banner 的圆形新建按钮打开共享来源菜单；菜单使用已有导航分组，沿用 canonical 创建动作。抽屉里的直接创建动作保留。
- 后台来源只读取导航。首次打开及子文档替换可重发基线；迟到数据、关闭工作区后的更新被丢弃。
- Pi 会话支持空闲归档、Sessions 名称、专属输入提示；两个 Pi 来源只显示适用的 Model/Reasoning 控件。Agent Settings 从 Details 打开。
- Runtime、Model、Workflow、Workspace 与用量来自现有 owner 事实。输入/输出与费用保留部分和未知状态；新增字段覆盖 11 种语言。
- 未引入 Chat/Research 模式，也未改变权限、恢复、持久化或待处理提醒的清除规则。这两项遵循用户确认的现行运行语义。

## 验证

- `npm run test:node:assistant`：8 个文件的分片通过。
- `npm run test:node:acp`：runtime 和 skill-run 分片通过；session 分片的旧映射期望已更新，`npm run test:node -- --shard acp-session` 重跑通过。
- 最终定向 Mocha：Assistant 192/258/260、ACP 97/184 与 UI 309 合计 249 项通过，覆盖投影、菜单、权限、owner-first、分页与非 transcript DOM 身份。
- `tests/ui/309-assistant-workspace-layout.test.ts`：7 项通过；实际 HTML/CSS、360/460px、浅色/深色、两列/三列回复控件。已目视查看 Chromium 导航截图。
- `npm run build`、sidebar TypeScript、变更文件 ESLint/Prettier 与 `npm run check:pi-mcp-browser-bundle` 通过。生成的 locale 类型同步新增字段。
- `openspec validate align-assistant-workspace-with-source-prototype --strict` 通过。

真实宿主沿用 `npm run test:zotero:e2e`，过滤：

```text
System E2E runner foundation|AW-0[1-2]|PI-0[1-4]|configures hosted Agent Settings
```

8 项通过，family cleanup 与 health gate 通过。使用当前源码构建的本地 Synthesis sidecar。证据：`artifacts/test-diagnostics/system-e2e/60318a4a-2ad1-4da8-8252-070494cc65e5/run-manifest.json`，terminalState 为 `complete`。宿主实际报告 Linux Zotero **10.0.5**；启动路径的目录名为 10.0.2，验收按实际版本记录。

## 覆盖边界

未执行 Windows、Zotero 7/9 或真实外部模型服务验收；未做真实宿主内的人工逐像素验收。真实宿主用例之后补充的 Settings 路由、状态指示和副标题由定向测试与最终构建验证。未提交代码，用户原有的 `AGENTS.md` 改动保持原样。
