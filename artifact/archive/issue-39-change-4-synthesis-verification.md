# Change 4 Synthesis 验证记录

本记录对应主项目实现基线 `52624e6133e053cf307536248682ba3187801c7d`。主项目实现保持未提交；literature-analysis 上游已按用户授权提交、推送并更新 gitlink，详见文末。

OpenSpec `canonicalize-managed-literature-artifacts` 的完成状态以 `tasks.md` 为准。Synthesis 合同、投影、本地构建和上游固定提交均已有验证证据，3.4 已完成。

## Producer smoke

以 `PYTHONDONTWRITEBYTECODE=1` 和 `python -B` 运行 literature-analysis runtime 的真实 materialization/validation 路径（临时输出目录，未写入项目）。`_materialize_outputs` 生成的三个输出均通过 `_validate_public_output`：

```json
{
  "ok": true,
  "references": 1,
  "sourceReferenceId": "20a12ad0-ddc4-41da-941f-dde4917dee22",
  "citationSchema": "citation_analysis_artifact.v1",
  "scoreSchema": "literature_score.v1",
  "scoreDimensions": 6,
  "warnings": [
    "literature_matching_metadata ignored: literature_matching_metadata must be object"
  ]
}
```

References 由 producer 分配 opaque `sourceReferenceId`；Citation 通过该 ID 关联完整 References。Citation 输出没有 `report_md`，Markdown 属于 Application 派生投影。Score 输出为 bare `literature_score.v1`，保留全部 dimensions、criteria 和 evidence。

## TypeScript producer、consumer 与闭合合同

以下定向合同、Application 投影、Source ID 存储和 Synthesis host 读路径共 **47 passing**：

```text
test/core/121-synthesis-reference-sidecar-index.test.ts
test/core/122-synthesis-citation-graph.test.ts
test/core/149-synthesis-benchmark-datasets.test.ts
test/core/178-synthesis-host-read-ports.test.ts
test/node/core/270-canonical-literature-artifact-contract.test.ts
test/node/core/271-synthesis-canonical-artifact-projection.test.ts
test/node/core/272-literature-score-contract.test.ts
test/node/core/273-citation-report-projection.test.ts
test/node/core/274-synthesis-reference-source-id-storage.test.ts
```

关键证据：

- `libraryAdapter.ts` 从 Broker managed detail 生成 `noteKind + payload` detached facts；Citation 的 `referencesBasis` 仅通过运行时 `provenance` 传递，永不进入公共 canonical Citation payload。
- `referenceProjection.ts` 只接受嵌套 `bibliography/extraction/matching` 和显式 `sourceReferenceId`，拒绝旧 root-field、位置索引和 wrapper alias；Citation 的 `function` 与 `role_in_context` 分别保存。
- `referenceRefreshApplication.ts` 与 Rust refresh application 在读取时重新计算 References basis；过期 basis 返回 `citation_references_basis_mismatch`/`payload_stale`，不会静默重用旧 Citation。
- `test/node/core/274...` 与 Rust `citation_reference::tests::reference_projection_round_trips_each_source_id_for_one_canonical_reference` 证明相同 canonical 内容归并后仍保留多个 Source ID。
- `libraryAdapter.ts` 读取 Broker managed detail 的 `health`；Citation 为 stale 时只投影 `issue: "references_basis_mismatch"`，同时保留 canonical `payload` 和运行时 `provenance.referencesBasis`。它不复制 basis/hash 计算，也不把 runtime basis 写回公开 Citation。
- `test/node/core/271-synthesis-canonical-artifact-projection.test.ts` 覆盖 References-only 写入后的 `current → stale → exact-basis restore current` 路径；该定向文件当前 **4 passing**。

## TypeScript/Rust checks

通过：

```text
./node_modules/.bin/tsc -p tsconfig.json --noEmit
npm run check:synthesis-engine
npm run check:synthesis-contracts
npm run check:synthesis-repository
npm run check:synthesis-application
npm run check:synthesis-cross-language-contracts
npm run check:synthesis-native-runtime-contract-parity
npm run check:synthesis-native-worker-transfer-parity
npm run check:synthesis-reference-canonical-surface-parity
npm run check:synthesis-service-boundary
npm run check:synthesis-production-capabilities
npm run build:synthesis-rust-sidecar
npm run check:synthesis-rust-sidecar
npm run test:synthesis-rust-sidecar
```

本轮再次通过 `tsc -p tsconfig.json --noEmit`、`npm run check:synthesis-application`、`npm run check:synthesis-contracts`，以及 nightly `rustup run nightly-2026-07-25 rustfmt --check` 对本 change 全部 10 个 changed Rust 文件的检查。随后重新运行 `npm run format:check:synthesis-rust-sidecar`，workspace Rust format check 为 0。TypeScript focused suite 为 **47 passing**；按项目规定的 `cargo +nightly-2026-07-25` 运行 `npm run test:synthesis-rust-sidecar`，workspace unit/integration/doc targets 全部通过（335 个 unit/integration tests，0 failed；doc-tests 也全部通过）。先前直接使用默认 stable 的 `cargo test` 所见 `libsqlite3-sys cfg_select` 错误不代表项目工具链阻塞。本轮指定的 13 个 TS/JSON 文件也通过 `prettier --check`；Root 后续完成全部 160 个匹配变更文件的 Prettier 检查，全部通过。

## Fixture 迁移与当前缺口

`122`、`178`、benchmark synthetic registry/production-route fixture 已从旧
`html/payloadBlocks` 或裸 `references/citations` 形状迁移到 canonical managed-note
facts；Rust production route synthetic read 的两个相关用例也通过。

Literature-analysis 21 与 50 已由根会话用 `ZOTERO_TEST_MODE=full` 合跑，
最终 **43 passing、0 failed、0 pending**，日志
`/tmp/issue39-change4-analysis-complete.log`。覆盖 bare Score readiness、完整与
score-only apply、上传/本地结果路径读取、Canonical Citation 进入 Synthesis、
sourceRef 保留，以及重复 singleton 的 typed conflict 和无写入行为。
Node transaction seam 和 source-page adapter 只在 Node 测试中注入。

## 上游提交与本地 pin

用户已授权修复后提交并推送。十个原有变更文件，加上 `tests/test_citation_materialization.py`，共十一文件已提交：

- remote：`https://github.com/leike0813/agent-skills`
- branch：`skill/literature-analysis`
- commit：`5748a71ed2acb6614c071e0ddc81a6ad6bcf969c`
- parent：`243ca2a63c36165796f8ddffc23f0cc1e4615b6a`

远端分支与子模块 HEAD 一致，子模块工作树干净。本项目 gitlink 已更新并暂存；插件 TS/Rust 和文档实现未提交。

补充修复拒绝非法 Citation 物化，避免旧输入产生空 artifact 或覆盖现有文件。公开 CLI 回归测试先失败后通过，覆盖旧格式、缺字段、null 和合法 canonical 输入。完整命令及日志见主验证记录。

本地 sidecar build/clippy/test/fmt 已通过；未执行七平台 prebuild 或正式 release。中文镜像按用户要求停止更新。
