# Host Bridge

## 概要

Host Bridgeはプラグインの組み込みHTTPサーバーであり、外部AIツール（Codex、Claude Code、OpenCodeなど）がZoteroライブラリに直接アクセスできるようにする。ACPエージェントとZoteroの間の通信ブリッジであり、`zotero-bridge` CLIとMCPサーバーの両方の基盤となるトランスポートである。

## アーキテクチャ

```
Zoteroプラグインプロセス
│
├── Host Bridge HTTPサーバー（ループバック: 127.0.0.1:<port>）
│     ├── Bearer Token認証（全リクエスト）
│     ├── 書き込み承認ゲート（オペレーションごと）
│     └── ケイパビリティルーター（60以上のケイパビリティ）
│
└── zotero-bridge CLI（コンパニオンバイナリ）
      ├── セマンティックコマンド（context、library、mutation、synthesis）
      ├── 設定ファイル（bridge-profile.json）
      └── Stdin/pipeモード（ACPエージェント統合用）
```

プロトコルバージョン：`host-bridge.v2`。`GET /bridge/v1/health`以外のすべてのエンドポイントにはBearer Token認証が必要である。ケイパビリティコントラクトは`host-bridge.capabilities.v2`を使用する。

## 設定

Zotero → 設定 → Zotero Agents → Host Bridge

| 設定 | タイプ | デフォルト | 説明 |
|---------|------|---------|-------------|
| **MCPサーバーを有効にする** | ブール値 | `true` | サードパーティアгент用にMCPプロトコルも有効化 |
| **書き込み承認を無効にする** | ブール値 | `false` | 危険：すべての書き込み承認をバイパス。赤い危険ゾーンとして表示 |
| **LANアクセスを有効にする** | ブール値 | `false` | `0.0.0.0`にバインドしてLANアクセスを許可（固定ポートを強制） |
| **固定ポート** | ブール値 | `false` | ランダムポートではなくポートを固定（デフォルト26570） |
| **ポート番号** | 数値 | `26570` | 固定モードで使用するポート（1024-65535） |
| **LAN IP** | 文字列 | `""` | 通知するLAN IPの手動オーバーライド。空欄で自動検出 |
| **スタート / エンドポイントを表示** | ボタン | — | サーバーが稼働中であることを確認し、現在のエンドポイントURLを表示 |
| **トークンをローテーション** | ボタン | — | セッショントークンをローテーション |
| **マスタートークンを作成 / ローテーション** | ボタン | — | 永続的なクロスセッショントークンを生成 |
| **マスタートークンをコピー** | ボタン | — | トークンをクリップボードにコピー |
| **リモートCLIプロファイルをコピー** | ボタン | — | リモートCLIプロファイルの完全なJSONをコピー |
| **CLIをインストール** | ボタン | — | `zotero-bridge`をシステムのPATHにワンクリックでインストール |

## セキュリティモデル

### Bearer Token認証

- すべてのリクエストに`Authorization: Bearer <token>`ヘッダを含める必要がある
- **セッショントークン**: プラグイン起動時に自動生成（24バイトbase64）。プラグインセッション中に有効
- **マスタートークン**: オプションの永続トークン。AES-256-GCM暗号化ストレージ。クロスセッションCLIアクセス用
- トークンはプロンプト、ログ、エージェント出力に書き込まれることはない

### 書き込み承認

書き込みオペレーションにはZotero UIでの承認が必要である。

| レベル | 説明 |
|-------|-------------|
| **承認が必要** | `mutation.execute`、`workflow submit`、`debug.zotero.eval`、`citation_graph.refresh_metrics` |
| **自動承認** | すべての読み取り専用オペレーション、`diagnostic.get_status`、`mutation.preview` |

**二重ゲートの自動承認：**
1. Workflowマニフェストが`allowWriteApprovalBypass: true`を宣言
2. ユーザーが送信ダイアログで自動承認を明示的にチェック

両方が満たされた場合にのみ自動承認が有効になる。

### LAN / リモートのセキュリティ

- LANモードは`0.0.0.0`にバインドし、手動で有効化する必要がある。**信頼されたネットワークでのみ使用**
- リモートアクセスにはマスタートークン（手動作成）が必要。自動配布されることはない
- LAN IPの自動検出はSkillRunnerバックエンドのネットワークリフレクションを使用。手動でオーバーライド可能

## `zotero-bridge` CLI

`zotero-bridge`はRust製のCLIツールで、ACPエージェントやターミナルユーザーがHost Bridgeを呼び出すために使用される。

### インストール

環境設定の「CLIをインストール」ボタンを使用する。ACP実行ではプラグインにバンドルされたバイナリが使用される（ワークスペースPATHに注入される）。

### エンドポイント / トークンの解決優先度

| ソース | エンドポイント | トークン |
|--------|----------|-------|
| CLIフラグ | `--endpoint` | — |
| 環境変数 | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| プロファイルファイル | `endpoint`フィールド | `auth.token` / `auth.tokenEnv` |

### セマンティックコマンド

<details>
<summary>全125の標準コマンド</summary>

#### surface — エージェントサーフェス
```
zotero-bridge surface identity --json
zotero-bridge surface describe <command...> --json
zotero-bridge surface search --intent <text>
```

#### bridge — サーバーステータス＆プロファイル
```
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status
zotero-bridge call <capability> [--input <json>]
```

#### library — ライブラリの読み取り
```
zotero-bridge library items list [--cursor <c>]
zotero-bridge library item search --query <text>
zotero-bridge library item get --key <key>
zotero-bridge library item notes --key <key>
zotero-bridge library item attachments --key <key>
zotero-bridge library note get --key <key>
zotero-bridge library note payloads --key <key>
zotero-bridge library note payload --key <key> --payload-id <id>
zotero-bridge library annotation list --key <key>
zotero-bridge library annotation export --key <key> --format json|markdown
zotero-bridge library snapshot --input <json>
zotero-bridge library readiness audit --input <json>
zotero-bridge library readiness missing-pdf --input <json>
zotero-bridge library readiness missing-markdown --input <json>
zotero-bridge library readiness missing-analysis --input <json>
```

#### context — UIコンテキスト＆ナビゲーション
```
zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open
zotero-bridge context item open --key <key>
zotero-bridge context note open --key <key>
zotero-bridge context collection open --key <key>
```

#### synthesis — Synthesisレイヤー
```
zotero-bridge synthesis topic list --input <json>
zotero-bridge synthesis topic find-by-paper-ref --input <json>
zotero-bridge synthesis topic get-context --input <json>
zotero-bridge synthesis topic get-report --input <json>
zotero-bridge synthesis topic get-review-input --input <json>
zotero-bridge synthesis schema get
zotero-bridge synthesis concept query --input <json>
zotero-bridge synthesis graph overview --input <json>
zotero-bridge synthesis graph query-cluster --input <json>
zotero-bridge synthesis graph get-slice --input <json>
zotero-bridge synthesis graph get-layout --input <json>
zotero-bridge synthesis graph get-metrics --input <json>
zotero-bridge synthesis graph rank-external-references --input <json>
zotero-bridge synthesis graph rank-library-papers --input <json>
zotero-bridge synthesis graph refresh-metrics --input <json>
zotero-bridge synthesis graph update --input <json>
zotero-bridge synthesis index status
zotero-bridge synthesis index library get --input <json>
zotero-bridge synthesis index reference get --input <json>
zotero-bridge synthesis cache status
zotero-bridge synthesis cache refresh-reference-sidecar --input <json>
zotero-bridge synthesis cache invalidate --input <json>
zotero-bridge synthesis resolver resolve --input <json>
zotero-bridge synthesis artifact manifest --input <json>
zotero-bridge synthesis artifact read --input <json>
zotero-bridge synthesis artifact export-filtered --input <json>
zotero-bridge synthesis artifact resolve-topic-digest --input <json>
zotero-bridge synthesis insight attention-queue
```

#### mutation — 書き込みオペレーション
```
zotero-bridge mutation preview --input <json>
zotero-bridge mutation apply --input <json>
zotero-bridge mutation literature-ingest --input <json>
zotero-bridge mutation tag add --input <json>
zotero-bridge mutation tag remove --input <json>
zotero-bridge mutation collection create --input <json>
zotero-bridge mutation collection add-items --input <json>
zotero-bridge mutation collection remove-items --input <json>
zotero-bridge mutation item update --input <json>
zotero-bridge mutation item attach-file --input <json>
zotero-bridge mutation note create --input <json>
zotero-bridge mutation note update --input <json>
zotero-bridge mutation note upsert-payload --input <json>
```

#### workflow — Workflow管理
```
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> (--input <json> | --none)
zotero-bridge workflow queue list [--workflow <id>]
zotero-bridge workflow queue cancel --submission-id <id>
zotero-bridge workflow submission get --submission-id <id>
zotero-bridge workflow describe --workflow <id> [--json]
zotero-bridge workflow validate --input <json>
zotero-bridge workflow requirements --workflow <id> --input <json>
zotero-bridge workflow profile list
zotero-bridge workflow profile describe --profile <id>
zotero-bridge workflow profile validate --profile <id>
zotero-bridge workflow agent-run --workflow <id> (--input <json> | --none) --output-dir <dir>
zotero-bridge workflow agent-bundle inspect --path <path>
zotero-bridge workflow agent-result validate --input <json>
zotero-bridge workflow agent-apply --run-id <id> --input <json>
zotero-bridge workflow agent-apply-status --run-id <id>
zotero-bridge workflow agent-renew --run-id <id>
zotero-bridge workflow agent-abandon --run-id <id>
```

#### run — ランタイム観測
```
zotero-bridge run get --run-id <id>
zotero-bridge run cancel --run-id <id>
zotero-bridge run list [--workflow <id>]
zotero-bridge run active
zotero-bridge run recent
zotero-bridge run workflow recent
zotero-bridge run skill get --run-id <id>
zotero-bridge run skill reply --run-id <id> --input <json>
zotero-bridge run skill connect --run-id <id>
zotero-bridge run skill recent
zotero-bridge run skill events --run-id <id>
zotero-bridge run notification list [--limit <n>]
zotero-bridge run notification wait [--timeout-ms <ms>]
zotero-bridge run notification ack --notification-id <id>
zotero-bridge run permission pending
zotero-bridge run permission get --request-id <id>
```

#### file — ファイル転送
```
zotero-bridge file download <fileId> --output <path>
zotero-bridge file upload --path <path>
```

#### product — ダッシュボードプロダクト
```
zotero-bridge product list [--limit <n>]
zotero-bridge product get --product-id <id>
zotero-bridge product download --product-id <id> --output <path>
zotero-bridge product remove --product-id <id>
```

#### operation — 永続オペレーション
```
zotero-bridge operation get --operation-id <id>
```

</details>

入力は以下を受け付ける：インラインJSON、JSONファイルパス、`@file`構文、`-`（stdin）。

完全で最新のコマンドカタログについては、`zotero-bridge surface identity --json`を実行して現在の`commandCatalogChecksum`を確認し、`zotero-bridge surface describe <command...>`で特定のコマンドのコントラクトを参照されたい。

### 出力契約

stdoutは常に正確に1つのJSONオブジェクトを出力する。

```json
{ "ok": true, "data": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
{ "ok": false, "error": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
```

エラー終了コード：

| カテゴリ | 終了コード |
|----------|----------:|
| usage | 2 |
| config | 3 |
| connection | 4 |
| auth | 5 |
| permission | 6 |
| validation | 7 |
| capability | 8 |
| workflow | 9 |
| download | 10 |
| protocol | 11 |
| internal | 70 |

### プロファイルファイル

既知のプロファイルファイルの場所：

| OS | パス |
|----|------|
| Windows | `%LOCALAPPDATA%\zotero-agents\bridge-profile.json` |
| macOS | `~/Library/Application Support/zotero-agents/bridge-profile.json` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/zotero-agents/bridge-profile.json` |

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v2",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": { "type": "bearer", "tokenEnv": "ZOTERO_BRIDGE_TOKEN" }
}
```

## ACPエージェント統合

ACPエージェントがスキルを実行する際、プラグインは自動的に以下を注入する。

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # CLIシム
  profile.json                # 接続プロファイル（トークンは環境変数で）
  README.md                   # 使用法のヒント
```

注入される環境変数：

- `ZOTERO_BRIDGE_PROFILE` — profile.jsonへのパス
- `ZOTERO_BRIDGE_TOKEN` — Bearerトークン
- `ZOTERO_BRIDGE_SCOPE` — 承認スコープのJSON
- `PATH` / `Path` — `.zotero-bridge/bin`が先頭に追加される

## 利用可能なケイパビリティ

<details>
<summary>全60以上のケイパビリティ</summary>

### Context

| ケイパビリティ | 説明 |
|-----------|-------------|
| `context.get_current_view` | 現在のZoteroビュー情報 |
| `context.get_selected_items` | 現在選択されているアイテム |

### Library

| ケイパビリティ | 説明 |
|-----------|-------------|
| `library.search_items` | アイテムを検索 |
| `library.get_item_detail` | アイテムの詳細を取得 |
| `library.list_items` | ページネーション付きアイテム一覧 |
| `library.sync_snapshot` | Paginated metadata snapshot for local indexing |
| `library.get_item_notes` | ノートを一覧 |
| `library.get_note_detail` | ノートの内容を読む |
| `library.list_note_payloads` | ノートのペイロードを一覧 |
| `library.get_note_payload` | 特定のペイロードを取得 |
| `library.get_item_attachments` | 添付ファイルを一覧 |
| `library.list_annotations` | リーダーアノテーションを一覧 |
| `library.export_annotations` | リーダーアノテーションをmarkdownまたはJSONとしてエクスポート |
| `library.readiness_audit` | ページネーション付き読み取り専用ライブラリ準備状態監査 |

### Mutation

| ケイパビリティ | 説明 |
|-----------|-------------|
| `mutation.preview` | 書き込みオペレーションをプレビュー（実行しない） |
| `mutation.execute` | 書き込みオペレーションを実行（承認が必要） |

### Workflow Products

| ケイパビリティ | 説明 |
|-----------|-------------|
| `workflow_products.list` | Workflow生成プロダクトを一覧 |
| `workflow_products.get` | Workflowプロダクトを取得 |

### Synthesis — Topics

| ケイパビリティ | 説明 |
|-----------|-------------|
| `topics.list` | すべてのトピックを一覧 |
| `topics.get_context` | トピックのコンテキストを取得 |
| `topics.get_report` | トピックのレポートを取得 |
| `topics.get_review_input` | トピックレビューパッケージを組立て |

### Synthesis — Citation Graph

| ケイパビリティ | 説明 |
|-----------|-------------|
| `citation_graph.query_cluster` | 引用クラスタをクエリ |
| `citation_graph.get_overview` | グラフの概要を取得 |
| `citation_graph.get_slice` | サブグラフスライスを抽出 |
| `citation_graph.get_metrics` | グラフメトリクスを計算 |
| `citation_graph.rank_external_references` | 外部参考文献をランキング |
| `citation_graph.rank_library_papers` | ライブラリ論文をランキング |
| `citation_graph.refresh_metrics` | 診断：永続化されたメトリクスをリフレッシュ |
| `citation_graph.update` | アトミックな引用グラフ更新を開始 |

### Synthesis — Concepts, Schemas, Resolvers

| ケイパビリティ | 説明 |
|-----------|-------------|
| `concepts.query` | 概念ナレッジベースをクエリ |
| `schemas.get` | スキーマ定義を取得 |
| `resolvers.resolve` | 参考文献/トピックリゾルバを解決 |

### Synthesis — Paper Artifacts

| ケイパビリティ | 説明 |
|-----------|-------------|
| `paper_artifacts.get_manifest` | アーティファクトのマニフェストを取得 |
| `paper_artifacts.read` | アーティファクトの内容を読む |
| `paper_artifacts.export_filtered` | フィルタ済みアーティファクトをエクスポート |
| `paper_artifacts.resolve_topic_digest` | トピックダイジェストを解決 |

### Synthesis — Indexes & Insights

| ケイパビリティ | 説明 |
|-----------|-------------|
| `reference_index.get` | 参考文献インデックスを取得 |
| `reference_sidecar.refresh` | 参考文献サイドカーのリフレッシュを開始 |
| `library_index.get` | ライブラリインデックスを取得 |
| `insights.get_attention_queue` | アテンションキューを取得 |
| `synthesis.operation.get` | 永続的なsynthesisオペレーションレシートを読み取る |

### Diagnostic

| ケイパビリティ | 説明 |
|-----------|-------------|
| `diagnostic.get_status` | サービスステータスを取得 |

### Debug（デバッグモードのみ）

| ケイパビリティ | 説明 |
|-----------|-------------|
| `debug.status` | デバッグ用Host Bridgeステータススナップショット |
| `debug.persistence.snapshot` | ランタイム永続化のスナップショット |
| `debug.tasks.snapshot` | WorkflowタスクとACP実行の診断 |
| `debug.zotero.eval` | Zoteroコンテキストで承認されたJavaScriptを実行 |
| `debug.acpSkillRun.reapplyResult` | ACPスキル実行のapplyResultを再実行 |
| `debug.skillrunner.connections.snapshot` | SkillRunner接続ガバナーの診断 |
| `debug.synthesis.snapshot` | Synthesisオペレーションとキャッシュのスナップショット |
| `debug.synthesis.diff` | Zoteroペイロードとリポジトリキャッシュを比較 |
| `debug.synthesis.cache.list` | Synthesisサイドカーキャッシュ行を一覧 |
| `debug.synthesis.operations.list` | Synthesisオペレーションを一覧 |
| `debug.synthesis.paper.inspect` | キャッシュ間で1つの論文を検査 |
| `debug.synthesis.topic.inspect` | アーティファクト間で1つのトピックを検査 |
| `debug.synthesis.profiler.list` | Synthesisプロファイラー実行 |
| `debug.synthesis.cleanInstallReset` | 危険：synthesis DB状態をリセット |

</details>

## 書き込み承認フロー

```
エージェントが書き込みケイパビリティを呼び出す
  │
  ├── 1. リクエストがHost Bridgeに到着（Bearer Token付き）
  ├── 2. トークンを検証
  ├── 3. スコープを抽出
  ├── 4. 承認チェック：
  │     ├── 読み取り専用スコープ → 即座に実行
  │     ├── autoApproveWrites = true かつユーザーが事前承認 → 実行
  │     └── 承認が必要 → Zotero UIにキュー
  ├── 5. ACPチャット / SkillRunnerパネルに承認プロンプトを表示
  │     ├── ユーザーが承認 → 実行
  │     └── ユーザーが拒否 → エラーを返す
  └── 6. 結果を返し、監査ログを書き込む
```

スコープのルーティング：

| スコープ | 承認UI |
|-------|-------------|
| `acp-skill-run` | ACP Skills UI |
| `acp-chat` | ACPチャットパネル |
| `skillrunner-run` | SkillRunnerパネル |
| スコープなし / `global` | グローバルZotero承認UI |

## LAN / リモートアクセス

1. 環境設定で**LANアクセスを有効にする**をチェック
2. ポートを固定するか、現在のポートを確認
3. **マスタートークン**を作成 / コピー
4. **リモートCLIプロファイルをコピー**をクリックして完全な接続設定を取得
5. リモートマシンで`endpoint`（`http://<LAN_IP>:<port>/bridge/v1`）とトークンを設定
6. テスト：`zotero-bridge status --endpoint http://<LAN_IP>:<port>/bridge/v1`

**重要：** LANモードはループバック保護をバイパスする。信頼されたローカルネットワークでのみ使用されたい。

## 次のステップ

- [MCPサーバー](mcp-server) — MCP対応クライアント（Claude Desktopなど）のための標準化されたプロトコルインターフェース
- [Hermes Profiles](hermes-profiles) — AIエージェントでZoteroライブラリを管理するためのすぐにインストール可能なプロファイル
- [環境設定](../preferences) — Host Bridgeの全設定を表示
- [ACPバックエンド](acp) — ACPエージェントの設定について学ぶ
