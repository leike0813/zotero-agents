# Host Bridge

## Aperçu

Host Bridge est le serveur HTTP intégré du plugin qui permet aux outils IA externes (Codex, Claude Code, OpenCode, etc.) d'accéder directement à votre bibliothèque Zotero. Il est le pont de communication entre les agents ACP et Zotero, et sert de transport sous-jacent pour le CLI `zotero-bridge` et le serveur MCP.

## Architecture

```
Processus du plugin Zotero
│
├── Serveur HTTP Host Bridge (loopback: 127.0.0.1:<port>)
│     ├── Authentification Bearer Token (chaque requête)
│     ├── Porte d'approbation d'écriture (par opération)
│     └── Routeur de capacités (60+ capacités)
│
└── CLI zotero-bridge (binaire compagnon)
      ├── Commandes sémantiques (context, library, mutation, synthesis)
      ├── Fichiers de configuration (bridge-profile.json)
      └── Mode stdin/pipe (pour l'intégration avec les agents ACP)
```

Version du protocole : `host-bridge.v2`. Tous les points d'accès sauf `GET /bridge/v1/health` nécessitent une authentification par Bearer Token. Les contrats de capacités utilisent `host-bridge.capabilities.v2`.

## Configuration

Zotero → Paramètres → Zotero Agents → Host Bridge

| Paramètre | Type | Par défaut | Description |
|-----------|------|------------|-------------|
| **Activer le serveur MCP** | booléen | `true` | Activer également le protocole MCP pour les agents tiers |
| **Désactiver l'approbation d'écriture** | booléen | `false` | Dangereux : contourner toutes les approbations d'écriture. Marqué comme zone de danger rouge |
| **Activer l'accès LAN** | booléen | `false` | Lier à `0.0.0.0` pour l'accès LAN (force le port fixe) |
| **Port fixe** | booléen | `false` | Fixer le port (par défaut 26570) au lieu d'utiliser un port aléatoire |
| **Numéro de port** | nombre | `26570` | Port utilisé en mode fixe (1024-65535) |
| **IP LAN** | chaîne | `""` | Surcharge manuelle de l'IP LAN annoncée ; laisser vide pour la détection automatique |
| **Démarrer / Afficher le point d'accès** | bouton | — | S'assurer que le serveur fonctionne et afficher l'URL du point d'accès actuel |
| **Renouveler le jeton** | bouton | — | Renouveler le jeton de session |
| **Créer / Renouveler le jeton maître** | bouton | — | Générer un jeton persistant inter-sessions |
| **Copier le jeton maître** | bouton | — | Copier le jeton dans le presse-papiers |
| **Copier le profil CLI distant** | bouton | — | Copier le JSON complet du profil CLI distant |
| **Installer le CLI** | bouton | — | Installation en un clic de `zotero-bridge` dans le PATH système |

## Modèle de sécurité

### Authentification par Bearer Token

- Chaque requête doit inclure l'en-tête `Authorization: Bearer <token>`
- **Jeton de session** : auto-généré au démarrage du plugin (24 octets en base64), dure le temps de la session du plugin
- **Jeton maître** : jeton persistant facultatif, stockage chiffré AES-256-GCM, pour l'accès CLI inter-sessions
- Les jetons ne sont jamais écrits dans les prompts, les journaux ou la sortie des agents

### Approbation d'écriture

Les opérations d'écriture nécessitent l'approbation de l'interface Zotero :

| Niveau | Description |
|--------|-------------|
| **Approbation requise** | `mutation.execute`, `workflow submit`, `debug.zotero.eval`, `citation_graph.refresh_metrics` |
| **Approbation automatique** | Toutes les opérations en lecture seule, `diagnostic.get_status`, `mutation.preview` |

**Double porte d'approbation automatique :**
1. Le manifeste du workflow déclare `allowWriteApprovalBypass: true`
2. L'utilisateur coche explicitement l'approbation automatique dans la boîte de dialogue de soumission

Les deux conditions doivent être satisfaites pour que l'approbation automatique prenne effet.

La préférence globale de zone de danger de Host Bridge peut désactiver ces approbations pour des sessions de débogage temporaires de confiance.

### Sécurité LAN / Distant

- Le mode LAN lie `0.0.0.0` et doit être activé manuellement. **À utiliser uniquement sur des réseaux de confiance**
- L'accès distant nécessite un jeton maître (créé manuellement), jamais distribué automatiquement
- La détection automatique de l'IP LAN utilise la réflexion réseau du backend SkillRunner ; peut être surchargée manuellement

## Le CLI `zotero-bridge`

`zotero-bridge` est un outil CLI en Rust permettant aux agents ACP et aux utilisateurs du terminal d'appeler Host Bridge.

### Installation

Utilisez le bouton « Installer le CLI » dans les préférences. Les exécutions ACP utilisent le binaire intégré au plugin (injecté dans le PATH de l'espace de travail).

### Priorité de résolution du point d'accès / Jeton

| Source | Point d'accès | Jeton |
|--------|--------------|-------|
| Drapeau CLI | `--endpoint` | — |
| Environnement | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| Fichier de profil | Champ `endpoint` | `auth.token` / `auth.tokenEnv` |

### Commandes sémantiques

<details>
<summary>Toutes les 125 commandes canoniques</summary>

#### surface — Agent Surface
```
zotero-bridge surface identity --json
zotero-bridge surface describe <command...> --json
zotero-bridge surface search --intent <text>
```

#### bridge — Server Status & Profile
```
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status
zotero-bridge call <capability> [--input <json>]
```

#### library — Reading the Library
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

#### context — UI Context & Navigation
```
zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open
zotero-bridge context item open --key <key>
zotero-bridge context note open --key <key>
zotero-bridge context collection open --key <key>
```

#### synthesis — Synthesis Layer
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

#### mutation — Write Operations
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

#### workflow — Workflow Management
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

#### run — Runtime Observation
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

#### file — File Transfers
```
zotero-bridge file download <fileId> --output <path>
zotero-bridge file upload --path <path>
```

#### product — Dashboard Products
```
zotero-bridge product list [--limit <n>]
zotero-bridge product get --product-id <id>
zotero-bridge product download --product-id <id> --output <path>
zotero-bridge product remove --product-id <id>
```

#### operation — Persistent Operations
```
zotero-bridge operation get --operation-id <id>
```

</details>

L'entrée accepte : JSON en ligne, chemin de fichier JSON, syntaxe `@file`, `-` (stdin).

Pour le catalogue de commandes complet et à jour, exécutez `zotero-bridge surface identity --json` pour voir le `commandCatalogChecksum` actuel, puis `zotero-bridge surface describe <command...>` pour le contrat d'une commande spécifique.

### Contrat de sortie

stdout émet toujours exactement un objet JSON :

```json
{ "ok": true, "data": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
{ "ok": false, "error": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
```

Codes de sortie d'erreur :

| Catégorie | Code de sortie |
|-----------|---------------:|
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

### Fichiers de profil

Emplacements de profil bien connus :

| SE | Chemin |
|----|--------|
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

## Intégration des agents ACP

Lorsqu'un agent ACP exécute un skill, le plugin injecte automatiquement :

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # Shim CLI
  profile.json                # Profil de connexion (jeton via variable d'environnement)
  README.md                   # Indices d'utilisation
```

Variables d'environnement injectées :

- `ZOTERO_BRIDGE_PROFILE` — chemin vers profile.json
- `ZOTERO_BRIDGE_TOKEN` — bearer token
- `ZOTERO_BRIDGE_SCOPE` — JSON du périmètre d'approbation
- `PATH` / `Path` — préfixé par `.zotero-bridge/bin`

## Capacités disponibles

<details>
<summary>Toutes les 60+ capacités</summary>

### Contexte

| Capacité | Description |
|----------|-------------|
| `context.get_current_view` | Informations sur la vue actuelle de Zotero |
| `context.get_selected_items` | Notices actuellement sélectionnées |

### Bibliothèque

| Capacité | Description |
|----------|-------------|
| `library.search_items` | Rechercher des notices |
| `library.get_item_detail` | Obtenir les détails d'une notice |
| `library.list_items` | Liste paginée des notices |
| `library.sync_snapshot` | Paginated metadata snapshot for local indexing |
| `library.get_item_notes` | Lister les notes |
| `library.get_note_detail` | Lire le contenu d'une note |
| `library.list_note_payloads` | Lister les payloads de notes |
| `library.get_note_payload` | Obtenir un payload spécifique |
| `library.get_item_attachments` | Lister les pièces jointes |
| `library.list_annotations` | Lister les annotations du lecteur |
| `library.export_annotations` | Exporter les annotations du lecteur en markdown ou JSON |
| `library.readiness_audit` | Audit de préparation de la bibliothèque en lecture seule et paginé |

### Mutation

| Capacité | Description |
|----------|-------------|
| `mutation.preview` | Prévisualiser une opération d'écriture (sans exécuter) |
| `mutation.execute` | Exécuter une opération d'écriture (nécessite une approbation) |

### Workflow Products

| Capacité | Description |
|----------|-------------|
| `workflow_products.list` | Lister les produits du tableau de bord |
| `workflow_products.get` | Retourner les métadonnées publiques d'un produit |
| `workflow_products.read_asset` | Enregistrer un asset de produit pour le téléchargement |
| `workflow_products.export` | Exporter un ou tous les assets d'un produit |
| `workflow_products.remove` | Supprimer un enregistrement de produit |

### Synthesis — Topics

| Capacité | Description |
|----------|-------------|
| `topics.list` | Lister tous les sujets |
| `topics.find_by_paper_ref` | Trouver des sujets par référence d'article |
| `topics.get_context` | Obtenir le contexte d'un sujet |
| `topics.get_report` | Obtenir le rapport d'un sujet |
| `topics.get_review_input` | Assembler le package de revue d'un sujet |

### Synthesis — Citation Graph

| Capacité | Description |
|----------|-------------|
| `citation_graph.query_cluster` | Interroger un cluster de citations |
| `citation_graph.get_overview` | Obtenir l'aperçu du graphe |
| `citation_graph.get_slice` | Extraire une tranche de sous-graphe |
| `citation_graph.get_metrics` | Calculer les métriques du graphe |
| `citation_graph.get_layout` | Obtenir les coordonnées de mise en page persistées |
| `citation_graph.rank_external_references` | Classer les références externes |
| `citation_graph.rank_library_papers` | Classer les articles de la bibliothèque |
| `citation_graph.refresh_metrics` | Diagnostic : actualiser les métriques persistées |
| `citation_graph.update` | Démarrer une mise à jour atomique du graphe de citations |

### Synthesis — Concepts, Schemas, Resolvers

| Capacité | Description |
|----------|-------------|
| `concepts.query` | Interroger la base de connaissances de concepts |
| `schemas.get` | Obtenir les définitions de schéma |
| `resolvers.resolve` | Résoudre les résolveurs de références/sujets |

### Synthesis — Paper Artifacts

| Capacité | Description |
|----------|-------------|
| `paper_artifacts.get_manifest` | Obtenir le manifeste des artefacts |
| `paper_artifacts.read` | Lire le contenu des artefacts |
| `paper_artifacts.export_filtered` | Exporter les artefacts filtrés |
| `paper_artifacts.resolve_topic_digest` | Résoudre le digest d'un sujet |

### Synthesis — Indexes & Insights

| Capacité | Description |
|----------|-------------|
| `reference_index.get` | Obtenir l'index de références |
| `reference_sidecar.refresh` | Démarrer l'actualisation du sidecar de références |
| `library_index.get` | Obtenir l'index de bibliothèque |
| `insights.get_attention_queue` | Obtenir la file d'attention |
| `synthesis.operation.get` | Lire le reçu d'opération de synthèse persistant |

### Diagnostic

| Capacité | Description |
|----------|-------------|
| `diagnostic.get_status` | Obtenir le statut du service |

### Debug (mode debug uniquement)

| Capacité | Description |
|----------|-------------|
| `debug.status` | Instantané de l'état de debug du Host Bridge |
| `debug.persistence.snapshot` | Instantané de la persistance runtime |
| `debug.tasks.snapshot` | Diagnostics des tâches de workflow et des exécutions ACP |
| `debug.zotero.eval` | Exécuter du JavaScript approuvé dans le contexte Zotero |
| `debug.acpSkillRun.reapplyResult` | Ré-exécuter applyResult pour une exécution de skill ACP |
| `debug.skillrunner.connections.snapshot` | Diagnostics du gouverneur de connexions SkillRunner |
| `debug.synthesis.snapshot` | Instantané des opérations et du cache de synthèse |
| `debug.synthesis.diff` | Comparer les payloads Zotero et les caches du dépôt |
| `debug.synthesis.cache.list` | Lister les lignes du cache sidecar de synthèse |
| `debug.synthesis.operations.list` | Lister les opérations de synthèse |
| `debug.synthesis.paper.inspect` | Inspecter un article à travers les caches |
| `debug.synthesis.topic.inspect` | Inspecter un sujet à travers les artefacts |
| `debug.synthesis.profiler.list` | Exécutions du profileur de synthèse |
| `debug.synthesis.cleanInstallReset` | Dangereux : réinitialiser l'état de la base de données de synthèse |

</details>

## Flux d'approbation d'écriture

```
L'agent appelle une capacité d'écriture
  │
  ├── 1. La requête arrive au Host Bridge (avec le Bearer Token)
  ├── 2. Le jeton est validé
  ├── 3. Le périmètre est extrait
  ├── 4. Vérification de l'approbation :
  │     ├── Périmètre en lecture seule → exécution immédiate
  │     ├── autoApproveWrites = true ET utilisateur a pré-approuvé → exécution
  │     └── Approbation nécessaire → mise en file d'attente dans l'interface Zotero
  ├── 5. L'invite d'approbation est affichée dans le Chat ACP / le panneau SkillRunner
  │     ├── L'utilisateur approuve → exécution
  │     └── L'utilisateur refuse → retour d'erreur
  └── 6. Résultat retourné, journal d'audit écrit
```

Routage par périmètre :

| Périmètre | Interface d'approbation |
|-----------|------------------------|
| `acp-skill-run` | Interface des Skills ACP |
| `acp-chat` | Panneau du Chat ACP |
| `skillrunner-run` | Panneau SkillRunner |
| Pas de périmètre / `global` | Interface d'approbation globale de Zotero |

## Accès LAN / Distant

1. Cochez **Activer l'accès LAN** dans les préférences
2. Fixez un port ou notez le port actuel
3. Créez / copiez un **Jeton maître**
4. Cliquez sur **Copier le profil CLI distant** pour la configuration complète de la connexion
5. Sur la machine distante, configurez le `endpoint` (`http://<LAN_IP>:<port>/bridge/v1`) et le jeton
6. Testez : `zotero-bridge status --endpoint http://<LAN_IP>:<port>/bridge/v1`

**Important :** Le mode LAN contourne la protection par loopback. À utiliser uniquement sur des réseaux locaux de confiance.

## Prochaines étapes

- [Serveur MCP](mcp-server) — Interface de protocole standardisée pour les clients compatibles MCP (Claude Desktop, etc.)
- [Hermes Profiles](hermes-profiles) — Profil installable pour gérer votre bibliothèque Zotero avec des agents IA
- [Préférences](../preferences) — Consulter tous les paramètres de Host Bridge
- [Backend ACP](acp) — Découvrir la configuration des agents ACP
