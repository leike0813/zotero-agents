# Aperçu de la configuration des backends

Zotero Agents prend en charge trois types de backends, chacun adapté à différents cas d'utilisation.

## Comment choisir

### 🥇 Premier choix : Backend ACP

Si vous avez déjà un outil d'agent compatible ACP installé sur votre machine (Codex, Claude Code, OpenCode, Hermes Agent, OpenClaw, Qwen Code, etc.), vous pouvez utiliser directement le backend ACP. **Aucune charge de configuration supplémentaire** — sélectionnez simplement l'agent correspondant dans la liste des préréglages du gestionnaire de backends, et le plugin gère automatiquement le cycle de vie du processus.

Certains agents (tels qu'OpenCode et Codex) prennent également en charge l'isolation des répertoires de configuration et des répertoires de persistance de session via des variables d'environnement, facilitant la gestion de plusieurs contextes de travail.

→ [Configuration du backend ACP](#doc/backends%2Facp)

### 🥈 Deuxième choix : Skill-Runner déployé avec Docker

Si vous avez besoin d'une **exécution persistante en arrière-plan** (les tâches continuent de s'exécuter après la fermeture de Zotero, et vous pouvez reprendre ou récupérer les résultats au prochain lancement), ou si vous avez la capacité de configurer un serveur sur votre réseau local, il est recommandé de déployer Skill-Runner avec Docker en tant que service persistant.

Un Skill-Runner déployé avec Docker fonctionne indépendamment de Zotero et prend en charge le partage multi-utilisateurs, une interface Web de gestion, la gestion des moteurs, et plus encore.

→ [Déploiement et configuration du Skill-Runner](#doc/backends%2Fskill-runner)

### 🥉 En dépannage uniquement : Déploiement local Skill-Runner en un clic

Ce mode convient uniquement aux utilisateurs qui **n'ont aucune connaissance de l'installation et de la configuration des outils d'agents et ne peuvent pas utiliser Docker**. Le déploiement en un clic démarre et s'arrête avec le plugin — fermer Zotero met fin à toutes les tâches, et il n'y a pas d'exécution en arrière-plan. Si vous êtes capable d'installer des agents ou d'utiliser Docker, veuillez préférer les deux options ci-dessus.

→ [Déploiement et configuration du Skill-Runner](#doc/backends%2Fskill-runner)

### Generic HTTP

Utilisé pour appeler des API HTTP spécifiques (telles que le service d'analyse de documents MinerU) qui n'impliquent pas l'exécution de modèles IA. Configurez selon vos besoins.

→ [Configuration du backend Generic HTTP](#doc/backends%2Fgeneric-http)

## Comparaison des types de backends

| Type | Protocole | Mode d'exécution | Recommandation | Cas d'utilisation |
|------|-----------|-----------------|----------------|-------------------|
| **Backend ACP** | Agent Client Protocol | Sous-processus local | 🥇 Premier choix | Vous avez un outil d'agent ACP, aucune configuration supplémentaire |
| **Skill-Runner (Docker)** | HTTP API | Service persistant | 🥈 Recommandé | Besoin d'exécution persistante en arrière-plan, partage LAN |
| **Skill-Runner (en un clic)** | HTTP API | Démarre/s'arrête avec le plugin | 🥉 Dépannage | Impossible d'installer des agents / Docker |
| **Generic HTTP** | HTTP | Service distant | Selon les besoins | Appel d'API HTTP spécifiques (par exemple, MinerU) |

Tous les backends sont configurés via **[Outils → Gestionnaire de backends](#doc/backends%2Fbackend-manager)**.

## Prochaines étapes

- [Configuration du backend ACP](#doc/backends%2Facp)
- [Déploiement et configuration du Skill-Runner](#doc/backends%2Fskill-runner)
- [Configuration du backend Generic HTTP](#doc/backends%2Fgeneric-http)
- [Guide d'utilisation du gestionnaire de backends](#doc/backends%2Fbackend-manager)
