# Profil Hermes Zotero Librarian

## Aperçu

**zotero-librarian** est un profil [Hermes](https://github.com/anomalyco/hermes) prêt à installer qui permet aux agents IA de gérer votre bibliothèque Zotero via le [Host Bridge](#doc/backends%2Fhost-bridge). Il inclut tout ce dont un agent a besoin : la CLI `zotero-bridge`, un modèle de profil de connexion Host Bridge, un index de métadonnées SQLite local, un cache de catalogue de workflows, des scripts de surveillance des exécutions et des tâches cron de maintenance planifiée.

Le profil est distribué en tant que paquet autonome depuis la branche `host-bridge/zotero-librarian-profile` du dépôt Zotero Agents.

## Ce qu'il peut faire

| Fonctionnalité | Description |
|----------------|-------------|
| **Index de métadonnées local** | Maintient un instantané SQLite interrogeable de votre bibliothèque Zotero — titres, créateurs, étiquettes, collections, DOI, nombre de notes/pièces jointes — pour des requêtes rapides et utilisables hors ligne |
| **Cache du catalogue de workflows** | Met en cache localement tous les contrats de charge utile des workflows intégrés afin que les agents puissent soumettre des workflows connus sans avoir à réinterroger les schémas à chaque exécution |
| **Maintenance planifiée** | Six modèles cron intégrés : actualisation de l'index, actualisation du catalogue de workflows, surveillance des exécutions, tri de la boîte de réception, hygiène de la bibliothèque et résumés de la file d'attention |
| **Surveillance des exécutions** | Suit les exécutions de workflows soumises et signale les changements d'état, les états terminaux ou les éléments nécessitant une attention |
| **File d'attention** | Combine `insights.get_attention_queue` de Host Bridge avec les métadonnées de l'index local pour faire apparaître les tâches de lecture et d'analyse hautement prioritaires |

## Installation

### Prérequis

- [Zotero](https://www.zotero.org/) 7+ avec le plugin **Zotero Agents** installé
- Host Bridge en cours d'exécution (vérifier : Zotero → Paramètres → Zotero Agents → Host Bridge → **Démarrer / Afficher le point de terminaison**)
- [Hermes](https://github.com/anomalyco/hermes) installé sur votre système
- CLI `zotero-bridge` disponible (installer via le bouton **Installer la CLI** dans le panneau des paramètres Host Bridge)

### Installer le profil

```bash
hermes profile install zotero-librarian
```

Cela télécharge le paquet du profil et l'extrait dans votre répertoire de profils Hermes.

### Configurer Hermes

Modifiez le fichier `config.yaml` du profil pour définir votre fournisseur de modèles préféré :

```yaml
# Dans le répertoire du profil installé
provider:
  type: anthropic    # ou openai, local, etc.
  model: claude-sonnet-4-20250514
  # ... Clé API et autres paramètres du fournisseur
```

Consultez la [documentation Hermes](https://github.com/anomalyco/hermes) pour toutes les options de configuration du fournisseur.

### Configurer la connexion Zotero Bridge

Le profil est livré avec un modèle de connexion Host Bridge dans `assets/host-bridge/profile.example.json`. Vous devez fournir le point de terminaison et le jeton réels :

1. Ouvrez Zotero → Paramètres → Zotero Agents → Host Bridge
2. Cliquez sur **Démarrer / Afficher le point de terminaison** pour vous assurer que le bridge est en cours d'exécution et notez l'URL du point de terminaison (ex. `http://127.0.0.1:26570/bridge/v1`)
3. Cliquez sur **Copier le jeton maître** (ou utilisez le jeton de session affiché dans le panneau)
4. Définissez le jeton comme variable d'environnement :

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<votre-jeton>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<votre-jeton>"
```

5. Pour un accès distant/LAN, incluez également le point de terminaison directement :

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

Le modèle de profil utilise `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"`, donc la CLI récupère automatiquement le jeton depuis l'environnement. Consultez la [Configuration de Host Bridge](#doc/backends%2Fhost-bridge) pour une documentation détaillée sur le point de terminaison, le jeton et les fichiers de profil.

### Vérifier la configuration

```bash
# Vérifier la connectivité Host Bridge
zotero-bridge status

# Installer les binaires CLI dans le profil (première fois uniquement)
python scripts/install_zotero_bridge_cli.py

# Première actualisation de l'index (récupère toutes les métadonnées de la bibliothèque dans SQLite local)
python scripts/zotero_librarian_index_service.py refresh

# Tester une recherche dans l'index local
python scripts/zotero_librarian_index_service.py search "machine learning"
```

## Commandes du service d'index

L'utilitaire principal du profil est `zotero_librarian_index_service.py`. Il maintient une base de données SQLite locale pour des requêtes rapides et répétées de la bibliothèque sans appeler Zotero à chaque requête.

| Commande | Description |
|----------|-------------|
| `refresh` | Parcourt `zotero-bridge library snapshot` et met à jour atomiquement l'index SQLite. Les éléments absents de la dernière actualisation sont marqués comme supprimés. |
| `search "<requête>"` | Recherche en texte intégral dans les titres, créateurs, identifiants, étiquettes, collections et champs de publication |
| `item <key-or-id>` | Renvoie un seul enregistrement indexé par clé d'élément Zotero ou ID numérique |
| `stats` | Indique le nombre d'éléments actifs/supprimés, d'étiquettes, de collections et l'état du catalogue de workflows |
| `workflow-refresh` | Appelle `workflow list` et `workflow describe` pour mettre à jour le cache du catalogue de workflows local |
| `workflow-show <id>` | Affiche le contrat de charge utile mis en cache pour un workflow connu |
| `run-register --run-id <id> --workflow-id <id>` | Enregistre une exécution de workflow soumise pour la surveillance |
| `run-watch` | Vérifie toutes les exécutions enregistrées actives et signale les changements d'état ou les états terminaux |

## Cas d'utilisation

### Gestion de la bibliothèque

**Tri quotidien de la boîte de réception** (`cron/inbox-triage.yaml`)

Le cron de tri de la boîte de réception du profil s'exécute quotidiennement et vérifie l'exhaustivité des nouveaux éléments de votre bibliothèque :

- Éléments avec le statut `0-inbox` (non traités)
- Étiquettes ou affectations de collection manquantes
- DOI, URL ou fichiers joints manquants
- Artefacts de résumé ou de digest manquants

Il produit un rapport d'actions suggérées mais n'effectue aucune mutation Zotero sans votre approbation.

**Hygiène hebdomadaire de la bibliothèque** (`cron/library-hygiene.yaml`)

S'exécute chaque lundi et analyse la bibliothèque à la recherche de problèmes de qualité des données :

- Entrées en double (par DOI, titre ou ISBN)
- Titres suspects avec caractères corrompus
- Éléments orphelins (aucune collection parente)
- Collections vides
- Nombre excessif d'étiquettes sur des éléments individuels
- Éléments avec des types d'élément Zotero inhabituels

Toutes les suggestions sont en lecture seule jusqu'à ce que vous approuviez explicitement les actions correctives.

**File d'attention** (`cron/attention-queue.yaml`)

Combine `insights.get_attention_queue` de Host Bridge avec les métadonnées de l'index local pour afficher une liste classée de tâches hautement prioritaires — articles à lire, lacunes de métadonnées à combler, workflows à exécuter.

### Recherche et import de littérature

1. Recherchez d'abord dans votre index local pour éviter d'ajouter à nouveau des articles que vous possédez déjà :
   ```bash
   python scripts/zotero_librarian_index_service.py search "attention mechanism survey"
   ```

2. Si un article n'est pas trouvé, utilisez le workflow `literature-search-ingest` pour rechercher des sources externes et l'ajouter à Zotero :
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"attention mechanism survey","searchMode":"arxiv-and-doi"}'
   ```

3. Après l'importation, exécutez les workflows tag-bootstrapper ou tag-regulator pour normaliser les étiquettes des nouveaux éléments.

### Workflows automatisés d'analyse de la littérature

Le profil catalogue tous les workflows intégrés du plugin Zotero Agents. Une fois le catalogue actualisé, vous pouvez soumettre n'importe quel workflow directement sans avoir à réinterroger son schéma.

**Analyse de littérature par lots**

Soumettez le workflow `literature-analysis` sur une collection d'articles pour générer des résumés structurés :

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"fr"}'
```

Enregistrez et surveillez l'exécution :

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**Lecture approfondie d'un seul article**

Pour une analyse approfondie d'un article spécifique :

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"fr","mode":"comprehensive"}'
```

**Synthèse thématique entre articles**

Synthétisez des thèmes à travers une collection d'articles :

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"self-supervised learning","language":"fr"}'
```

**Aide à la traduction**

Traduisez les métadonnées ou les résumés d'articles :

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"fr","mode":"metadata"}'
```

**Questions-réponses sur les articles**

Posez des questions sur le contenu d'un article :

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"fr"}'
```

## Tâches de maintenance planifiées

Le profil comprend six modèles cron préconfigurés dans le répertoire `cron/` :

| Tâche Cron | Planification | Comportement |
|-----------|--------------|--------------|
| `index-refresh` | Toutes les 6 heures | Parcourt `library snapshot` pour maintenir l'index SQLite local à jour. Signale `[SILENT]` quand aucun changement n'est détecté. |
| `workflow-catalog-refresh` | Tous les jours à 03:00 | Appelle `workflow list` + `workflow describe` pour mettre à jour le cache du catalogue de workflows. Signale `[SILENT]` en l'absence de changements. |
| `run-monitor` | Toutes les 5 minutes | Appelle `run-watch` pour vérifier les exécutions enregistrées actives. Signale uniquement les changements d'état, les états terminaux ou les éléments nécessitant une attention. |
| `inbox-triage` | Tous les jours à 09:00 | Recherche les éléments avec `status:0-inbox`, les étiquettes manquantes, les collections manquantes, les métadonnées manquantes. Génère un rapport en lecture seule. |
| `library-hygiene` | Tous les lundis | Analyse les entrées en double, les éléments orphelins, les collections vides et les problèmes de qualité des données. |
| `attention-queue` | Tous les jours à 18:00 | Combine les informations de la file d'attention avec les données de l'index local pour classer les tâches hautement prioritaires. |

Toutes les tâches de maintenance non interactives utilisent des marqueurs `[SILENT]` pour éviter de déranger l'utilisateur lorsqu'aucun résultat exploitable n'est trouvé.

## Limites de sécurité

- Le modèle de profil (`profile.example.json`) ne contient jamais de jetons réels. Utilisez toujours `ZOTERO_BRIDGE_TOKEN` comme variable d'environnement.
- Les tâches cron de maintenance sont en lecture seule par défaut. Les mutations nécessitent une approbation explicite de l'utilisateur.
- Ne lisez jamais directement les fichiers de la base de données Zotero. Utilisez toujours Host Bridge, `zotero-bridge` et l'index local produit à partir de `library.sync_snapshot`.

## Prochaines étapes

- [Host Bridge](#doc/backends%2Fhost-bridge) — référence complète de la CLI `zotero-bridge` et des fonctionnalités de Host Bridge
- [Workflows](#doc/workflows%2Findex) — aperçu de tous les workflows intégrés et personnalisés
- [Serveur MCP](#doc/backends%2Fmcp-server) — interface de protocole alternative pour les clients compatibles MCP
