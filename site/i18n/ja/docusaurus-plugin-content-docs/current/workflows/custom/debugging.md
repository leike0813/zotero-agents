# デバッグとテスト

カスタムワークフローを作成した後、以下の方法で検証とデバッグを行うことができます。

## デバッグモードを有効にする

設定でデバッグモードを有効にすると、追加のデバッグツールや情報表示が利用可能になります：

Zotero → 設定 → Zotero Agents → デバッグモードを有効にする

デバッグモードが有効な場合：

- デバッグ関連のワークフローがダッシュボードに表示されます
- ランタイムログがより詳細になります
- 一部の診断ツールが使用可能になります

## Debug Probe ツールキットの使用

プラグインには、複数の診断ワークフローを含む組み込みの `workflow-debug-probe` デバッグツールキットが含まれています：

| ワークフロー | 目的 |
|--------------|------|
| **Workflow Debug Probe** | ワークフローの実行前状態を検査し、診断パネルを開く |
| **Debug Sequence Linear Probe** | 順次実行とデフォルトのハンドオフ受け渡しを検証 |
| **Debug Sequence Workspace Reuse Probe** | ステップ間のワークスペース再利用を検証 |
| **Debug Sequence Context Isolation Probe** | 明示的なハンドオフフィルタリングと分離されたワークスペースを検証 |

これらのワークフローは、ダッシュボードのワークフロー一覧に表示され（デバッグモード時）、直接実行してシーケンス実行メカニズムを検証できます。

## ログの表示

### ランタイムログ

ワークフローは実行中にランタイムログを生成し、ダッシュボードで表示できます：

1. ダッシュボードを開く
2. 実行中または完了したタスクを見つける
3. "View Logs" をクリックしてログパネルを展開する

### フックでログを書き込む

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // ランタイムログに書き込む
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `parent を処理中: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // 複雑なデバッグ情報には console を使用できます
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## 一般的な問題のトラブルシューティング

### ワークフローがダッシュボードに表示されない

1. `workflow.json` が正しいディレクトリに配置されているか確認する
2. `workflow.json` が正しくフォーマットされているか確認する（JSON 構文）
3. `id` が一意であり、公式ワークフローと競合していないか確認する
4. `applyResult` スクリプトのパスが正しいか確認する
5. プラグインのエラーログを確認する（Zotero → ヘルプ → トラブルシューティング → ログファイルを表示）

### 選択検証がすべてのユニットをスキップする

宣言的な `validateSelection` または `preflight` がすべての入力ユニットをスキップする場合、ワークフローはプロバイダーリクエストを送信しません。選択ポリシー、除外ルール、および `kind: "skip"` を返す `preflight` の結果を確認してください。

### buildRequest と宣言的リクエストの競合

`buildRequest` フックと `workflow.json` の `request` フィールドは**相互排他的**です。両方が存在する場合、`buildRequest` が優先されます。リクエストの動作が期待と異なる場合は、両方が誤って同時に定義されていないか確認してください。

### フックスクリプトの実行失敗

- フックスクリプトが `.mjs`（ES Module）形式であることを確認する
- 正しい関数名がエクスポートされていることを確認する：`preflight`、`buildRequest`、`normalizeSettings`、`applyResult`
- 関数シグネチャが `{ parent, bundleReader, runtime }` のようなパラメータを正しく受け取っていることを確認する
- 相対インポートパスが正しいか確認する

### 結果が Zotero に書き込まれない

`applyResult` が `hostApi.mutations.execute()` を使用しているが反映されない場合、考えられる原因：

- 書き込み操作にはユーザーの承認が必要ですが、承認ポップアップが無視されたかタイムアウトした
- `execution.zoteroHostAccess.required` が `true` に設定されていない状態で書き込み操作を試みた
- `allowWriteApprovalBypass` はプラグインの権限設定と併用する必要がある

## 開発のヒント

### シンプルに始める

1. まず `pass-through` プロバイダーと最小限の `applyResult` を使用して、ワークフローが正常に読み込まれることを確認する
2. 最初に `validateSelection` を追加し、必要な場合にのみ `preflight` または `buildRequest` を追加する
3. 最後に実際のバックエンドに接続する

### notifications.toast で素早いフィードバックを得る

```js
hostApi.notifications.toast({
  text: `buildRequest が ${selectionContext.items.parents.length} 件の親アイテムを受信しました`,
  type: "default",
});
```

これは、ログを確認せずに実行結果を確認できる素早いデバッグテクニックです。

### 公式ワークフローを参照する

公式ワークフローは最良の学習リファレンスです。公式パッケージをインストールした後、`<Zotero Data>/zotero-agents/content/official/workflows/` ディレクトリでソースコードを確認できます：

- `literature-workbench-package/literature-analysis/` — 完全な skillrunner.job.v1 の例
- `content/official/workflows/literature-workbench-package/export-notes/` — シンプルな pass-through の例
- `content/official/workflows/mineru/` — buildRequest + ファイル処理の例
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — インタラクティブモードの例

## 次のステップ

- [ワークフローマニフェスト完全リファレンス](manifest) — workflow.json のすべてのフィールド
- [Host API リファレンス](host-api) — フックで使用可能なすべての API
