# 验证记录

2026-10-10，在当前 Windows 工作区运行。报告结论按用户要求直接作为修复依据，未重复进行真实库诊断。

已通过：

- Node 核心回归：125、121、257、264、270、276、48，共 225 项通过。覆盖迁移空来源/summary/收据、列恢复与重试、274 条完整遍历、失败保留、owner 隔离、详情和虚拟窗口。
- 在追加首窗口重开、固定工具栏布局检查后，125/257 的两个受影响用例再次通过。
- 协议测试 218：9 项通过；客户端基础测试 175：59 项通过。
- 220：除 Windows 符号链接权限受阻的用例外，其余 33 项通过。
- 原生 RPC 测试 229：补齐默认 Host fixture 的 `total` 后，最终整份测试 27 项通过，退出码为 0。相关 Node 回归合计 353 项通过。
- Rust：`cargo +nightly-2026-07-25 test -p synthesis-application workbench_index --manifest-path rust/synthesis-sidecar/Cargo.toml --locked`，5 项通过；同一命令将过滤器改为 `workbench_referenced_index`，1 项通过，包含空非末页继续读取。
- `npm run check:synthesis-cross-language-contracts`：88 个正例、69 个反例通过，错误数 0。
- `npm run build:synthesis-rust-sidecar`：当前源码 workspace 构建通过。
- `npm run build`：最终源码插件/XPI 构建通过，包含四个共享包、插件、sidebar、dashboard、synthesis 的类型检查，以及 canonical 生成验证器一致性检查。
- `npm run check:localization-governance`、受影响代码的 ESLint、Prettier、Rust `fmt --all --check`、`git diff --check`、OpenSpec strict validation 通过。

限制：

- 220 的 `reproduces every inventory gate without an active OpenSpec change directory` 在创建指向 `node_modules` 的 Windows symlink 时返回 `EPERM`；未改变权限或测试逻辑绕过该限制。
- 229 定向复跑曾在断言通过后出现 Windows Node `UV_HANDLE_CLOSING` 退出错误；最终整份复跑未重现，退出码为 0。
- 未运行真实 Zotero E2E、真实库修复、全仓 Node/Rust 测试或发布。新插件与 sidecar 必须配套部署，因为分页总数是严格协议字段；历史收据未改写。
