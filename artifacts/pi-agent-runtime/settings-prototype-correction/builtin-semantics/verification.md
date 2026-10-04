# Built-in Agent 设置命名与入口

按用户追加要求，设置窗口使用 Built-in Agent 语义；Backend Manager 中的 Built-in Agent 选项卡仅保留一个打开设置的按钮。

## 改动

- `BackendManagerRegion.tsx` 删除摘要组件、标题、地址和说明，选项卡正文只渲染打开设置按钮。
- `backendManager.ts` 的按钮文案直接取自 `pref-zotero-agent-settings` 的 `.label`，与首选项共用语言消息；删除不再使用的两条后端管理消息及其 11 种语言版本。
- `zoteroAgentSettings.ts` 将同一个本地化窗口标题用于宿主窗口和 iframe；HTML 的默认标题也使用 Built-in Agent Settings。
- 设置页导航复用已存在的 Built-in Agent 名称消息。引导、ChatGPT 欢迎确认、MCP 运行目录说明和首选项按钮同步更新 11 种语言。
- 复用现有页面与实机测试，将旧摘要断言改为“正文仅有一个按钮，点击派发打开设置动作”。草稿保护、区域身份、重新聚焦和窗口布局用例保留。
- 更新 `docs/components/zotero-agent-settings.md`，记录四个入口和按钮文案的来源。

## 验证

先修改既有用例，确认旧实现失败：正文仍包含 Built-in Pi Agent、地址和说明。修改实现后，Backend Manager 与设置页的 39 项测试全部通过。

命令：

```sh
npx tsx node_modules/mocha/bin/mocha tests/dashboard/251-dashboard-backend-manager.test.ts tests/dashboard/254-zotero-agent-settings.test.ts --require tests/setup/zotero-mock.ts --timeout 20000 --exit
npm run check:localization-governance
ZOTERO_BUILD_DEBUG=0 ZOTERO_PLUGIN_DIST=.scaffold/settings-prototype-corrected npm run build
```

完整生产构建、相关源码 ESLint、语言治理、Prettier 与 `git diff --check` 均通过。日志：[build.log](build.log)、[tests.log](tests.log)、[localization.log](localization.log)、[eslint.log](eslint.log)、[format.log](format.log)。

真实 Zotero 10.0.1 / Linux x64 复测 7 项通过，运行 ID `zotero-10-linux-x64-99dd8306`，清理完成。入口用例验证选项卡正文只有打开设置按钮、点击打开独立窗口且 Backend Profile 不被保存或丢弃；其余用例继续验证首选项直接打开、重新聚焦、草稿保护、区域身份和双栏布局。

候选包为 `.scaffold/settings-prototype-corrected/zotero-agents.xpi`，SHA-256 `85bc0cc0941929f38fde611918d1ba7b2fe07b65fd5a709f3fd8a4b0405eaa1d`，已与 [receipt.json](receipt.json) 一致。实机日志：[runner.stdout.log](runner.stdout.log)。源码基线 `af36c2e861bbaaea0ddbc13a3dff248e860879f9`，包含工作区未提交修正。

实机截图已查看：

- [Built-in Agent 选项卡，仅有打开按钮](zotero-10/backend-manager-built-in-launcher.png)
- [设置导航与引导页](zotero-10/normal-light-overview.png)
- [紧凑窗口工作台](zotero-10/compact-saved-workbench.png)

实机复测使用既有 compatibility runner 与 UI 用例，临时入口只选择该用例；测试 profile 使用控制数据。
