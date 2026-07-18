## 1. Policy 与启动初始化

- [x] 1.1 新增 builtin tag policy SSOT，并将 tag vocabulary 的创建、升级和所有持久化入口接入统一规范化
- [x] 1.2 在 Synthesis service 与 startup hook 中显式初始化 repository、protocol 和五个 builtin，失败时阻止完成启动
- [x] 1.3 扩展 tag vocabulary 与 startup 回归测试

## 2. Workbench 与 host command 保护

- [x] 2.1 在 UI model、Workbench tab/app/i18n 展示 builtin 标识并禁用身份编辑和删除，保留 note/aliases 管理
- [x] 2.2 在 host command 层阻止 builtin 删除、重命名、换 facet 和废弃，并扩展 UI/command 测试

## 3. Workflow 状态接口与生命周期

- [x] 3.1 为 WorkflowHostApi 增加只读 policy 与幂等 status transition 接口及验证
- [x] 3.2 接入 Search、Metadata Curator、MinerU、Literature Analysis、Deep Reading 的成功 apply 转换与 partial warning
- [x] 3.3 更新五个 workflow README 并扩展 created/existing、成功/跳过/失败/partial 测试

## 4. Bootstrapper 与 Regulator 边界

- [x] 4.1 更新 Tag Bootstrapper skill、Tag Standard 和 apply hook，删除旧 facet/阅读进度并过滤 builtin 候选
- [x] 4.2 在 Tag Regulator 非 submodule apply 边界过滤 builtin add/remove 并保留普通标签变更
- [x] 4.3 扩展 Bootstrapper 与 Regulator 回归测试

## 5. Hermes、文档与 OpenSpec

- [x] 5.1 将 Zotero Librarian inbox triage、distribution、manifest、reference 与测试改为 workflow status triage
- [x] 5.2 更新站点 tags 文档、workflow 文档及本地化副本
- [x] 5.3 完成并验证 OpenSpec delta

## 6. 审查与验证

- [x] 6.1 只读审查相关 submodule，形成逐仓库修改方案与无需修改结论，不修改指针
- [x] 6.2 运行目标测试、manifest/profile/localization checks、TypeScript、ESLint 和 Prettier check
