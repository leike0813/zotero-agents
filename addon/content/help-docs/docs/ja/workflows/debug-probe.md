# Debug Probe

## 目的

デバッグプローブパッケージは、主にWorkflowシステムの開発テストと問題診断に使用されます。`applyResult`コントラクト、Sequence Orchestration、インタラクティブ実行、Host Bridge接続シナリオをカバーする複数のデバッグ専用Workflowを含みます。

すべてのデバッグWorkflowは`debug_only: true`でマークされており、デバッグモードでのみ表示されます。

## 含まれるデバッグWorkflow

### Applyコントラクトデバッグ

`buildRequest` / `applyResult`フックのさまざまな呼び出し組み合わせを検証:

| Workflow | 説明 |
|---------|------|
| Debug: Apply Single Result | 単一ジョブ + 結果取得方式 |
| Debug: Apply Single Bundle | 単一ジョブ + バンドル取得方式 |
| Debug: Apply Sequence Result | 多段階シーケンス + 結果取得 |
| Debug: Apply Sequence Bundle | 多段階シーケンス + バンドル取得 |
| Debug: Apply Bundle Then Result | バンドルの後に結果の組み合わせ呼び出し |
| Debug: Apply Result Then Bundle | 結果の後にバンドルの組み合わせ呼び出し |

### Sequenceデバッグ

Sequence Orchestrationの多段階調整機構を検証:

| Workflow | 説明 |
|---------|------|
| Debug Sequence Linear Probe | 直列実行とデフォルトの中継ハンドオフ（pass_through）を検証 |
| Debug Sequence Workspace Reuse Probe | クロスステップのワークスペース再利用（workspace: reuse-workflow）を検証 |
| Debug Sequence Context Isolation Probe | 明示的な中継フィルタリングと分離ワークスペース（workspace: new + handoff selective mapping）を検証 |

### インタラクティブデバッグ

ユーザーの返信を必要とするインタラクティブWorkflowを検証:

| Workflow | 説明 |
|---------|------|
| Debug: Interactive Choice Probe | インタラクティブチョイスフローを検証 |
| Debug: Interactive Then Result | インタラクティブ実行の後に結果取得 |

### Host Bridgeデバッグ

| Workflow | 説明 |
|---------|------|
| Debug: Host Bridge ConnectivityProbe | Host Bridgeの接続性と権限を検証 |

### 一般

| Workflow | 説明 |
|---------|------|
| Workflow Debug Probe | Workflowの実行前状態をチェックし、診断パネルを開く |

## 使用タイミング

- Workflowシステムを開発または修正した後の動作検証
- Workflow実行の異常問題のトラブルシューティング
- Sequence Orchestrationの中継機構の検証
- `applyResult`フックコントラクトが期待通りであるかの検証
- Host Bridgeの接続性と権限設定の検証

## 依存関係

- **バックエンド**: Skill-Runnerサービス
- すべて`debug_only`でマークされており、デバッグモードでのみ表示される

## 次のステップ

- [デバッグとテスト](#doc/workflows%2Fcustom%2Fdebugging) — カスタムWorkflowのデバッグ手法
- [フックシステム](#doc/workflows%2Fcustom%2Fhooks) — フックAPIのシグネチャと使用方法
