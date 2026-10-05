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
2. **ツール → [バックエンドマネージャー](backend-manager)**を開く
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

**npx で起動** を有効にすると、コマンドが `npx <package>` 形式に切り替わり、Node.js と npm のインストールが必要である旨のメッセージが表示される。Codex、Claude Code、Factory Droid、Pi ACP、Amp ACP はデフォルトで npx が有効になっている。その他のプリセットはデフォルトでインストール済みコマンドを使用する。npx を有効にすると、Profile 表示名に `(npm)` サフィックスが追加される。

**npx で起動** を無効にすると、プリセットの名前付き実行ファイルが起動される。これはあらかじめインストールされている必要がある（例：`gemini`、`copilot`、`opencode`、`kimi`）。npx オプションを持たないプリセットは常にインストール済み CLI を使用する（Hermes、ネイティブ Cursor（`agent`）、Mistral Vibe、OpenHands、Goose、Junie、Kiro CLI、Oh My Pi）。Pi ACP と Amp ACP はアダプターであり、基盤となる Pi および Amp のエージェント CLI もインストールと認証が必要である。Oh My Pi は Bun ベースである。npx を有効にするには Node.js と npm が必要である。

**隔離環境** は隔離をサポートする Agent でのみ利用可能。有効にすると、プラグインはプレビューにドキュメント記載の隔離環境変数または session ディレクトリ引数を注入し、そのディレクトリ内で Agent の設定と認証を自分で管理する必要がある旨のメッセージを表示する。隔離を有効にすると、Profile 表示名に `(Isolated)` サフィックスが追加される。

![ACP プリセットダイアログ](/img/docs/backends/backend-manager_ACP-preset.png)

<!-- prettier-ignore -->
| プリセット | デフォルトコマンド | 説明 |
| --- | --- | --- |
| **OpenCode** | `opencode acp` | OpenCode ACP バックエンド。`OPENCODE_CONFIG_CONTENT` を注入して権限の質問を拒否し、`OPENCODE_CONFIG_DIR` による設定ディレクトリの隔離をサポート |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | OpenAI Codex 向け ACP adapter |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | Claude Code 向け ACP adapter |
| **Gemini CLI** | `gemini --acp` | Gemini CLI ACP モード |
| **Hermes** | `hermes acp` | Hermes Agent ACP バックエンド |
| **Qwen Code** | `qwen --acp` | Qwen Code ACP モード。`QWEN_HOME` による設定ディレクトリの隔離をサポート |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub Copilot CLI ACP モード。`COPILOT_HOME` による設定ディレクトリの隔離をサポート |
| **Qoder CLI** | `qoder --acp` | Qoder CLI ACP モード。`QODER_CONFIG_DIR` による文書化された設定ディレクトリの隔離をサポート |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor Agent ACP adapter。`--session-dir` による文書化されたセッションディレクトリの隔離をサポート |
| **DeepAgents** | `deepagents-acp` | DeepAgents ACP adapter |
| **Auggie** | `auggie --acp` | Auggie ACP モード |
| **Kilo** | `kilo acp` | Kilo Code ACP モード。`KILO_CONFIG_CONTENT` を注入して権限の質問を拒否し、設定・データ/session/auth/log・cache 状態の主要 XDG パスの隔離が確認されている |
| **Cline** | `cline --acp` | Cline ACP モード。`CLINE_DIR` による設定ディレクトリの隔離をサポート |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy ACP モード。`CODEBUDDY_CONFIG_DIR` による設定ディレクトリの隔離をサポート |
| **Grok** | `grok agent stdio` | Grok agent stdio モード。`GROK_HOME` による home/設定の隔離をサポート |
| **Cursor** | `agent acp` | Cursor Agent ACP adapter とは別個のネイティブ Cursor ACP エントリ。`CURSOR_CONFIG_DIR` による設定ディレクトリの隔離をサポート |
| **Kimi Code** | `kimi acp` | Kimi Code ACP モード。`KIMI_CODE_HOME` による設定ディレクトリの隔離をサポート |
| **MiniMax Code** | `mcode acp` | MiniMax Code ACP モード。npx を有効にすると `@minimax-ai/code` の `mcode` 実行ファイルを明示的に選択し、隔離には `MINIMAX_DATA_DIR` を使用 |
| **Mistral Vibe** | `vibe-acp` | Mistral Vibe ACP モード。`VIBE_HOME` による home/設定の隔離をサポート |
| **OpenHands** | `openhands acp` | OpenHands ACP モード。`OPENHANDS_PERSISTENCE_DIR` と `OPENHANDS_CONVERSATIONS_DIR` により永続化と会話ストレージを分離 |
| **DeepSeek Harness** | `dsh --profile acp` | DeepSeek Harness ACP モード。`DSH_HOME` による home/設定の隔離をサポート |
| **Factory Droid** | `npx -y droid@latest exec --output-format acp-daemon` | Factory Droid ACP デーモンモード。`DROID_DISABLE_AUTO_UPDATE` と `FACTORY_DROID_AUTO_UPDATE_ENABLED` により Droid の自動更新を無効化 |
| **Goose** | `goose acp` | Goose ACP モード。`GOOSE_PATH_ROOT` によるパスルートの隔離をサポート |
| **Junie** | `junie --acp=true` | Junie ACP モード。`JUNIE_HOME` による home/設定の隔離をサポート |
| **Kiro CLI** | `kiro-cli acp` | Kiro CLI ACP モード |
| **Pi ACP** | `npx -y pi-acp@latest` | Pi ACP adapter。Pi コーディングエージェント CLI が必要で、`PI_CODING_AGENT_DIR` による設定ディレクトリの隔離をサポート |
| **Amp ACP** | `npx -y amp-acp@latest` | Amp ACP adapter。Amp CLI が必要で、隔離は `AMP_ACP_STATE_DIR` により adapter の thread/session 状態のみを移す |
| **Oh My Pi** | `omp acp` | Oh My Pi ACP モード。Bun が必要で、インストール済みコマンドとしてのみ提供される |

OpenCode、Codex、Claude Code、Gemini CLI、Qwen Code、Hermes Agent のみがテスト済み。その他の ACP バックエンドの可用性は各バックエンドの実装に依存し、本プラグインでは保証しない。問題が発生した場合は、コマンド引数や環境変数を自行調整して試みること。ACP プロトコルおよび各バックエンドの公式ドキュメントを准拠とする。

プリセット選択後も、任意のフィールドを手動で修正できる。

## 環境変数の設定推奨

エージェントによっては環境変数やコマンド引数を通じた設定分離とセッション永続化をサポートしている。**隔離環境** を有効にしたプリセットは文書化された値を自動的に注入する。手動プロファイルの場合は、該当する値を自分で追加する。

隔離は宣言されたファイルシステムのルートのみを移す。Amp ACP の隔離は adapter の thread/session 状態のみを対象とし、Amp の設定と資格情報は独立して構成されたままになる。ネイティブ Cursor の隔離は Cursor の設定ディレクトリを対象とし、`cursor-agent-acp` adapter のセッションディレクトリとは別である。Copilot 自身のキャッシュと Goose のキーリングは注入されるパスの外にとどまる。

OpenCode と Kilo のプリセットは常にインライン権限設定も注入する。それぞれ `OPENCODE_CONFIG_CONTENT` と `KILO_CONFIG_CONTENT` で、値はいずれも `{"permission":{"question":"deny"}}` である。プリセットの追加後にこれらの値を編集または削除できる。

<!-- prettier-ignore -->
| 設定 | エージェント | 用途 |
| --- | --- | --- |
| `OPENCODE_CONFIG_DIR` | OpenCode | 独立した設定ディレクトリを指定 |
| `CODEX_HOME` | Codex | 独立した home/設定ディレクトリを指定 |
| `CLAUDE_CONFIG_DIR` | Claude Code | 独立した設定ディレクトリを指定 |
| `GEMINI_CLI_HOME` | Gemini CLI | 独立した設定ディレクトリを指定 |
| `HERMES_HOME` | Hermes Agent | 独立した home/設定ディレクトリを指定 |
| `QODER_CONFIG_DIR` | Qoder CLI | 独立した設定ディレクトリを指定 |
| `QWEN_HOME` | Qwen Code | 独立した home/設定ディレクトリを指定 |
| `COPILOT_HOME` | GitHub Copilot | 独立した設定ディレクトリを指定。Copilot 自身のキャッシュはこのパスの外にとどまる |
| `CLINE_DIR` | Cline | 独立した設定ディレクトリを指定 |
| `CODEBUDDY_CONFIG_DIR` | CodeBuddy | 独立した設定ディレクトリを指定 |
| `GROK_HOME` | Grok | 独立した home/設定ディレクトリを指定 |
| `CURSOR_CONFIG_DIR` | Cursor（ネイティブ ACP） | 独立した設定ディレクトリを指定 |
| `KIMI_CODE_HOME` | Kimi Code | 独立した home/設定ディレクトリを指定 |
| `MINIMAX_DATA_DIR` | MiniMax Code | 独立したデータディレクトリを指定 |
| `VIBE_HOME` | Mistral Vibe | 独立した home/設定ディレクトリを指定 |
| `OPENHANDS_PERSISTENCE_DIR`, `OPENHANDS_CONVERSATIONS_DIR` | OpenHands | 独立した永続化ルートとその会話ストレージ（`<root>/conversations`）を指定 |
| `DSH_HOME` | DeepSeek Harness | 独立した home/設定ディレクトリを指定 |
| `GOOSE_PATH_ROOT` | Goose | 独立したパスルートを指定。Goose のキーリングはこのパスの外にとどまる |
| `JUNIE_HOME` | Junie | 独立した home/設定ディレクトリを指定 |
| `PI_CODING_AGENT_DIR` | Pi ACP | Pi コーディングエージェントの独立した設定ディレクトリを指定 |
| `AMP_ACP_STATE_DIR` | Amp ACP | adapter の thread/session 状態のみを移す。Amp の設定と資格情報は独立して構成されたままになる |
| `--session-dir <path>` | Cursor Agent ACP | 独立したセッション永続化ディレクトリを指定 |
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | Kilo | 設定、データ/session/auth/log、キャッシュ状態の独立した XDG ルートを指定。これは確認済みの主要状態パスを対象とするが、すべての Kilo サブコマンドやプラグインがグローバルディレクトリを避けることを証明するものではない。 |

## 無料モデルオプション

一部のエンジンは **無料モデルアクセス** を提供しています — 支払いなしで始めるのに最適です：

| エンジン                  | 無料オプション        | 仕組み                                                                                                                                                                |
| ------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kilo Code**             | Auto Free モード      | Kilo Code の組み込み Auto Free モードは、各リクエストを適切な無料モデルに自動ルーティングします。Kilo Code の設定で有効化 — API キー不要                              |
| **OpenCode Zen**          | 組み込み無料モデル    | [OpenCode Zen](https://opencode.ai/zen) エディションは、API サブスクリプションなしで組み込みの無料モデルアクセスを提供します                                          |
| **OpenCode + OpenRouter** | OpenRouter 無料モデル | OpenCode から [OpenRouter](https://openrouter.ai/) を使用し、無料枠のモデル（Gemini 2.5 Flash、DeepSeek V3 など）を選択します。無料の OpenRouter アカウントが必要です |

### 無料枠の制限事項

無料モデルは日常的な利用には十分ですが、以下の制約に注意してください：

| 制限                 | 想定される影響                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **レート制限**       | プロバイダーの負荷に応じて毎分 5〜20 リクエストに制限される場合があります。バッチ処理は大幅に遅くなります                                   |
| **同時実行数**       | 通常は単一の同時リクエストに制限されます。複数のワークフローを同時に実行すると、キューイングまたは失敗する場合があります                    |
| **モデルの可用性**   | ピーク時には無料モデルプールが枯渇する場合があります。「モデル利用不可」または「容量超過」エラーが発生することがあります                    |
| **モデルの入れ替え** | プロバイダーは予告なく無料モデルを静かに切り替える（アップグレード/ダウングレード）場合があります。実行ごとに出力品質が変わることがあります |
| **SLA / 信頼性なし** | 無料枠には稼働保証がありません。サービスが一時的に利用できなくなったり、提供終了する可能性があります                                        |

> 信頼性の高いバッチ処理や本番利用には、[OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW)（$10/月）や Coding Plan（Bailian、Zhipu など）の有料プランを検討してください。論文一本あたりのコストは節約できる時間に比べれば取るに足りません。

## リクエストタイプ

ACPバックエンドは2種類のリクエストタイプをサポートする。

- `acp.prompt.v1` — 対話型インタラクション（ACPチャット）
- `acp.skill.run.v1` — スキル実行（ACP Skills）

同じACPバックエンドで、対話とスキル実行の両方を同時に使用できる。

## セッション管理

- 各バックエンドは複数のセッション（対話）を持て、プラグインデータベースに永続的に保存される
- 異なるACPバックエンドは同時に実行でき、互いに干渉しない
- セッションは[ACPチャット](../sidebar/acp-chat)で管理可能

## 次のステップ

設定完了後、以下が可能である。

- [サイドバーACPチャット](../sidebar/acp-chat)でバックエンドと対話
- [ダッシュボード](../dashboard)でACPスキル実行を表示
- [Workflowリスト](../workflows/)でACPバックエンドを使用してタスクを実行
