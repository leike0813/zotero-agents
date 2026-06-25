# デバッグとテスト

カスタム Workflow を作成した後、以下の方法で検証とデバッグを行える。

## デバッグモードの有効化

環境設定でデバッグモードを有効にすると、追加のデバッグツールと情報表示が利用可能になる。

Zotero → 設定 → Zotero Agents → デバッグモードを有効にする

デバッグモードを有効にすると:

- デバッグ関連の Workflow がダッシュボードに表示される
- ランタイムログがより詳細になる
- 一部の診断ツールが使用可能になる

## デバッグプローブツールの使用

プラグインには組み込みの `workflow-debug-probe` デバッグツールキットが含まれており、複数の診断 Workflow が用意されている。

| Workflow | 目的 |
|---------|------|
| **Workflow Debug Probe** | Workflow の実行前状態の検査、診断パネルの表示 |
| **Debug Sequence Linear Probe** | シーケンシャル実行とデフォルト handoff 伝達の検証 |
| **Debug Sequence Workspace Reuse Probe** | ステップ間ワークスペース再利用の検証 |
| **Debug Sequence Context Isolation Probe** | 明示的な handoff フィルタリングと分離ワークスペースの検証 |

これらの Workflow はダッシュボードの Workflow 一覧（デバッグモード時）に表示され、直接実行してシーケンス実行機構の検証を行える。

## ログの確認

### ランタイムログ

Workflow は実行中にランタイムログを生成し、ダッシュボードで確認できる。

1. ダッシュボードを開く
2. 実行中または完了したタスクを探す
3. 「View Logs」をクリックしてログパネルを展開する

### フックでのログ出力

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Write to runtime log
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Processing parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // For complex debug information, you can use console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## 一般的な問題のトラブルシューティング

### Workflow がダッシュボードに表示されない

1. `workflow.json` が正しいディレクトリに配置されているか確認する
2. `workflow.json` のフォーマットが正しいか確認する（JSON 構文）
3. `id` が一意であり、公式 Workflow と競合していないか確認する
4. `applyResult` のスクリプトパスが正しいか確認する
5. プラグインのエラーログを確認する（Zotero → ヘルプ → トラブルシューティング → View Log File）

### filterInputs が null を返す

`filterInputs` が `null` を返した場合、条件に合致する選択が見つからなかったことを意味し、Workflow は実行されない。フィルタリングロジックが正しいか確認する。

### buildRequest と宣言的リクエストの競合

`buildRequest` フックと `workflow.json` の `request` フィールドは**相互排他**である。両方が存在する場合、`buildRequest` が優先される。リクエストの動作が期待通りでない場合は、両方が意図せず同時に定義されていないか確認する。

### フックスクリプトの実行失敗

- フックスクリプトが `.mjs`（ES Module）形式であることを確認する
- 正しい関数名（`filterInputs`、`buildRequest`、`applyResult`）がエクスポートされていることを確認する
- 関数のシグネチャが `{ parent, bundleReader, runtime }` などのパラメータを正しく受け取っていることを確認する
- 相対インポートパスが正しいか確認する

### 結果が Zotero に書き込まれない

`applyResult` が `hostApi.mutations.execute()` を使用しているのに反映されない場合、以下の原因が考えられる。

- 書き込み操作にはユーザー承認が必要だが、承認ポップアップが無視されたかタイムアウトした
- `execution.zoteroHostAccess.required` が `true` に設定されていない状態で書き込み操作を実行した
- `allowWriteApprovalBypass` はプラグインの権限設定と組み合わせて使用する必要がある

## 開発の推奨事項

### シンプルに始める

1. まず `pass-through` Provider と最小限の `applyResult` で Workflow が正常に読み込まれることを検証する
2. `filterInputs` と `buildRequest` を徐々に追加する
3. 最後に実際のバックエンドに接続する

### notifications.toast で素早くフィードバックする

```js
hostApi.notifications.toast({
  text: `filterInputs received ${selectionContext.items.parents.length} parent items`,
  type: "default",
});
```

これはログを確認せずとも実行結果を確認できる迅速なデバッグ手法である。

### 公式 Workflow を参照する

公式 Workflow は最適な学習リファレンスである。公式パッケージをインストールした後、`<Zotero Data>/zotero-agents/content/official/workflows/` ディレクトリでソースコードを確認できる。

- `literature-workbench-package/literature-analysis/` — 完全な skillrunner.job.v1 の例
- `content/official/workflows/literature-workbench-package/export-notes/` — シンプルな pass-through の例
- `content/official/workflows/mineru/` — buildRequest + ファイル処理の例
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — インタラクティブモードの例

## 次のステップ

- [Workflow マニフェスト完全リファレンス](#doc/workflows%2Fcustom%2Fmanifest) — workflow.json の全フィールド
- [ホスト API リファレンス](#doc/workflows%2Fcustom%2Fhost-api) — フックで利用可能な全 API
