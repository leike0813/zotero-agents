# Synthesis Workbench 概要

Synthesis Workbench は、Zotero Agents が提供する文献深部分析プラットフォームである。ライブラリを構造化された知識ネットワークに変換し、トピック統合、引用分析、概念管理、統制語彙管理をサポートする。

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/home.webp" alt="Synthesis Workbench ホーム" title="Synthesis Workbench ホーム" loading="lazy" /><figcaption>Synthesis Workbench ホーム</figcaption></figure>

## 開き方

1. **ツールバーボタン**または**メニュー**から Dashboard / Synthesis Workspace を開く
2. Workspace Tab で **Synthesis** ビューに切り替える

## 全サーフェス（ページ）

Synthesis Workbench は 8 つのサーフェスで構成され、それぞれ異なる機能ビューを提供する。

| サーフェス | 機能 | ドキュメント |
|------------|------|-------------|
| **Home** | ライブラリ概要ダッシュボード：ライブラリインサイト（登録論文数/トピック数/グラフノード数）、Git 同期状態パネル、トレンドトピックカードリスト | [詳細](#doc/synthesis%2Fhome) |
| **Topics** | トピックリストと管理：3 つのビューモード（グラフ/グリッド/リスト）、トピックの作成と更新、トピック検索と並び替え | [詳細](#doc/synthesis%2Ftopic-synthesis) |
| **Index** | 正規参考文献インデックス：論文レジストリビュー（論文リスト + 引用行 + バインディング状態）、正規参考文献ビュー（検索/統合/リダイレクト/重複排除） | [詳細](#doc/synthesis%2Findex-and-citation) |
| **Review** | レビューハブ：3 つのサブタブ — 引用マッチレビュー（バインディング提案の承認/却下）、概念レビュー、トピックグラフ関係レビュー | [詳細](#doc/synthesis%2Freview) |
| **Graph** | 引用グラフの可視化（力指向/放射状/コンポーネント — 3 つのレイアウト）、トピックフィルタリングとノード/エッジ操作 | [詳細](#doc/synthesis%2Findex-and-citation) |
| **Tags** | 統制タグ語彙管理 + 自動タグ提案の承認 | [詳細](#doc/synthesis%2Ftags) |
| **Concepts** | 概念知識ベース管理：概念/意味/別名/関係の 4 層構造、トピックグラフやリーダーにオーバーレイ可能 | [詳細](#doc/synthesis%2Fconcepts) |
| **Reader** | トピックリーダー：8 つのサブページ（Overview、Taxonomy、Claims、Compare、Future Directions、Coverage、References、Report）を持つ完全なトピック詳細ページ | [詳細](#doc/synthesis%2Ftopic-synthesis) |

## コアコンセプト

### Canonical Store

Canonical Store は、Synthesis システムの知識グラフ基盤ストレージである。Zotero データディレクトリにコンテンツアドレス指定可能な JSON ファイルを保存する。

**保存場所：** `<Zotero データディレクトリ>/zotero-agents/data/synthesis/`

**ディレクトリ構造：**

```
synthesis/
├── topics/             # トピック統合の構造化アーティファクト
├── concepts/           # 概念知識ベース
├── topic-graph/        # トピックグラフのノードとエッジ
├── citation-graph/     # 引用グラフのスナップショット
├── tags/               # 統制タグ語彙
├── sync/               # Git 同期ワーキングツリー
└── state/              # ランタイム状態（トランザクション、レシート、キャッシュなど）
```

各ファイルは CanonicalEnvelope という JSON エンベロープ形式を使用し、スキーマ ID、バージョン番号、タイムスタンプ、スキーマ検証済みデータ本体を含む。書き込み操作はトランザクションセマンティクスを使用する。データはまずトランザクションディレクトリにステージされ、検証成功後に正規位置に昇格し、失敗時は自動的にロールバックされる。

### Reference Sidecar

Reference Sidecar は、各論文に添付されたアーティファクトのインデックスである。Workflow が文献アイテムを処理してダイジェスト、参考文献リスト、引用分析を生成すると、これらのアーティファクトは構造化ノート（Zotero Notes）としてアイテムに添付される。Sidecar システムはこれらのノートをスキャンし、アーティファクトの状態（完全/一部/欠落）をインデックスに記録する。

**Sidecar スキャンサイクル：** Sidecar は以下のタイミングでスキャンがトリガーされる。

- Workflow 実行完了後、アーティファクトが書き込まれた時点
- 明示的な Sidecar 更新操作がトリガーされた時点
- システム起動時に古い Sidecar データを検出した時点

**アーティファクト種別：**

| アーティファクト | 説明 |
|-----------------|------|
| `digest` | 論文ダイジェスト（Markdown） |
| `references` | 参考文献リスト（JSON） |
| `citation_analysis` | 引用分析レポート（JSON） |

Sidecar データは Canonical Reference Index の主要な入力源となる。システムは references アーティファクトから引用レコードを抽出し、正規参考文献を確立した後、ライブラリアイテムとのマッチングとバインディングを試みる。

### データフロー

```
Zotero Library
    │
    ├──→ Workflow 実行（Literature Analysis / Deep Reading）
    │         │
    │         ↓
    │   アーティファクトノート（ダイジェスト/参考文献/引用分析）
    │         │
    │         ↓
    │   Reference Sidecar ← アーティファクト状態をスキャン
    │         │
    │         ├──→ Canonical Reference Index
    │         │         │
    │         │         ├──→ 引用バインディング（Zotero アイテムにバインド）
    │         │         └──→ 引用グラフ
    │         │
    │         └──→ トピック統合
    │                   │
    │                   ├──→ トピックグラフ（トピック間関係）
    │                   └──→ 概念関連付け（Concept KB）
    │
    └──→ Git Sync ←→ リモートリポジトリ（バージョン管理とバックアップ）
```

## 前提条件

Synthesis Workbench を使用するには以下が必要である。

- 設定済みの [Skill-Runner](#doc/backends%2Fskill-runner) バックエンド（統合 Workflow の実行用）
- ライブラリに論文アイテムが既に存在していること

## 次のステップ

- [Home ダッシュボード](#doc/synthesis%2Fhome) — ライブラリ概要と同期状態を確認
- [タグ管理](#doc/synthesis%2Ftags) — 統制タグ語彙を管理
- [インデックスと引用グラフ](#doc/synthesis%2Findex-and-citation) — 参考文献インデックスと引用ネットワークについて学ぶ
- [トピック統合の作成](#doc/synthesis%2Ftopic-synthesis) — トピック分析を作成
- [レビューハブ](#doc/synthesis%2Freview) — 引用マッチ、概念、トピックグラフの提案をレビュー
- [概念知識ベース](#doc/synthesis%2Fconcepts) — コア概念を管理
- [Git Sync](#doc/synthesis%2Fgit-sync) — データの同期とバックアップを設定
