# ACPバックエンド設定

## ACPとは

ACP（Agent Client Protocol）はエージェントバックエンドと通信するためのプロトコルである。Zotero AgentsはACPプロトコルを介してローカルで動作するエージェントプロセス（Codex、Claude Code、OpenCodeなど）と通信し、対話とスキル実行を実現する。

ACPバックエンドは**推奨**の設定方法である。マシンにACP対応のエージェントツールがインストールされていれば、追加の設定ゼロで直接使用できる。

## Agentが初めての方へ

Agentツールを初めて使用する方で、どれを選べばよいか、どのようにインストールすればよいかわからない場合は、以下のガイドをご参照ください：

**[Agent利用ガイド](https://agent.ps5.online)**

## なぜACPが優先か

- **設定負担ゼロ**: 追加のサービスをデプロイする必要がなく、マシンにすでにあるエージェントツールを使用
- **自動プロセス管理**: プラグインが設定で起動コマンドを指定し、エージェントプロセスのライフサイクルを自動的に管理
- **マルチエージェント対応**: 複数の異なるエージェントバックエンドを同時に設定し、必要に応じて切り替え可能
- **設定の分離**: エージェントによっては（OpenCodeやCodexなど）、環境変数を通じて設定ディレクトリとセッション永続化ディレクトリを分離可能

## 設定手順

1. マシンにACP対応のエージェントCLIツールが少なくとも1つインストールされていることを確認
2. **ツール → [バックエンドマネージャー](#doc/backends%2Fbackend-manager)**を開く
3. **ACP**タブに切り替える
4. **プリセットから追加**ドロップダウンからエージェントツールを選択、または**ACPを追加**をクリックして手動で設定
5. 以下のフィールドに入力：
   - **表示名**: わかりやすい名前（例：「My OpenCode」）
   - **コマンド**: ACPバックエンドを起動するコマンド（プリセットが自動入力するが、手動で修正も可能）
   - **引数**: コマンドの追加引数（省略可）
   - **環境変数**: 追加の環境変数（省略可。設定の分離などに使用）
6. 右下の**保存**をクリック

### 接続検証

保存後、プラグインはバックエンドの機能を自動的に検出する。

- コマンドの存在を確認
- 接続と初期化を実行
- 利用可能なモデルとモードを取得
- 以降の変更を検出するための設定フィンガープリントを計算

検出に失敗した場合は、エージェントCLIが正しくインストールされ、コマンド形式が正しいことを確認されたい。

## サポートされているエージェントプリセット

プラグインはいくつかの組み込みプリセットを提供する。**プリセットから追加**をクリックすると、左側で Agent を選択し、右側に起動オプションと読み取り専用設定プレビューが表示される。

**npx で起動** を有効にすると、コマンドが `npx <package>` 形式に切り替わり、Node.js と npm のインストールが必要である旨のメッセージが表示される。Codex と Claude Code は ACP adapter に依存しているため、デフォルトで npx が有効になっている。その他の Agent はデフォルトで生のコマンドを使用する。npx を有効にすると、Profile 表示名に `(npm)` サフィックスが追加される。

**隔離環境** は隔離をサポートする Agent でのみ利用可能。有効にすると、プラグインはプレビューにドキュメント記載の隔離環境変数または session ディレクトリ引数を注入し、そのディレクトリ内で Agent の設定と認証を自分で管理する必要がある旨のメッセージを表示する。隔離を有効にすると、Profile 表示名に `(Isolated)` サフィックスが追加される。

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP-preset.webp" alt="ACP プリセットダイアログ" title="ACP プリセットダイアログ" loading="lazy" /><figcaption>ACP プリセットダイアログ</figcaption></figure>

| プリセット | デフォルトコマンド | 説明 |
|------|------|------|
| **OpenCode** | `opencode acp` | OpenCode ACP バックエンド。`OPENCODE_CONFIG_DIR` による設定ディレクトリの隔離をサポート |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | OpenAI Codex 向け ACP adapter |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | Claude Code 向け ACP adapter |
| **Gemini CLI** | `gemini --experimental-acp` | Gemini CLI ACP モード |
| **Hermes** | `hermes acp` | Hermes Agent ACP バックエンド |
| **Qwen Code** | `qwen --acp --experimental-skills` | Qwen Code ACP モード |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub Copilot CLI ACP モード |
| **Qoder CLI** | `qodercli --acp` | Qoder CLI ACP モード。`QODER_CONFIG_DIR` による設定ディレクトリの隔離をサポート |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor Agent ACP adapter。`--session-dir` によるセッションディレクトリの隔離をサポート |
| **DeepAgents** | `deepagents-acp` | DeepAgents ACP adapter |
| **Auggie** | `auggie --acp` | Auggie ACP モード |
| **Kilo** | `kilo acp` | Kilo Code ACP モード |
| **Cline** | `cline --acp` | Cline ACP モード |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy ACP モード |
| **Grok** | `grok agent stdio` | Grok agent stdio モード |

OpenCode、Codex、Claude Code、Gemini CLI、Qwen Code、Hermes Agent のみがテスト済み。その他の ACP バックエンドの可用性は各バックエンドの実装に依存し、本プラグインでは保証しない。問題が発生した場合は、コマンド引数や環境変数を自行調整して試みること。ACP プロトコルおよび各バックエンドの公式ドキュメントを准拠とする。

プリセット選択後も、任意のフィールドを手動で修正できる。

## 環境変数の設定推奨

エージェントによっては環境変数を通じた設定分離とセッション永続化をサポートしている。環境変数エディタで追加するだけでよい。

| 環境変数 | エージェント | 用途 |
|---------------------|-------|---------|
| `OPENCODE_CONFIG` | OpenCode | 独立した設定ディレクトリを指定 |
| `OPENCODE_SESSION_DIR` | OpenCode | セッション永続化ディレクトリを指定 |
| `CODEX_CONFIG_DIR` | Codex | 独立した設定ディレクトリを指定 |

## 無料モデルオプション

一部のエンジンは **無料モデルアクセス** を提供しています — 支払いなしで始めるのに最適です：

| エンジン | 無料オプション | 仕組み |
|--------|------------|--------------|
| **Kilo Code** | Auto Free モード | Kilo Code の組み込み Auto Free モードは、各リクエストを適切な無料モデルに自動ルーティングします。Kilo Code の設定で有効化 — API キー不要 |
| **OpenCode Zen** | 組み込み無料モデル | [OpenCode Zen](https://opencode.ai/zen) エディションは、API サブスクリプションなしで組み込みの無料モデルアクセスを提供します |
| **OpenCode + OpenRouter** | OpenRouter 無料モデル | OpenCode から [OpenRouter](https://openrouter.ai/) を使用し、無料枠のモデル（Gemini 2.5 Flash、DeepSeek V3 など）を選択します。無料の OpenRouter アカウントが必要です |

### 無料枠の制限事項

無料モデルは日常的な利用には十分ですが、以下の制約に注意してください：

| 制限 | 想定される影響 |
|------|--------------|
| **レート制限** | プロバイダーの負荷に応じて毎分 5〜20 リクエストに制限される場合があります。バッチ処理は大幅に遅くなります |
| **同時実行数** | 通常は単一の同時リクエストに制限されます。複数のワークフローを同時に実行すると、キューイングまたは失敗する場合があります |
| **モデルの可用性** | ピーク時には無料モデルプールが枯渇する場合があります。「モデル利用不可」または「容量超過」エラーが発生することがあります |
| **モデルの入れ替え** | プロバイダーは予告なく無料モデルを静かに切り替える（アップグレード/ダウングレード）場合があります。実行ごとに出力品質が変わることがあります |
| **SLA / 信頼性なし** | 無料枠には稼働保証がありません。サービスが一時的に利用できなくなったり、提供終了する可能性があります |

> 信頼性の高いバッチ処理や本番利用には、[OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW)（$10/月）や Coding Plan（Bailian、Zhipu など）の有料プランを検討してください。論文一本あたりのコストは節約できる時間に比べれば取るに足りません。

## リクエストタイプ

ACPバックエンドは2種類のリクエストタイプをサポートする。

- `acp.prompt.v1` — 対話型インタラクション（ACPチャット）
- `acp.skill.run.v1` — スキル実行（ACP Skills）

同じACPバックエンドで、対話とスキル実行の両方を同時に使用できる。

## セッション管理

- 各バックエンドは複数のセッション（対話）を持て、プラグインデータベースに永続的に保存される
- 異なるACPバックエンドは同時に実行でき、互いに干渉しない
- セッションは[ACPチャット](#doc/sidebar%2Facp-chat)で管理可能

## 次のステップ

設定完了後、以下が可能である。

- [サイドバーACPチャット](#doc/sidebar%2Facp-chat)でバックエンドと対話
- [ダッシュボード](#doc/dashboard)でACPスキル実行を表示
- [Workflowリスト](#doc/workflows%2Findex)でACPバックエンドを使用してタスクを実行
