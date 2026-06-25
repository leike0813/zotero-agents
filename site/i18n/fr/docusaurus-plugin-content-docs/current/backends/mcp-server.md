# Serveur MCP

## Aperçu

Le serveur MCP (Model Context Protocol) est un service de protocole intégré qui expose votre bibliothèque Zotero et les capacités de Synthesis sous forme de 40+ outils MCP. Les clients compatibles MCP (Claude Desktop, Cursor, extensions VS Code, etc.) peuvent accéder directement aux données de Zotero.

Le serveur MCP partage le registre de capacités sous-jacent de Host Bridge, mais suit la spécification du protocole MCP (transport HTTP streamable, JSON-RPC 2.0).

## Configuration

Zotero → Paramètres → Zotero Agents → Host Bridge → **Activer le serveur MCP**

Une seule case à cocher active/désactive le serveur. Activé par défaut.

### Valeurs par défaut non configurables

| Paramètre | Valeur | Raison |
|-----------|--------|--------|
| Adresse d'écoute | `127.0.0.1` | Sécurité : loopback uniquement |
| Validation de l'origine | Stricte | Uniquement `127.0.0.1`, `localhost`, `[::1]` |
| Limite de taille de requête | 1 Mo | Protection de la mémoire |
| Protection d'écriture | Activée | Toutes les opérations d'écriture nécessitent une approbation |

## Sécurité

- **Authentification par Bearer Token** : partage le même jeton de session/jeton maître que Host Bridge
- **Loopback uniquement** : aucun accès distant possible
- **Validation de l'origine** : requêtes cross-origin rejetées (403)
- **Limite de 1 Mo** : corps trop volumineux rejetés avec 413
- **File d'attente mono-threadée** : 1 en exécution + 8 en attente, délai d'exécution de 45s, délai d'attente en file de 30s
- **Disjoncteurs** : 3 échecs en 5 minutes → outil suspendu pendant 60s

## Connexion des clients MCP

### Point d'accès

```
http://127.0.0.1:<port>/mcp
```

Le port est attribué automatiquement (plage 26370-26569). Consultez le point d'accès Host Bridge dans les préférences pour connaître le port réel.

### Exemple de configuration pour Claude Desktop

```json
{
  "mcpServers": {
    "zotero-skills": {
      "type": "http",
      "url": "http://127.0.0.1:26370/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

Obtenez le jeton depuis Préférences → Host Bridge → **Copier le jeton maître**.

### Détails du protocole

- Transport : HTTP streamable (`POST /mcp`)
- Version : `2025-06-18`
- Identité du serveur : `zotero-skills` / `"Zotero Agents Context Broker"` v0.4.0
- `GET /mcp` → 405 (seul POST est accepté)
- Requêtes sans `id` → traitées comme des notifications (pas de réponse)
- `id: null` → explicitement invalide

## Inventaire des outils

<details>
<summary>Tous les 40+ outils</summary>

### Outils de lecture

| Outil | Description |
|-------|-------------|
| `get_current_view` | Informations sur la vue actuelle de Zotero |
| `get_selected_items` | Résumés des notices actuellement sélectionnées |
| `search_items` | Rechercher des notices (limite ≤ 50) |
| `list_library_items` | Liste paginée des notices |
| `get_item_detail` | Métadonnées complètes d'une notice |
| `get_item_notes` | Lister les notes enfants |
| `get_note_detail` | Lire le corps d'une note (par blocs, ≤16k caractères par bloc) |
| `list_note_payloads` | Lister les payloads de workflow dans une note |
| `get_note_payload` | Lire un payload |
| `get_item_attachments` | Lister les manifestes de pièces jointes (pas d'octets de fichier) |
| `prepare_paper_reading_context` | Agréger les métadonnées, notes, payloads et pièces jointes pour un article |

### Outils d'écriture (nécessitent une approbation)

| Outil | Description |
|-------|-------------|
| `preview_mutation` | Prévisualiser une opération d'écriture sans l'exécuter |
| `update_item_fields` | Mettre à jour les champs autorisés d'une notice |
| `add_item_tags` | Ajouter des balises à une ou plusieurs notices |
| `remove_item_tags` | Supprimer des balises |
| `create_child_note` | Créer une note enfant |
| `update_note` | Mettre à jour le corps d'une note |
| `create_markdown_note` | Créer une note avec du HTML rendu + un payload Markdown en base64 |
| `update_markdown_note` | Mettre à jour une note existante basée sur du Markdown |
| `ingest_paper` | Ingérer un article par DOI/arXiv/PMID/ISBN (avec pièce jointe PDF) |
| `add_items_to_collection` | Ajouter des notices à une collection |
| `remove_items_from_collection` | Retirer des notices d'une collection |

### Outil de diagnostic

| Outil | Description |
|-------|-------------|
| `get_mcp_status` | Diagnostics du service : file d'attente, disjoncteurs, requêtes récentes |

### Outils de Synthesis

| Outil | Description |
|-------|-------------|
| `topics.list` | Lister tous les sujets |
| `topics.find_by_paper_ref` | Trouver les sujets par référence d'article |
| `topics.get_context` | Obtenir le contexte complet d'un sujet |
| `topics.get_review_input` | Assembler le package de revue d'un sujet |
| `schemas.get` | Obtenir les définitions de schéma |
| `concepts.query` | Interroger la base de connaissances de concepts |
| `citation_graph.query_cluster` | Interroger un cluster de citations |
| `citation_graph.get_overview` | Obtenir l'aperçu du graphe |
| `citation_graph.get_slice` | Extraire une tranche de sous-graphe |
| `citation_graph.get_metrics` | Calculer les métriques du graphe (pagerank, foundation, frontier) |
| `citation_graph.rank_external_references` | Classer les références externes |
| `citation_graph.rank_library_papers` | Classer les articles de la bibliothèque |
| `library_index.get` | Index paginé de la bibliothèque |
| `resolvers.resolve` | Résoudre les résolveurs de références/sujets |
| `reference_index.get` | Obtenir l'index de références |
| `paper_artifacts.get_manifest` | Obtenir le manifeste des artefacts |
| `paper_artifacts.read` | Lire le contenu des artefacts |
| `paper_artifacts.export_filtered` | Exporter les artefacts filtrés |
| `paper_artifacts.resolve_topic_digest` | Résoudre le digest d'un sujet |
| `insights.get_attention_queue` | Obtenir la file d'attention |

</details>

## Protection d'écriture

Les outils d'écriture suivent le même modèle d'approbation que Host Bridge :

```
Le client MCP invoque un outil d'écriture
  │
  ├── Bearer Token validé
  ├── Périmètre de l'outil extrait
  ├── Vérification de l'approbation :
  │     ├── Outil en lecture seule → exécution immédiate
  │     ├── Écriture pré-approuvée → exécution immédiate
  │     └── Approbation nécessaire → mise en file d'attente dans l'interface Zotero
  └── Exécuter / Refuser
```

File d'attente : maximum 50 approbations en attente ; >10 écritures refusées en 5 minutes → disjoncteur (désactivé pendant 30s).

## Prochaines étapes

- [Host Bridge](host-bridge) — Le transport sous-jacent et l'outil CLI
- [Préférences](../preferences) — Consulter les paramètres du serveur MCP
