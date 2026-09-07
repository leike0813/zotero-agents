# Change 4 本地实现验证

PR #40 已合并，本地实现基线为 `52624e6133e053cf307536248682ba3187801c7d`。前置证据见 [PR40 验证](issue-39-change-4-pr40-verification.md)。

## 已通过的行为验证

| 检查 | 结果 | 证据边界 |
| --- | --- | --- |
| Broker 102 + Host Bridge 107 | 139 passing | 六种 managed note、四种 singleton、完整 detail、精确 UTF-8 字节预算、无副作用拒绝、重放、闭合 DTO |
| Literature Analysis 21 + 50（full） | 43 passing，0 pending | full/score-only apply、上传与本地路径读取、Citation 投影、重复 singleton typed conflict |
| Import/export 消费者 45 | 32 passing | custom/conversation round-trip、实际 debug producer 生成三种 canonical note |
| Library Artifacts/readiness UI48 | 22 passing | References 缺失或重复时 Citation stale，精确恢复后 current |
| Workflow Host 合同 187 + Import schema 46 | 22 passing | 25/23/96 显式 API 结构、闭合输入 |
| Research Bundle 服务 194 | 25 passing | 完整 References、Digest、Citation JSON 与派生报告 |
| 深度阅读与标签请求 158 + 64 | 24 passing | canonical Host artifact 优先、有效 Digest 读取 |
| Synthesis 定向 TS 合同及 Host/Application | 47 passing | Source ID 保留、闭合字段、完整 Citation、basis stale 投影 |
| Rust workspace | 335 tests + doc-tests passing | 项目指定 nightly 工具链；build、clippy、workspace fmt 也通过 |
| 真实 Zotero 9.0.4 事务 275 | 3 passing | 单次数据库事务、第二笔失败整体回滚及 staging 清理、cleanup 失败同 operation repair_required |

Node transaction stub 只用于调用方测试；原子性结论来自真实 Zotero。迁移写入后的 required cleanup（包含 cleanup plan 校验）失败保留 canonical 数据，不创建独立 cleanup operation。

迁移 264/UI264 和 bundle 47 最终合跑 **44 passing**，覆盖跨 note 重复、durable hash、超过 100 条 receipt 的续跑、显式旧 ZIP 确认/取消、损坏 PNG、完整 artifact 和图片的重复导入。日志 `/tmp/issue39-change4-migration-bundle-close.log`。SQLite 仅保存 basis hash、refs、版本及审计字段；原始 HTML 和完整 artifact 留在运行期计划中。首次直接调用 Mocha 使用默认 2 秒 timeout，初始化超时；按项目长初始化需要设为 30 秒后全套通过。

## 工程检查

- 全部 160 个匹配的 changed/untracked 代码和项目文档文件通过 Prettier；artifact 过程工件不计入该检查。
- 74 个 changed/untracked TS/TSX 文件 ESLint 为 0 errors；两个文件按既有配置忽略。
- canonical validator、Host mutation/read contract、英文 Host Bridge materialized surface freshness 通过。
- Built-in workflow manifest 校验通过，DEL-12/13/15 清理后为 162 个文件。
- OpenSpec strict validation 通过。
- `npm run build` 最终通过：四个 Synthesis package 检查、插件打包，以及主/sidebar/dashboard/synthesis 四个 TypeScript project；日志 `/tmp/issue39-change4-build-close.log`。

英文 surface 的固定 baseline 厚度门禁通过；unmapped、downgraded、unauthorized dropped、intra-package duplicate 四类计数均为零，见 [语义审阅](issue-39-change-4-semantic-review.md)。中文审阅镜像按用户要求停止更新。

主要日志在 `/tmp/issue39-change4-*`；原生测试与 Synthesis/上游细节分别见 [原生验证](issue-39-change-4-native-verification.md)、[Synthesis 验证](issue-39-change-4-synthesis-verification.md)。

## 上游固定提交已完成

用户已授权修复、提交与推送。原十个 canonical schema/template/runtime/指令文件和新增 CLI 回归测试共十一文件，已提交并推送至 `leike0813/agent-skills` 的 `skill/literature-analysis`：

`5748a71ed2acb6614c071e0ddc81a6ad6bcf969c`

远端 ref、本地子模块 HEAD 和本项目已暂存的 gitlink 一致；子模块工作树干净。主项目实现尚未提交。

本次补充修复在物化前校验 Citation 输入；旧格式、缺字段和 null 返回 `invalid_citation_artifact`，不覆盖已有输出。CLI 回归测试先失败后通过，合法 canonical Citation 保持完整。验证命令：

```sh
uv run --project="$HOME/.ar" --locked -- python -B skills_builtin/literature-analysis/tests/test_citation_materialization.py
```

结果为 2 tests passing（拒绝测试含三个输入分支），日志 `/tmp/issue39-citation-rejection-{red,green}.log`。未执行正式发布或 OpenSpec 同步、归档。
