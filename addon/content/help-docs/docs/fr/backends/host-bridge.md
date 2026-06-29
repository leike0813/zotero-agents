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
│     └── Routeur de capacités (30+ capacités)
│
└── CLI zotero-bridge (binaire compagnon)
      ├── Commandes sémantiques (context, library, mutation, synthesis)
      ├── Fichiers de configuration (bridge-profile.json)
      └── Mode stdin/pipe (pour l'intégration avec les agents ACP)
```

Version du protocole : `host-bridge.v1`. Tous les points d'accès sauf `GET /bridge/v1/health` nécessitent une authentification par Bearer Token.

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

```
zotero-bridge status                           # Vérification de l'état (pas d'authentification)
zotero-bridge manifest                         # Manifeste complet des capacités
zotero-bridge call <capability> [--input]      # Appel de capacité brut
zotero-bridge item search --query <text>
zotero-bridge item get --key <key>
zotero-bridge item notes --key <key>
zotero-bridge item attachments --key <key>
zotero-bridge note get --key <key>
zotero-bridge note payloads --key <key>
zotero-bridge note payload --key <key>
zotero-bridge library list --input '{"limit":50}'
zotero-bridge library snapshot --input '{"limit":200,"cursor":"0"}'
zotero-bridge topics list
zotero-bridge topics get-context --input <JSON>
zotero-bridge topics get-report --input <JSON>
zotero-bridge schemas get
zotero-bridge concepts query --input <JSON>
zotero-bridge citation-graph query-cluster --input <JSON>
zotero-bridge citation-graph get-overview
zotero-bridge library-index get
zotero-bridge resolvers resolve --input <JSON>
zotero-bridge reference-index get
zotero-bridge paper-artifacts get-manifest --input <JSON>
zotero-bridge paper-artifacts read --input <JSON>
zotero-bridge insights get-attention-queue
zotero-bridge literature ingest --input <JSON>
zotero-bridge workflow list
zotero-bridge workflow describe --workflow <id>
zotero-bridge workflow submit --workflow <id> (--input <JSON> | --none)
zotero-bridge workflow agent-run --workflow <id> (--input <JSON> | --none) --output-dir <DIR>
zotero-bridge workflow run <runId>
zotero-bridge task list [--workflow <id>] [--active-only]
zotero-bridge file download <fileId> --output <path>
```

L'entrée accepte : JSON en ligne, chemin de fichier JSON, syntaxe `@file`, `-` (stdin).

### Contrat de sortie

stdout émet toujours exactement un objet JSON :

```json
{ "ok": true, "data": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
{ "ok": false, "error": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
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
  "protocol": "host-bridge.v1",
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
<summary>Toutes les 30+ capacités</summary>

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

### Mutation

| Capacité | Description |
|----------|-------------|
| `mutation.preview` | Prévisualiser une opération d'écriture (sans exécuter) |
| `mutation.execute` | Exécuter une opération d'écriture (nécessite une approbation) |

### Synthesis

| Capacité | Description |
|----------|-------------|
| `topics.list` | Lister tous les sujets |
| `topics.get_context` | Obtenir le contexte d'un sujet |
| `topics.get_report` | Obtenir le rapport d'un sujet |
| `topics.get_review_input` | Assembler le package de revue d'un sujet |
| `schemas.get` | Obtenir les définitions de schéma |
| `concepts.query` | Interroger la base de connaissances de concepts |
| `citation_graph.query_cluster` | Interroger un cluster de citations |
| `citation_graph.get_overview` | Obtenir l'aperçu du graphe |
| `citation_graph.get_slice` | Extraire une tranche de sous-graphe |
| `citation_graph.get_metrics` | Calculer les métriques du graphe |
| `citation_graph.rank_external_references` | Classer les références externes |
| `citation_graph.rank_library_papers` | Classer les articles de la bibliothèque |
| `paper_artifacts.get_manifest` | Obtenir le manifeste des artefacts |
| `paper_artifacts.read` | Lire le contenu des artefacts |
| `paper_artifacts.export_filtered` | Exporter les artefacts filtrés |
| `paper_artifacts.resolve_topic_digest` | Résoudre le digest d'un sujet |
| `insights.get_attention_queue` | Obtenir la file d'attention |
| `resolvers.resolve` | Résoudre les résolveurs de références/sujets |
| `reference_index.get` | Obtenir l'index de références |
| `library_index.get` | Obtenir l'index de bibliothèque |

### Diagnostic

| Capacité | Description |
|----------|-------------|
| `diagnostic.get_status` | Obtenir le statut du service |

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

- [Serveur MCP](#doc/backends%2Fmcp-server) — Interface de protocole standardisée pour les clients compatibles MCP (Claude Desktop, etc.)
- [Hermes Profiles](#doc/backends%2Fhermes-profiles) — Profil installable pour gérer votre bibliothèque Zotero avec des agents IA
- [Préférences](#doc/preferences) — Consulter tous les paramètres de Host Bridge
- [Backend ACP](#doc/backends%2Facp) — Découvrir la configuration des agents ACP
