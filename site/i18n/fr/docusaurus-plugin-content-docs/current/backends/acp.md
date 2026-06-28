# Configuration du backend ACP

## Qu'est-ce que l'ACP ?

ACP (Agent Client Protocol) est un protocole de communication avec les backends d'agents. Zotero Agents communique avec des processus d'agents exécutés localement (tels que Codex, Claude Code, OpenCode, etc.) via le protocole ACP pour permettre des conversations et l'exécution de skills.

Le backend ACP est la méthode de configuration **recommandée** — tant que vous avez un outil d'agent compatible ACP installé sur votre machine, vous pouvez l'utiliser directement sans aucune configuration supplémentaire.

## Nouveau sur Agent ?

Si vous débutez avec les outils d'agent et ne savez pas lequel choisir ni comment l'installer, consultez ce guide :

**[Guide de démarrage Agent](https://agent.ps5.online)**

## Pourquoi l'ACP en premier ?

- **Aucune charge de configuration** : Pas besoin de déployer des services supplémentaires ; utilisez les outils d'agents déjà présents sur votre machine
- **Gestion automatique des processus** : Le plugin spécifie la commande de lancement dans la configuration et gère automatiquement le cycle de vie du processus d'agent
- **Prise en charge multi-agents** : Configurez simultanément plusieurs backends d'agents différents et basculez entre eux selon vos besoins
- **Isolation des configurations** : Certains agents (tels qu'OpenCode et Codex) prennent en charge l'isolation des répertoires de configuration et des répertoires de persistance de session via des variables d'environnement

## Étapes de configuration

1. Assurez-vous d'avoir au moins un outil CLI d'agent compatible ACP installé sur votre machine
2. Ouvrez **Outils → [Gestionnaire de backends](backend-manager)**
3. Basculez sur l'onglet **ACP**
4. Sélectionnez votre outil d'agent dans le menu déroulant **Ajouter depuis un préréglage**, ou cliquez sur **Ajouter ACP** pour configurer manuellement
5. Remplissez les champs suivants :
   - **Nom d'affichage** : Un nom convivial (par exemple, « Mon OpenCode »)
   - **Commande** : Commande pour démarrer le backend ACP (les préréglages remplissent automatiquement, mais vous pouvez aussi modifier manuellement)
   - **Arguments** : Arguments supplémentaires pour la commande (facultatif)
   - **Variables d'environnement** : Variables d'environnement supplémentaires (facultatif, utilisé pour l'isolation de configuration, etc.)
6. Cliquez sur **Enregistrer** dans le coin inférieur droit

### Vérification de la connexion

Après l'enregistrement, le plugin détecte automatiquement les capacités du backend :
- Vérifie si la commande existe
- Se connecte et s'initialise
- Récupère les modèles et modes disponibles
- Calcule une empreinte de configuration pour détecter les modifications ultérieures

Si la détection échoue, vérifiez que le CLI de l'agent est correctement installé et que le format de la commande est correct.

## Préréglages d'agents pris en charge

Le plugin fournit plusieurs préréglages intégrés. Après avoir cliqué sur **Ajouter depuis un préréglage**, sélectionnez un agent à gauche ; la partie droite affiche les options de lancement et un aperçu de configuration en lecture seule.

**Utiliser npx** bascule la commande au format `npx <package>` et affiche un message indiquant que Node.js et npm doivent être installés. Codex et Claude Code utilisent npx par défaut, car ils dépendent de l'adaptateur ACP ; les autres agents utilisent la commande brute par défaut. L'activation de npx ajoute le suffixe `(npm)` au nom du profil.

**Environnement isolé** n'est disponible que pour les agents prenant en charge l'isolation. Une fois activé, le plugin injecte les variables d'environnement d'isolation documentées ou les arguments de répertoire de session dans l'aperçu, et affiche un message indiquant que les options de l'agent et l'authentification doivent être gérées manuellement dans ce répertoire. L'activation de l'isolation ajoute le suffixe `(Isolated)` au nom du profil.

![Boîte de dialogue des préréglages ACP](/img/docs/backends/backend-manager_ACP-preset.png)

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

Seuls OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code et Hermes Agent ont été testés. La disponibilité des autres backends ACP dépend de leurs implémentations et ce plugin ne la garantit pas. En cas de problème, vous pouvez ajuster vous-même les arguments de commande et les variables d'environnement ; le protocole ACP et la documentation officielle du backend font foi.

Vous pouvez toujours modifier manuellement n'importe quel champ après avoir sélectionné un préréglage.

## Recommandations de configuration des variables d'environnement

Certains agents prennent en charge l'isolation de configuration et la persistance de session via des variables d'environnement ; ajoutez-les simplement dans l'éditeur de variables d'environnement :

| Variable d'environnement | Agent | Objectif |
|--------------------------|-------|----------|
| `OPENCODE_CONFIG` | OpenCode | Spécifier un répertoire de configuration indépendant |
| `OPENCODE_SESSION_DIR` | OpenCode | Spécifier un répertoire de persistance de session |
| `CODEX_CONFIG_DIR` | Codex | Spécifier un répertoire de configuration indépendant |

## Types de requêtes

Le backend ACP prend en charge deux types de requêtes :
- `acp.prompt.v1` — Interaction conversationnelle (Chat ACP)
- `acp.skill.run.v1` — Exécution de skills (Skills ACP)

Le même backend ACP peut être utilisé simultanément pour les conversations et les exécutions de skills.

## Gestion des sessions

- Chaque backend peut avoir plusieurs sessions (conversations), qui sont stockées de manière persistante dans la base de données du plugin
- Différents backends ACP peuvent fonctionner simultanément sans interférence
- Les sessions peuvent être gérées dans le [Chat ACP](../sidebar/acp-chat)

## Prochaines étapes

Une fois la configuration terminée, vous pouvez :
- Discuter avec le backend dans le [Chat ACP de la barre latérale](../sidebar/acp-chat)
- Consulter les exécutions de skills ACP dans le [Tableau de bord](../dashboard)
- Utiliser le backend ACP pour exécuter des tâches dans la [Liste des workflows](../workflows/)
