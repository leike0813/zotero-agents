# Déploiement et configuration du Skill-Runner

## Qu'est-ce que le Skill-Runner ?

Skill-Runner est un service autonome d'exécution de skills d'agents. Zotero Agents communique avec Skill-Runner via l'API HTTP pour soumettre des requêtes de skills et récupérer les résultats. Il prend en charge plusieurs CLIs d'agents IA comme moteurs d'exécution et peut être déployé comme conteneur Docker indépendant ou service local.

> **🏆 Priorité de recommandation** : Si vous avez déjà un outil d'agent compatible ACP sur votre machine (Codex, OpenCode, Claude Code, etc.), veuillez d'abord utiliser le [backend ACP](#doc/backends%2Facp), qui ne nécessite aucune configuration supplémentaire. Skill-Runner convient aux scénarios nécessitant un service persistant en arrière-plan ou un partage sur le réseau local.

## Modes de déploiement

### Recommandé : Déploiement persistant Docker

Un Skill-Runner déployé avec Docker fonctionne comme un service persistant indépendant, **non affecté par les démarrages/arrêts de Zotero** — fermer Zotero permet aux tâches de continuer à s'exécuter en arrière-plan, et au prochain lancement de Zotero, vous pouvez reprendre ou récupérer directement les résultats terminés.

Convient pour :
- Les tâches de longue durée (Synthèse de sujets, analyse littéraire par lots, etc.)
- Le partage d'une seule instance Skill-Runner entre plusieurs appareils sur un réseau local
- Les utilisateurs ayant de l'expérience avec Docker

#### docker compose (recommandé)

```yaml
version: "3"
services:
  skill-runner:
    image: leike0813/skill-runner:latest
    ports:
      - "9813:9813"
      - "17681:17681"
    volumes:
      - ./skills:/app/skills
      - skillrunner_cache:/opt/cache
      - ./data:/app/data
    environment:
      - SKILL_RUNNER_DATA_DIR=/app/data
      - UI_BASIC_AUTH_ENABLED=false

volumes:
  skillrunner_cache:
```

```bash
mkdir -p data skills
docker compose up -d --build
```

Après le démarrage :
- **Service API** : `http://localhost:9813/v1`
- **Interface de gestion** : `http://localhost:9813/ui`

#### Exécution directe avec Docker

```bash
docker run --rm -p 9813:9813 -p 17681:17681 \
  -v "$(pwd)/skills:/app/skills" \
  -v skillrunner_cache:/opt/cache \
  -v "$(pwd)/data:/app/data" \
  leike0813/skill-runner:latest
```

Description des ports :

| Port | Objectif |
|------|----------|
| `9813` | API HTTP + Interface de gestion |
| `17681` | Terminal de moteur en ligne dans le navigateur (nécessite ttyd) |

#### Configuration pour la production

Pour les déploiements publics, il est recommandé d'activer l'authentification Basic de l'interface :

```bash
docker run --rm -p 9813:9813 \
  -v "$(pwd)/skills:/app/skills" \
  -e UI_BASIC_AUTH_ENABLED=true \
  -e UI_BASIC_AUTH_USERNAME=admin \
  -e UI_BASIC_AUTH_PASSWORD=your-password \
  leike0813/skill-runner:latest
```

Il est recommandé d'utiliser cela avec un proxy inverse HTTPS (tel que Nginx).

### En dépannage : Déploiement local en un clic

> ⚠️ Ce mode convient uniquement aux utilisateurs qui **n'ont aucune connaissance de l'installation des outils d'agents et ne peuvent pas utiliser Docker**. Si vous êtes capable d'installer des CLIs d'agents ou d'utiliser Docker, veuillez préférer le [backend ACP](#doc/backends%2Facp) ou le déploiement Docker ci-dessus.

Le Skill-Runner déployé en un clic démarre et s'arrête automatiquement avec le plugin Zotero — **fermer Zotero met fin à toutes les tâches en cours d'exécution**, et il n'y a pas d'exécution en arrière-plan. Les tâches interrompues doivent être resoumises.

**Étapes de déploiement :**

1. Ouvrez **Zotero → Paramètres → Zotero Agents**
2. Trouvez la section **Backend local SkillRunner**
3. Cliquez sur **Déploiement en un clic** (si pas encore installé)
   - Le plugin télécharge automatiquement la dernière version depuis GitHub Releases
   - Installe dans le répertoire de données du plugin
   - Le statut passe à « Installé » une fois terminé
4. Cliquez sur **Démarrer**
   - Adresse par défaut : `http://127.0.0.1:29813`
   - Si le port est occupé, il essaie automatiquement les 10 ports suivants

**Description des boutons d'action :**

| Bouton | Fonction |
|--------|----------|
| Déployer | Télécharger et installer l'environnement d'exécution Skill-Runner |
| Démarrer | Démarrer le processus Skill-Runner local |
| Arrêter | Arrêter le processus Skill-Runner en cours d'exécution |
| Désinstaller | Supprimer les fichiers d'environnement d'exécution installés |
| Ouvrir l'interface de gestion | Ouvrir l'interface Web de gestion intégrée de Skill-Runner dans la barre latérale |
| Ouvrir le dossier des skills | Ouvrir le répertoire où sont stockés les fichiers de skills |
| Actualiser le cache de modèles | Actualiser le cache de liste de modèles du backend |
| Ouvrir la console de débogage | Consulter la sortie des journaux du backend |

### Mode distant

Se connecter à une instance Skill-Runner distante ou hébergée dans le cloud.

> ⚠️ **Avis de sécurité** : La version actuelle ne fournit pas de protection de sécurité supplémentaire pour les connexions distantes (telles que TLS, vérification par clé API, etc.), reposant uniquement sur l'authentification par Bearer Token. **Les connexions distantes ne sont pas recommandées dans des environnements hors réseau local**. Lors d'un déploiement au sein d'un réseau local, il est recommandé d'utiliser un pare-feu pour restreindre les sources d'accès.

**Étapes de configuration :**

1. Ouvrez **Outils → [Gestionnaire de backends](#doc/backends%2Fbackend-manager)**
2. Basculez sur l'onglet **SkillRunner**
3. Cliquez sur **Ajouter SkillRunner**
4. Remplissez :
   - **Nom d'affichage** : Un nom convivial
   - **URL de base** : Adresse de l'instance distante (par exemple, `http://192.168.1.100:9813`)
   - **Authentification** : Sélectionnez `bearer` et remplissez le **Jeton d'authentification** (si le backend nécessite une authentification)
   - **Délai d'attente** : Délai d'attente de la requête (facultatif)
5. Cliquez sur **Enregistrer** dans le coin inférieur droit

## Déploiement local (sans Docker)

### Script de déploiement rapide

```bash
# Linux / macOS
./scripts/deploy_local.sh

# Windows (PowerShell)
.\scripts\deploy_local.ps1
```

Prérequis : `uv`, `Node.js`, `npm`. `ttyd` est facultatif.

### CLI de contrôle

```bash
# Vérifier le statut
./scripts/skill-runnerctl status --mode local --json

# Démarrer
./scripts/skill-runnerctl up --mode local --json

# Arrêter
./scripts/skill-runnerctl down --mode local --json
```

Paramètres par défaut du mode local :
- **Linux/macOS** : `$HOME/.local/share/skill-runner`
- **Windows** : `%LOCALAPPDATA%\SkillRunner`
- **Port** : `29813` (repli `29813-29823`)
- **Liaison** : `127.0.0.1` uniquement

### Installateur de version

```bash
# Linux / macOS
./scripts/skill-runner-install.sh --version v0.4.3

# Windows (PowerShell)
.\scripts\skill-runner-install.ps1 -Version v0.4.3
```

Le script télécharge automatiquement `skill-runner-<version>.tar.gz` + `.sha256` et vérifie l'intégrité SHA256 avant l'installation.

## Système de moteurs

Skill-Runner prend en charge plusieurs CLIs d'agents IA comme moteurs d'exécution et fournit une couche d'adaptation unifiée.

### Moteurs pris en charge

| Moteur | Nom du package |
|--------|---------------|
| Codex | `@openai/codex` |
| Gemini CLI | `@google/gemini-cli` |
| OpenCode | `opencode-ai` |
| Claude Code | `@anthropic-ai/claude-code` |
| Qwen | `@qwen-code/qwen-cli` |

### Priorité de configuration

La configuration du moteur est fusionnée à partir de quatre couches (de la plus basse à la plus haute) :

1. **Valeurs par défaut du moteur** : Configuration par défaut intégrée dans l'adaptateur de moteur
2. **Valeurs recommandées par le skill** : Configuration recommandée depuis le package de skill `assets/<engine>_config.*`
3. **Options utilisateur** : Paramètres du corps de la requête API
4. **Configuration forcée** : Configuration forcée de l'adaptateur de moteur (ne peut pas être surchargée)

### Authentification des moteurs

| Méthode | Description | Recommandation |
|---------|-------------|----------------|
| **Proxy OAuth** | Effectuez le OAuth complet via l'interface de gestion ; les identifiants sont stockés automatiquement | ⭐ Recommandé |
| **Délégation CLI** | Utilisez le flux de connexion local intégré du moteur | Alternative |
| **TUI en ligne** | Terminal du moteur dans le navigateur (nécessite ttyd) | Pour le débogage |
| **Importer un fichier d'identifiants** | Téléchargez des fichiers d'identifiants via l'interface | Alternative |
| **Connexion CLI dans le conteneur** | Exécutez la connexion CLI directement via `docker exec` | Pour les environnements conteneurisés |

## Interface de gestion

L'interface Web intégrée fournit des capacités opérationnelles complètes pour Skill-Runner.

URL d'accès : `http://localhost:<port>/ui`

| Fonctionnalité | Description |
|----------------|-------------|
| **Navigateur de skills** | Consulter les skills installés, inspecter la structure des packages et le contenu des fichiers |
| **Gestion des moteurs** | Surveiller le statut des moteurs, déclencher des mises à niveau, consulter les journaux des moteurs |
| **Catalogue de modèles** | Parcourir et gérer les snapshots de modèles des moteurs |
| **TUI en ligne** | Lancer des terminaux de moteurs directement dans le navigateur (nécessite ttyd) |
| **Paramètres** | Niveau de journalisation, durée de conservation des données, taille maximale du répertoire, etc. |

## Aperçu de l'API REST

### Points d'accès d'exécution principaux

```bash
# Lister les skills disponibles
curl http://localhost:9813/v1/skills

# Créer une tâche (exécuter un skill)
curl -X POST http://localhost:9813/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "my-skill",
    "engine": "gemini",
    "parameter": { "language": "zh-CN" },
    "model": "gemini-3-pro-preview"
  }'

# Obtenir les résultats
curl http://localhost:9813/v1/jobs/<request_id>/result

# Annuler une tâche
curl -X POST http://localhost:9813/v1/jobs/<request_id>/cancel
```

### Surveillance en temps réel (SSE)

Deux canaux SSE pour observer en temps réel le processus d'exécution :

| Canal | Point d'accès | Objectif |
|-------|--------------|----------|
| Chat | `GET /v1/jobs/{id}/chat?cursor=N` | Flux de bulles de chat |
| Événements | `GET /v1/jobs/{id}/events?cursor=N` | Flux complet d'événements de protocole |

Les deux canaux prennent en charge la reconnexion basée sur un curseur après une déconnexion.

### API de gestion

Points d'accès de gestion JSON stables adaptés à l'intégration frontend :

| Point d'accès | Objectif |
|---------------|----------|
| `GET /v1/management/skills` | Résumé des skills |
| `GET /v1/management/engines` | Statut des moteurs |
| `GET /v1/management/runs` | Historique des exécutions (paginé) |
| `GET /v1/management/runs/{id}/chat` | Flux SSE de conversation |
| `POST /v1/management/runs/{id}/reply` | Soumettre une réponse à un skill interactif |
| `POST /v1/management/runs/{id}/cancel` | Annuler une exécution |

### API de bail d'exécution locale

Le mode d'exécution local utilise une gestion du cycle de vie basée sur des baux :

| Point d'accès | Objectif |
|---------------|----------|
| `POST /v1/local-runtime/lease/acquire` | Acquérir un bail |
| `POST /v1/local-runtime/lease/heartbeat` | Renouveler le bail (TTL : 60s) |
| `POST /v1/local-runtime/lease/release` | Libérer le bail |

L'environnement d'exécution local se termine automatiquement lorsque le bail expire.

## Gestion des packages de skills

### Installation persistante

```bash
# Téléverser un zip de package de skill
curl -X POST http://localhost:9813/v1/skill-packages/install \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my-skill.zip"
```

Règles de validation côté serveur :
- Le package doit contenir un répertoire de niveau supérieur
- Doit avoir `SKILL.md` + `assets/runner.json`
- Doit avoir trois fichiers de schéma (entrée / paramètre / sortie)
- Le nom du répertoire == `runner.json.id` == le nom du frontmatter `SKILL.md` (cohérence d'identité)
- Les mises à jour doivent être strictement en version croissante

### Exécution temporaire (sans installation)

```bash
# Créer une exécution temporaire
curl -X POST http://localhost:9813/v1/temp-skill-runs \
  -H "Content-Type: application/json" \
  -d '{ "engine": "gemini", "parameter": {} }'

# Téléverser un package de skill et démarrer
curl -X POST http://localhost:9813/v1/temp-skill-runs/<id>/upload \
  -F "skill_package=@my-skill.zip"
```

Les exécutions temporaires sont automatiquement nettoyées après avoir atteint un état terminal.

## Cycle de vie d'exécution

Une exécution de skill typique comprend les étapes suivantes :

```
1. Configuration et téléversement
   └── Le client soumet POST /v1/jobs
       └── Téléverse éventuellement des fichiers d'entrée

2. Orchestration
   └── Charge le manifeste du skill
       └── Valide le schéma de paramètres
       └── Vérifie la compatibilité du moteur
       └── Applique les limites de concurrence

3. Adaptation du moteur
   └── Prépare l'environnement (copie du package de skill)
       └── Analyse les fichiers d'entrée
       └── Construit le prompt via des templates Jinja2
       └── Définit la confiance du répertoire d'exécution

4. Exécution
   └── Le CLI du moteur démarre comme sous-processus
       └── Répertoire de travail isolé
       └── stdout/stderr diffusés en temps réel

5. Achèvement
   └── Validation de la sortie (selon output.schema.json)
       └── Analyse des fichiers d'artefacts
       └── Génération du Bundle (zip + manifeste)
       └── Statut défini à succeeded / failed / canceled
```

Lorsqu'une exécution échoue, le bundle de débogage contient les journaux complets et les fichiers de diagnostic.

## Structure du répertoire de données

```
data/
├── runs/<run_id>/              # Espace de travail d'exécution
│   ├── .state/state.json       # État d'exécution
│   ├── .audit/                 # Journaux d'audit
│   ├── result/result.json      # Sortie structurée finale
│   ├── artifacts/              # Fichiers générés par le skill
│   └── bundle/                 # Résultats empaquetés (zip + manifeste)
├── requests/<request_id>/      # Données de phase de requête
│   ├── uploads/                # Fichiers d'entrée téléversés
│   └── request.json            # Paramètres de requête d'origine
├── logs/                       # Journaux d'application (rotation quotidienne)
└── system_settings.json        # Paramètres système modifiables via l'interface
```

## Référence des variables d'environnement

| Variable | Description | Par défaut |
|----------|-------------|------------|
| `SKILL_RUNNER_DATA_DIR` | Répertoire de données d'exécution | `./data` |
| `SKILL_RUNNER_AGENT_HOME` | Répertoire de configuration isolé de l'agent | `auto` |
| `SKILL_RUNNER_RUNTIME_MODE` | Mode d'exécution : local / container | `auto` |
| `UI_BASIC_AUTH_ENABLED` | Activer l'authentification Basic de l'interface | `false` |
| `UI_BASIC_AUTH_USERNAME` | Nom d'utilisateur Basic Auth | — |
| `UI_BASIC_AUTH_PASSWORD` | Mot de passe Basic Auth | — |

## Description des statuts d'exécution

| Statut | Description |
|--------|-------------|
| unknown | État initial, pas encore détecté |
| starting | Démarrage en cours |
| running | Fonctionnement normal |
| stopped | Arrêté |
| degraded | Fonctionnement anormal |
| reconciling_after_heartbeat_fail | Détection du heartbeat échouée, récupération en cours |

## Description des ports

- Port par défaut : `29813` (plage locale du plugin)
- Port API pour le déploiement autonome : `9813`
- Plage de repli : 10 ports consécutifs (29813–29822)
- Intervalle du heartbeat : 20 secondes
- Détection de démarrage automatique : vérification toutes les 15 secondes

## Journaux

Les journaux sont écrits dans `data/logs/skill_runner.log` (rotation quotidienne). Vous pouvez configurer le niveau de journalisation, la durée de conservation et la taille maximale du répertoire via la page des paramètres de l'interface de gestion.

Au démarrage du conteneur, des journaux de diagnostic structurés de bootstrap sont également générés dans `${SKILL_RUNNER_DATA_DIR}/logs/bootstrap.log` et `agent_bootstrap_report.json`.

## Prochaines étapes

- [Découvrir les workflows](#doc/workflows%2Findex) — Skill-Runner est l'un des principaux backends pour exécuter des workflows
- [Introduction au tableau de bord](#doc/dashboard) — Surveiller le statut d'exécution des tâches
- [Onglet SkillRunner](#doc/sidebar%2Fskillrunner-tab) — Consulter et interagir avec les exécutions SkillRunner dans la barre latérale
