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
2. Ouvrez **Outils → [Gestionnaire de backends](#doc/backends%2Fbackend-manager)**
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

**Utiliser npx** bascule la commande au format `npx <package>` et affiche un message indiquant que Node.js et npm doivent être installés. Codex, Claude Code, Factory Droid, Pi ACP et Amp ACP utilisent npx par défaut ; les autres préréglages utilisent leur commande installée par défaut. L'activation de npx ajoute le suffixe `(npm)` au nom du profil.

Désactiver **Utiliser npx** lance l'exécutable nommé du préréglage, qui doit déjà être installé (par exemple `gemini`, `copilot`, `opencode` ou `kimi`). Les préréglages sans option npx utilisent toujours le CLI installé : Hermes, Cursor natif (`agent`), Mistral Vibe, OpenHands, Goose, Junie, Kiro CLI et Oh My Pi. Pi ACP et Amp ACP sont des adaptateurs, donc les CLI sous-jacents Pi et Amp doivent également être installés et authentifiés. Oh My Pi est basé sur Bun. L'activation de npx nécessite Node.js et npm.

**Environnement isolé** n'est disponible que pour les agents prenant en charge l'isolation. Une fois activé, le plugin injecte les variables d'environnement d'isolation documentées ou les arguments de répertoire de session dans l'aperçu, et affiche un message indiquant que les options de l'agent et l'authentification doivent être gérées manuellement dans ce répertoire. L'activation de l'isolation ajoute le suffixe `(Isolated)` au nom du profil.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP-preset.webp" alt="Boîte de dialogue des préréglages ACP" title="Boîte de dialogue des préréglages ACP" loading="lazy" /><figcaption>Boîte de dialogue des préréglages ACP</figcaption></figure>

<!-- prettier-ignore -->
| Préréglage | Commande par défaut | Description |
| --- | --- | --- |
| **OpenCode** | `opencode acp` | Backend ACP OpenCode ; injecte `OPENCODE_CONFIG_CONTENT` pour refuser les questions d'autorisation et prend en charge l'isolation du répertoire de configuration via `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | Adaptateur ACP pour OpenAI Codex |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | Adaptateur ACP pour Claude Code |
| **Gemini CLI** | `gemini --acp` | Mode ACP de Gemini CLI |
| **Hermes** | `hermes acp` | Backend ACP Hermes Agent |
| **Qwen Code** | `qwen --acp` | Mode ACP de Qwen Code ; prend en charge l'isolation du répertoire de configuration via `QWEN_HOME` |
| **GitHub Copilot** | `copilot --acp --stdio` | Mode ACP de GitHub Copilot CLI ; prend en charge l'isolation du répertoire de configuration via `COPILOT_HOME` |
| **Qoder CLI** | `qoder --acp` | Mode ACP de Qoder CLI ; prend en charge l'isolation documentée du répertoire de configuration via `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Adaptateur ACP Cursor Agent ; prend en charge l'isolation documentée du répertoire de session via `--session-dir` |
| **DeepAgents** | `deepagents-acp` | Adaptateur ACP DeepAgents |
| **Auggie** | `auggie --acp` | Mode ACP Auggie |
| **Kilo** | `kilo acp` | Mode ACP Kilo Code ; injecte `KILO_CONFIG_CONTENT` pour refuser les questions d'autorisation, et l'isolation des chemins XDG principaux a été observée pour la configuration, les données/session/auth/log et l'état de cache |
| **Cline** | `cline --acp` | Mode ACP Cline ; prend en charge l'isolation du répertoire de configuration via `CLINE_DIR` |
| **CodeBuddy** | `codebuddy --acp` | Mode ACP CodeBuddy ; prend en charge l'isolation du répertoire de configuration via `CODEBUDDY_CONFIG_DIR` |
| **Grok** | `grok agent stdio` | Mode stdio Grok Agent ; prend en charge l'isolation home/configuration via `GROK_HOME` |
| **Cursor** | `agent acp` | Entrée ACP native Cursor, distincte de l'adaptateur Cursor Agent ACP ; prend en charge l'isolation du répertoire de configuration via `CURSOR_CONFIG_DIR` |
| **Kimi Code** | `kimi acp` | Mode ACP Kimi Code ; prend en charge l'isolation du répertoire de configuration via `KIMI_CODE_HOME` |
| **MiniMax Code** | `mcode acp` | Mode ACP MiniMax Code ; lorsque npx est activé, l'exécutable `mcode` de `@minimax-ai/code` est explicitement sélectionné, et l'isolation utilise `MINIMAX_DATA_DIR` |
| **Mistral Vibe** | `vibe-acp` | Mode ACP Mistral Vibe ; prend en charge l'isolation home/configuration via `VIBE_HOME` |
| **OpenHands** | `openhands acp` | Mode ACP OpenHands ; l'isolation sépare le stockage de persistance et des conversations via `OPENHANDS_PERSISTENCE_DIR` et `OPENHANDS_CONVERSATIONS_DIR` |
| **DeepSeek Harness** | `dsh --profile acp` | Mode ACP DeepSeek Harness ; prend en charge l'isolation home/configuration via `DSH_HOME` |
| **Factory Droid** | `npx -y droid@latest exec --output-format acp-daemon` | Mode démon ACP Factory Droid ; désactive la mise à jour automatique de Droid via `DROID_DISABLE_AUTO_UPDATE` et `FACTORY_DROID_AUTO_UPDATE_ENABLED` |
| **Goose** | `goose acp` | Mode ACP Goose ; prend en charge l'isolation de la racine des chemins via `GOOSE_PATH_ROOT` |
| **Junie** | `junie --acp=true` | Mode ACP Junie ; prend en charge l'isolation home/configuration via `JUNIE_HOME` |
| **Kiro CLI** | `kiro-cli acp` | Mode ACP Kiro CLI |
| **Pi ACP** | `npx -y pi-acp@latest` | Adaptateur Pi ACP ; nécessite le CLI de l'agent de codage Pi et prend en charge l'isolation du répertoire de configuration via `PI_CODING_AGENT_DIR` |
| **Amp ACP** | `npx -y amp-acp@latest` | Adaptateur Amp ACP ; nécessite le CLI Amp, et l'isolation ne déplace que l'état des fils/sessions de l'adaptateur via `AMP_ACP_STATE_DIR` |
| **Oh My Pi** | `omp acp` | Mode ACP Oh My Pi ; nécessite Bun et n'est proposé que comme commande installée |

Seuls OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code et Hermes Agent ont été testés. La disponibilité des autres backends ACP dépend de leurs implémentations et ce plugin ne la garantit pas. En cas de problème, vous pouvez ajuster vous-même les arguments de commande et les variables d'environnement ; le protocole ACP et la documentation officielle du backend font foi.

Vous pouvez toujours modifier manuellement n'importe quel champ après avoir sélectionné un préréglage.

## Recommandations de configuration des variables d'environnement

Certains agents prennent en charge l'isolation de configuration et la persistance de session via des variables d'environnement ou des arguments de commande. Les préréglages avec **Environnement isolé** activé injectent automatiquement les valeurs documentées ; pour les profils manuels, ajoutez vous-même les valeurs correspondantes :

L'isolation ne déplace que les racines de système de fichiers déclarées. L'isolation Amp ACP ne concerne que l'état des fils/sessions de l'adaptateur, tandis que la configuration et les identifiants Amp restent configurés indépendamment. L'isolation native Cursor concerne le répertoire de configuration de Cursor, distinct du répertoire de session de l'adaptateur `cursor-agent-acp`. Le cache propre de Copilot et le trousseau de Goose restent en dehors des chemins injectés.

Les préréglages OpenCode et Kilo injectent également toujours une configuration d'autorisation en ligne : `OPENCODE_CONFIG_CONTENT` et `KILO_CONFIG_CONTENT` respectivement, tous deux définis sur `{"permission":{"question":"deny"}}`. Vous pouvez modifier ou supprimer ces valeurs après avoir ajouté le préréglage.

<!-- prettier-ignore -->
| Paramètre | Agent | Objectif |
| --- | --- | --- |
| `OPENCODE_CONFIG_DIR` | OpenCode | Spécifier un répertoire de configuration indépendant |
| `CODEX_HOME` | Codex | Spécifier un répertoire home/configuration indépendant |
| `CLAUDE_CONFIG_DIR` | Claude Code | Spécifier un répertoire de configuration indépendant |
| `GEMINI_CLI_HOME` | Gemini CLI | Spécifier un répertoire de configuration indépendant |
| `HERMES_HOME` | Hermes Agent | Spécifier un répertoire home/configuration indépendant |
| `QODER_CONFIG_DIR` | Qoder CLI | Spécifier un répertoire de configuration indépendant |
| `QWEN_HOME` | Qwen Code | Spécifier un répertoire home/configuration indépendant |
| `COPILOT_HOME` | GitHub Copilot | Spécifier un répertoire de configuration indépendant ; le cache propre de Copilot reste en dehors de ce chemin |
| `CLINE_DIR` | Cline | Spécifier un répertoire de configuration indépendant |
| `CODEBUDDY_CONFIG_DIR` | CodeBuddy | Spécifier un répertoire de configuration indépendant |
| `GROK_HOME` | Grok | Spécifier un répertoire home/configuration indépendant |
| `CURSOR_CONFIG_DIR` | Cursor (ACP natif) | Spécifier un répertoire de configuration indépendant |
| `KIMI_CODE_HOME` | Kimi Code | Spécifier un répertoire home/configuration indépendant |
| `MINIMAX_DATA_DIR` | MiniMax Code | Spécifier un répertoire de données indépendant |
| `VIBE_HOME` | Mistral Vibe | Spécifier un répertoire home/configuration indépendant |
| `OPENHANDS_PERSISTENCE_DIR`, `OPENHANDS_CONVERSATIONS_DIR` | OpenHands | Spécifier une racine de persistance indépendante et son stockage de conversations (`<root>/conversations`) |
| `DSH_HOME` | DeepSeek Harness | Spécifier un répertoire home/configuration indépendant |
| `GOOSE_PATH_ROOT` | Goose | Spécifier une racine de chemins indépendante ; le trousseau de Goose reste en dehors de ce chemin |
| `JUNIE_HOME` | Junie | Spécifier un répertoire home/configuration indépendant |
| `PI_CODING_AGENT_DIR` | Pi ACP | Spécifier un répertoire de configuration indépendant de l'agent de codage Pi |
| `AMP_ACP_STATE_DIR` | Amp ACP | Déplacer uniquement l'état des fils/sessions de l'adaptateur ; la configuration et les identifiants Amp restent configurés indépendamment |
| `--session-dir <path>` | Cursor Agent ACP | Spécifier un répertoire de persistance de session indépendant |
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | Kilo | Spécifier des racines XDG indépendantes pour la configuration, les données/session/auth/log et l'état de cache. Cela couvre les chemins principaux observés, mais ne prouve pas que chaque sous-commande ou plugin Kilo évite les répertoires globaux. |

## Options de modèles gratuits

Plusieurs moteurs offrent un **accès gratuit aux modèles** — idéal pour démarrer sans frais :

| Moteur                    | Option gratuite             | Fonctionnement                                                                                                                                                                          |
| ------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kilo Code**             | Mode Auto Free              | Le mode Auto Free intégré de Kilo Code achemine automatiquement chaque requête vers un modèle gratuit approprié. Activez-le dans les paramètres de Kilo Code — aucune clé API requise   |
| **OpenCode Zen**          | Modèles gratuits intégrés   | L'édition [OpenCode Zen](https://opencode.ai/zen) inclut un accès gratuit aux modèles sans abonnement API                                                                               |
| **OpenCode + OpenRouter** | Modèles gratuits OpenRouter | Configurez OpenCode pour utiliser [OpenRouter](https://openrouter.ai/) et sélectionnez des modèles gratuits (ex. Gemini 2.5 Flash, DeepSeek V3). Nécessite un compte OpenRouter gratuit |

### Limitations de l'offre gratuite

Les modèles gratuits suffisent pour un usage occasionnel, mais tenez compte des contraintes suivantes :

| Limitation                    | À quoi s'attendre                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Limitation de débit**       | Les requêtes peuvent être limitées — typiquement 5–20 requêtes par minute selon la charge du fournisseur. Le traitement par lots ralentit considérablement                         |
| **Concurrence**               | Généralement limité à une seule requête simultanée. L'exécution de plusieurs flux de travail en parallèle peut être mise en file d'attente ou échouer                              |
| **Disponibilité des modèles** | Les pools de modèles gratuits peuvent être épuisés aux heures de pointe. Des erreurs « modèle indisponible » ou « capacité dépassée » peuvent survenir                             |
| **Rotation des modèles**      | Les fournisseurs peuvent remplacer silencieusement les modèles gratuits (mise à niveau ou rétrogradation) sans préavis. La qualité de sortie peut varier d'une exécution à l'autre |
| **Aucun SLA / Fiabilité**     | Les offres gratuites ne garantissent aucune disponibilité. Les services peuvent être temporairement indisponibles ou interrompus                                                   |

> Si vous avez besoin d'un traitement par lots fiable ou d'une utilisation en production, envisagez un plan payant comme [OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW) (10 $/mois) ou un Coding Plan (Bailian, Zhipu, etc.). Le coût par article est négligeable par rapport au temps gagné.

## Types de requêtes

Le backend ACP prend en charge deux types de requêtes :

- `acp.prompt.v1` — Interaction conversationnelle (Chat ACP)
- `acp.skill.run.v1` — Exécution de skills (Skills ACP)

Le même backend ACP peut être utilisé simultanément pour les conversations et les exécutions de skills.

## Gestion des sessions

- Chaque backend peut avoir plusieurs sessions (conversations), qui sont stockées de manière persistante dans la base de données du plugin
- Différents backends ACP peuvent fonctionner simultanément sans interférence
- Les sessions peuvent être gérées dans le [Chat ACP](#doc/sidebar%2Facp-chat)

## Prochaines étapes

Une fois la configuration terminée, vous pouvez :

- Discuter avec le backend dans le [Chat ACP de la barre latérale](#doc/sidebar%2Facp-chat)
- Consulter les exécutions de skills ACP dans le [Tableau de bord](#doc/dashboard)
- Utiliser le backend ACP pour exécuter des tâches dans la [Liste des workflows](#doc/workflows%2Findex)
