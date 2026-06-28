# Gestionnaire de backends

Le gestionnaire de backends est la fenêtre unifiée de gestion de toutes les configurations de backends. Grâce à lui, vous pouvez ajouter, modifier, supprimer et vérifier les connexions aux backends.

## Comment l'ouvrir

- **Menu** : **Outils → Gestionnaire de backends**

## Disposition de l'interface

```
┌─────────────────────────────────────────────────┐
│  Gestionnaire de backends                [Annuler] [Enregistrer] │
├─────────────────────────────────────────────────┤
│  [ACP] [SkillRunner] [Generic HTTP]              │
├─────────────────────────────────────────────────┤
│  ACP                                   [Ajouter ACP] │
│                                                 │
│  ┌─ Nom d'affichage : [________]  ─┐           │
│  │  Commande :       [________]    │            │
│  │  Arguments :      Éditeur d'arguments │      │
│  │  Variables d'env. : Éditeur de var. d'env. │  [Supprimer] │
│  └──────────────────────────────┘              │
│                                                 │
│  ┌─ Nom d'affichage : [________]  ─┐           │
│  │  ...                          │  [Supprimer] │
│  └──────────────────────────────┘              │
└─────────────────────────────────────────────────┘
```

## Opérations générales

### Basculement d'onglets

Il y a trois onglets en haut de la fenêtre : **ACP**, **SkillRunner** et **Generic HTTP**. Cliquez sur un onglet pour basculer vers la zone de configuration du type de backend correspondant. Chaque onglet liste tous les backends configurés de ce type.

### Ajout d'un backend

Cliquez sur le bouton **Ajouter** sous un onglet pour créer une nouvelle ligne de configuration vierge pour ce type. Remplissez les champs et cliquez sur **Enregistrer** dans le coin inférieur droit pour appliquer.

### Modification d'un backend

Modifiez les champs directement dans la ligne de configuration. Les modifications non enregistrées ne prendront pas effet.

### Suppression d'un backend

Cliquez sur le bouton **Supprimer** dans une ligne de configuration pour supprimer ce backend. Les suppressions prennent effet après l'enregistrement.

### Enregistrer et Annuler

| Bouton | Emplacement | Fonction |
|--------|-------------|----------|
| **Enregistrer** | Coin inférieur droit de la fenêtre | Enregistrer toutes les modifications et fermer la fenêtre |
| **Annuler** | Coin inférieur droit de la fenêtre (à côté d'Enregistrer) | Ignorer toutes les modifications non enregistrées et fermer la fenêtre |

S'il y a des modifications non enregistrées avant la fermeture de la fenêtre, une invite de confirmation apparaîtra.

---

## Onglet ACP

Les backends ACP sont des sous-processus d'agents exécutés localement. La configuration spécifie la commande de lancement, et le plugin gère le cycle de vie du processus.

![Page de configuration du backend ACP](/img/docs/backends/backend-manager_ACP.png)

### Description des champs

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| **Nom d'affichage** | Oui | Nom d'affichage du backend, utilisé pour l'identifier dans le tableau de bord et la barre latérale |
| **Commande** | Oui | Commande pour démarrer le backend ACP (par exemple, `npx -y opencode-ai@latest acp`) |
| **Arguments** | Non | Arguments supplémentaires pour la commande, ajoutés un par un via l'éditeur d'arguments |
| **Variables d'environnement** | Non | Variables d'environnement supplémentaires, ajoutées une par une via l'éditeur de variables d'environnement (paires clé-valeur) |

### Préréglages ACP

En haut de l'onglet ACP se trouve un bouton **Ajouter depuis un préréglage**. Un clic ouvre la fenêtre de configuration du préréglage : à gauche vous sélectionnez l'agent, à droite s'affichent les options de lancement et un aperçu de configuration en lecture seule. Un clic sur **Confirmer** ajoute une ligne de configuration ACP ordinaire selon l'aperçu ; un clic sur **Annuler** ne modifie pas la configuration actuelle.

- **Utiliser npx** : une fois activé, la commande bascule au format `npx <package>` et un message s'affiche indiquant que Node.js et npm doivent être installés, avec un lien vers le site de Node.js. Codex et Claude Code l'ont activé par défaut, car ils dépendent de l'adaptateur ACP ; pas les autres agents.
- **Environnement isolé** : disponible uniquement pour les agents prenant en charge l'isolation. Une fois activé, les variables d'environnement correspondantes sont injectées dans l'aperçu et un message indique que les options de l'agent et l'authentification doivent être gérées manuellement dans ce répertoire isolé.

![Boîte de dialogue des préréglages ACP](/img/docs/backends/backend-manager_ACP-preset.png)

La zone d'aperçu est en lecture seule et inclut l'ID du profil, le nom d'affichage, la commande, les paramètres, les variables d'environnement et la famille d'agent. La ligne de configuration ajoutée peut toujours être modifiée comme un backend ACP ordinaire.

Commandes par défaut des préréglages intégrés :

| Préréglage | Commande par défaut | Description |
|------|------|------|
| **OpenCode** | `opencode acp` | Backend ACP OpenCode ; prend en charge l'isolation du répertoire de configuration via `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | Adaptateur ACP pour OpenAI Codex |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | Adaptateur ACP pour Claude Code |
| **Gemini CLI** | `gemini --experimental-acp` | Mode ACP de Gemini CLI |
| **Hermes** | `hermes acp` | Backend ACP Hermes Agent |
| **Qwen Code** | `qwen --acp --experimental-skills` | Mode ACP de Qwen Code |
| **GitHub Copilot** | `copilot --acp --stdio` | Mode ACP de GitHub Copilot CLI |
| **Qoder CLI** | `qodercli --acp` | Mode ACP de Qoder CLI ; prend en charge l'isolation du répertoire de configuration via `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Adaptateur ACP Cursor Agent ; prend en charge l'isolation du répertoire de session via `--session-dir` |
| **DeepAgents** | `deepagents-acp` | Adaptateur ACP DeepAgents |
| **Auggie** | `auggie --acp` | Mode ACP Auggie |
| **Kilo** | `kilo acp` | Mode ACP Kilo Code |
| **Cline** | `cline --acp` | Mode ACP Cline |
| **CodeBuddy** | `codebuddy --acp` | Mode ACP CodeBuddy |
| **Grok** | `grok agent stdio` | Mode stdio Grok Agent |

Seuls OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code et Hermes Agent ont été testés. La disponibilité des autres backends ACP dépend de leurs implémentations ; ce plugin ne fournit aucune garantie à cet égard.

### Boutons d'action

| Bouton | Fonction |
|--------|----------|
| **Actualiser les options d'exécution** | Redétecter la liste des modèles, la liste des modes et les autres capacités d'exécution du backend |

### Éditeur d'arguments

**Ajouter un argument** : Cliquez sur le bouton d'ajout et saisissez le contenu de l'argument.
**Supprimer un argument** : Cliquez sur le bouton de suppression à côté de l'argument.

### Éditeur de variables d'environnement

**Ajouter une variable d'environnement** : Cliquez sur le bouton d'ajout et remplissez la clé et la valeur.
**Supprimer une variable d'environnement** : Cliquez sur le bouton de suppression à côté de la variable.

---

## Onglet SkillRunner

Les backends SkillRunner communiquent avec les services Skill-Runner via l'API HTTP, prenant en charge les modes de déploiement local et distant.

![Page de configuration du backend SkillRunner](/img/docs/backends/backend-manager_skillrunner.png)

### Description des champs

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| **Nom d'affichage** | Oui | Nom d'affichage du backend |
| **URL de base** | Oui | Adresse du service Skill-Runner (par exemple, `http://127.0.0.1:29813`) |
| **Authentification** | Non | Sélectionnez `none` (pas d'authentification) ou `bearer` (authentification par Bearer Token) |
| **Jeton d'authentification** | Non | Bearer Token (à remplir uniquement lorsque l'authentification est définie sur bearer) |
| **Délai d'attente** | Non | Délai d'attente de la requête (millisecondes) |

### Boutons d'action

| Bouton | Fonction |
|--------|----------|
| **Ouvrir l'interface de gestion** | Ouvrir l'interface Web de gestion intégrée de Skill-Runner |
| **Actualiser le cache de modèles** | Actualiser le cache de liste de modèles pour ce backend |

---

## Onglet Generic HTTP

Les backends Generic HTTP sont utilisés pour envoyer des requêtes à n'importe quel service HTTP, principalement pour appeler des API externes (telles que le service d'analyse de documents MinerU).

![Page de configuration du backend Generic HTTP](/img/docs/backends/backend-manager_generic-HTTP.png)

### Description des champs

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| **Nom d'affichage** | Oui | Nom d'affichage du backend |
| **URL de base** | Oui | Adresse de base du service HTTP |
| **Authentification** | Non | Sélectionnez `none` ou `bearer` |
| **Jeton d'authentification** | Non | Bearer Token (à remplir uniquement lorsque l'authentification est définie sur bearer) |
| **Délai d'attente** | Non | Délai d'attente de la requête (millisecondes) |

## Détection des capacités du backend

Après avoir enregistré un backend, le plugin détecte automatiquement les capacités du backend en arrière-plan :

- **ACP** : Vérifie la disponibilité de la commande, l'initialisation de la connexion, la liste des modèles, la liste des modes, et calcule une empreinte de configuration pour détecter les modifications ultérieures
- **SkillRunner** : Vérifie la disponibilité de l'API, la liste des moteurs, la liste des modèles
- **Generic HTTP** : Vérifie l'accessibilité du point d'accès HTTP

Les résultats de détection sont affichés sous forme d'indicateurs de statut du backend dans le tableau de bord et la barre latérale.

## Prochaines étapes

Une fois la configuration terminée, vous pouvez :

- Utiliser le backend ACP dans le [Chat ACP](../sidebar/acp-chat) ou les [Skills ACP](../sidebar/acp-skills)
- Gérer les exécutions SkillRunner via l'[Onglet SkillRunner](../sidebar/skillrunner-tab)
- Utiliser les backends configurés pour exécuter des tâches dans la [Liste des workflows](../workflows/) et le [Tableau de bord](../dashboard)
