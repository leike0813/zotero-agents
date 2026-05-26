<p align="center">
  <img src="addon/content/icons/icon_full.png" alt="Zotero Skills" width="128" />
</p>

<h1 align="center">Zotero Skills</h1>

<p align="center">
  <strong>Zotero 7 向けプラガブルワークフローエンジン — 文献ライブラリを AI 駆動の研究ハブに。</strong>
</p>

<p align="center">
  <a href="https://github.com/leike0813/Zotero-Skills/releases"><img src="https://img.shields.io/github/v/release/leike0813/Zotero-Skills?style=flat-square&color=blue" alt="Release" /></a>
  <a href="https://github.com/leike0813/Zotero-Skills/blob/main/LICENSE"><img src="https://img.shields.io/github/license/leike0813/Zotero-Skills?style=flat-square" alt="License" /></a>
  <a href="https://www.zotero.org/"><img src="https://img.shields.io/badge/Zotero-7-CC2936?style=flat-square&logo=zotero&logoColor=white" alt="Zotero 7" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README-zhCN.md">简体中文</a> ·
  <a href="README-frFR.md">Français</a> ·
  日本語
</p>

---

## ✨ Zotero Skills とは？

Zotero Skills は Zotero 7 向けの**フレームワーク型プラグイン**です。AI や自動化ワークフローのための汎用実行シェルを提供します：

- 📦 **プラガブルワークフロー** — ビジネスロジックは外部ワークフローパッケージに配置され、コアプラグインには含まれません。
- 🔌 **マルチバックエンド対応** — [Skill-Runner](https://github.com/leike0813/Skill-Runner)、汎用 HTTP API、ローカルパススルーロジックにタスクをルーティングできます。
- ⚡ **統一実行** — 選択コンテキスト構築、リクエスト生成、ジョブキュー、結果適用、エラー処理はすべて共有ランタイムが統一的に処理します。

> **Zotero 内のワークフローエンジン**と考えてください — 宣言的マニフェストとフックスクリプトで「何をするか」を定義し、プラグインが「どう実行するか」を処理します。

## 🚀 主要機能

| 機能                         | 説明                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| **ワークフローエンジン**     | 宣言的 `workflow.json` マニフェスト + オプションフック（`filterInputs`、`buildRequest`、`applyResult`） |
| **プロバイダーレジストリ**   | 3 つの組み込みプロバイダー：`skillrunner`、`generic-http`、`pass-through`                               |
| **バックエンドマネージャー** | プロバイダータイプごとに複数のバックエンドプロファイルを GUI で管理                                     |
| **タスクダッシュボード**     | リアルタイムジョブ監視、SkillRunner チャット対話、ランタイムログ                                        |
| **ワークフロー設定**         | ワークフローごとの永続化パラメータと一回限りのオーバーライド                                            |
| **ノートエディター**         | 構造化データ編集用のホストベースレンダラー（例：参考文献ノート）                                        |
| **ログビューアー**           | フィルタリング可能なランタイムログ、診断用 NDJSON エクスポート                                          |

## ✨ なぜ Zotero Skills なのか？

### 従量課金ではなく、サブスクリプションと Coding Plan を使おう

文献分析タスクは **Token 燃烧器** です — 論文要約、参考文献抽出、引用分析、インタラクティブ Q&A、どれをとっても大量のトークンを消費します。従量課金の API 呼び出しはすぐに高額になります。

このプラグインを使えば、既存の **Coding Plan** や **サブスクリプション枠**（OpenAI、Google、Alibaba 百錬、智譜など）をそのまま AI ワークフローに活用できます。中間マージンなし、凭证は直接バックエンドへ。

### プラガブルなワークフローと Skill

プラグインは**フレームワーク**であり、機能の一枚岩ではありません。すべてがプラグイン可能です：

- **持ち込みワークフロー**：workflow パッケージを workflows ディレクトリに置くだけですぐに利用可能。プラグインの再ビルドは不要。
- **カスタム Skill-Runner スキル**：Skill-Runner のスキルパッケージングシステムで独自の AI スキルを定義し、同一実行パイプラインで実行。
- **共有可能なパッケージ**：workflow パッケージは共有 `lib/` モジュールをサポートし、凝集性の高いワークフロースイートの構築を容易にします。

### マルチバックエンドの柔軟性

- ワークフローごとに異なるバックエンドへルーティング — 一部は Skill-Runner 経由、他は直接 HTTP API やローカルパススルーロジック。
- バックエンドを切り替えてもワークフロー定義は変更不要 — provider レイヤが変換を処理。
- 安定かつ信頼性の高い agentic 業務実行フレームワークと開発者に優しいインターフェース。内蔵ワークフローは起点に過ぎず、実行パイプラインこそがコア資産です。

## 💡 エンジン推奨

### Codex（推奨第一位）

- **長所**：エージェント CLI ツールと LLM モデル（速度、理解力、出力の安定性）の両方で最高クラスのパフォーマンス。思考プロセスストリーミングをサポート。非常に安定した実行。無料版あり（モデルアクセス制限あり）。
- **短所**：無料版はモデルアクセス制限あり（最新または最も強力なモデルが含まれない場合があります）。
- **結論**：ほとんどのユーザーへの第一位推奨。即使無料版でも優れた結果を提供します。

### Opencode

- **長所**：複数のモデルプロバイダーをサポート。Alibaba 百錬 coding plan、智譜 coding plan などとの組み合わせを強く推奨。Qwen3.5-Plus、MiniMax-M2.5、Kimi-K2.5、GLM-5 などのモデルは文献理解、抽出、要約において優れたパフォーマンスを発揮し、実際のワークフローに完全に実用的です。
- **短所**：速度が不安定なことがあります。DeepSeek API との組み合わせは使えますが、V3.2 モデルは著しく性能が劣っています。reasoner tier を使用すると忍耐が必要かもしれません。第三者 Antigravity 割り当てサポートはありますが、アカウントバンリスクがあります。
- **結論**：適格な API キーや互換性のあるサブスクリプションをお持ちの場合、最高の無料/低コストオプションです。

### Qwen Code

- **長所**：公式 OAuth ログインで~~**毎日 1000 回の無料呼び出し**~~ Qwen3.6-Plus — 無料枠は 2026 年 4 月 15 日に終了しましたが、今後の公式イベントに期待できます。アリババの Coding Plan と組み合わせた qwen シリーズモデルは文献タスクでなかなか良い効果を出しています。
- **短所**：他の engine に比べて相対的に未成熟。
- **結論**：アリババの Coding Plan と合わせて使うのがおすすめです。

### Gemini-CLI

- **長所**：無料版あり。
- **短所**：起動が遅く、インタラクティブなタスクの経験が不太好。**Google が Pro サブスクリプションのクォータを大幅に削減した後**、コストパフォーマンスは一般的に不良です。
- **結論**：シンプルなタスクには Gemini-3-Flash が不错的选择です。

### Claude Code

- **長所**：指令実行効果が良く、出力が安定している。
- **短所**：実行効率が低く、コード関連の作業により適している。
- **説明**：公式 Claude Code 統合（公式認証 + 公式モデル）は**作者未テスト** — 正直に言うと、**Anthropic サブスクリプションを購入していません**。言わせてもらえば、Anthropic はちょっと「合法的すぎる」かもしれません🤷。
- **代替案**：本プロジェクトは第三者プロバイダーの便利な設定エントリーポイントを提供しています。独自の API キーや他のルートを持つユーザーは設定可能です。
- **BTW**：こんなに高いサブスクリプションをこのプロジェクトに使うのはちょっと大げさです — 公式サブスクリプションは**お金持ちの方のみ推奨**。
- **結論**：他の手段で Claude アクセスを既に持っている場合、うまく動作します — でも参入障壁は他のオプションより高いです。

## 📋 組み込みワークフロー

### Literature Workbench Package（文献ワークベンチパッケージ）

文献処理ワークフローの統一パッケージ：

| ワークフロー             | プロバイダー     | 説明                                                              |
| ------------------------ | ---------------- | ----------------------------------------------------------------- |
| **文献ダイジェスト**     | `skillrunner`    | markdown/PDF から digest、参考文献、引用分析ノートを生成          |
| **文献エクスプレイナー** | `skillrunner`    | インタラクティブな対話型文献解釈、会話ノートとして記録            |
| **ノート出力**           | `pass-through`   | 自定义ノート（markdown/HTML）や文献摘要産物のエクスポート         |
| **ノート取込**           | `pass-through`   | markdown ファイルを自定义ノートとしてインポート、複数ファイル選択 |
| **参考文献マッチング**   | `pass-through`   | 参考文献を citekey にマッチし、構造化 payload を書き戻し          |
| **参考文献ノート編輯**   | `pass-through`   | 専用フォームダイアログで構造化参考文献エントリを編集              |

### Tag Vocabulary Package（タグ語彙パッケージ）

統制語彙管理工作流：

| ワークフロー         | プロバイダー     | 説明                                                          |
| -------------------- | ---------------- | ------------------------------------------------------------- |
| **タグマネージャー** | `pass-through`   | 統制語彙の CRUD、ファセットフィルタリング、GitHub 同期          |
| **タグレギュレーター** | `skillrunner`  | LLM 提案によるタグ正規化、統制タグを条目に納入                  |

### その他のワークフロー

| ワークフロー             | プロバイダー     | 説明                                                    |
| ------------------------ | ---------------- | ------------------------------------------------------- |
| **MinerU**               | `generic-http`   | PDF を解析し、markdown/アセットを実体化して親アイテムに添付 |
| **ワークフローデバッグプローブ** | `pass-through` | ランタイム故障のトラブルシューティング用診断ワークフロー（デバッグモードのみ可視） |

## 📥 インストール

### 前提条件

- [Zotero 7](https://www.zotero.org/download/)（バージョン ≥ 6.999）
- `skillrunner` ワークフローの場合：稼働中の [Skill-Runner](https://github.com/leike0813/Skill-Runner) インスタンス

### インストール手順

1. [Releases](https://github.com/leike0813/Zotero-Skills/releases) ページから最新の `.xpi` ファイルをダウンロードします。
2. Zotero で `ツール` → `アドオン` → ⚙️ → `ファイルからアドオンをインストール…`
3. ダウンロードした `.xpi` ファイルを選択し、Zotero を再起動します。

### クイックスタート

#### 1. Skill-Runner をデプロイ（前提条件）

**ワンクリックローカルデプロイ**（クイックテスト推奨）

1. `編集` → `設定` → `Zotero Skills` → `SkillRunner Local Runtime` を開く
2. **Deploy** ボタンをクリックし、デプロイが完了するのを待つ
3. バックエンドは自動的に設定されます

**Docker デプロイ**（本番環境推奨）

Docker デプロイの詳細については [Skill-Runner](https://github.com/leike0813/Skill-Runner) を参照してください：

```bash
mkdir -p skills data
docker compose up -d --build
```

- **API**: http://localhost:9813/v1
- **Admin UI**: http://localhost:9813/ui

#### 2. バックエンドを設定

_ワンクリックデプロイを使用しない場合_：`編集` → `設定` → `Zotero Skills` → `Backend Manager` で Skill-Runner エンドポイントを追加。

#### 3. ワークフローを配置

ワークフローフォルダをワークフローディレクトリにコピー（設定で構成可能）。

#### 4. 使用開始

アイテムを右クリック → `Zotero-Skills` → ワークフローを選択。

## 🏗️ アーキテクチャ概要

```
ユーザートリガー
    │
    ▼
選択コンテキスト ──► ワークフローエンジン ──► プロバイダーレジストリ ──► ジョブキュー
                         │                        │                      │
                   workflow.json            バックエンド             FIFO + 同時実行
                   + フックスクリプト         プロファイル解決          制御
                         │                        │                      │
                         ▼                        ▼                      ▼
                   リクエスト構築 ──► プロバイダー解決 ──► 実行 & 結果適用
                                                              │
                                                         Handlers:
                                                         ノート / タグ /
                                                         添付ファイル / アイテム
```

## 🧑‍💻 開発

```bash
npm install          # 依存関係のインストール
npm start            # 開発サーバー起動（モック Skill-Runner 付き）
npm test             # lite テスト実行
npm run test:full    # フルテスト実行
npm run build        # プロダクションビルド
```

詳細は [開発ガイド](dev_guide.md) を参照してください。

## 📖 ドキュメント

| ドキュメント                                 | 説明                                              |
| -------------------------------------------- | ------------------------------------------------- |
| [アーキテクチャフロー](architecture-flow.md) | 実行パイプラインの概要（Mermaid 図付き）          |
| [開発ガイド](dev_guide.md)                   | コアコンポーネント、設定モデル、実行チェーン      |
| [ワークフロー](components/workflows.md)      | マニフェストスキーマ、フック、入力フィルタリング  |
| [プロバイダー](components/providers.md)      | プロバイダーコントラクトシステム、リクエスト種別  |
| [テスト](testing-framework.md)               | デュアルランナー戦略、lite/full モード、CI ゲート |

## 📄 ライセンス

[AGPL-3.0-or-later](../LICENSE)

## 🙏 謝辞

- [@windingwind](https://github.com/windingwind) の [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) をベースに構築
- [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit) を使用
