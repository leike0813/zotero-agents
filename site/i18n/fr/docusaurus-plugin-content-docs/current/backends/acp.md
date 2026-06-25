# Configuration du backend ACP

## Qu'est-ce que l'ACP ?

ACP (Agent Client Protocol) est un protocole de communication avec les backends d'agents. Zotero Agents communique avec des processus d'agents exécutés localement (tels que Codex, Claude Code, OpenCode, etc.) via le protocole ACP pour permettre des conversations et l'exécution de skills.

Le backend ACP est la méthode de configuration **recommandée** — tant que vous avez un outil d'agent compatible ACP installé sur votre machine, vous pouvez l'utiliser directement sans aucune configuration supplémentaire.

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

Le plugin fournit plusieurs préréglages intégrés que vous pouvez sélectionner directement depuis le menu déroulant **Ajouter depuis un préréglage** :

| Préréglage | Commande | Description |
|------------|----------|-------------|
| **Codex** | `npx codex acp` | Agent de codage officiel d'OpenAI |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` | CLI officiel d'Anthropic |
| **OpenCode** | `npx opencode-ai@latest acp` | Framework d'agent polyvalent avec prise en charge de l'isolation par variables d'environnement |
| **Gemini CLI** | `npx @google/gemini-cli acp` | Google Gemini |
| **Hermes** | `npx hermes acp` | Hermes Agent |
| **Qwen Code** | `qwen-code acp` | Qwen Code |

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
