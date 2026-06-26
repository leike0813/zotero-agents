# Premiers pas

## 1. Installer les packages de workflows officiels

Le plugin lui-même ne contient aucune logique métier. Après avoir installé le plugin, vous devez d'abord installer les packages de workflows officiels :

1. Faites un clic droit sur n'importe quelle notice Zotero → **Zotero Agents** → **📦 Installer les packages de workflows officiels**
2. Attendez que le téléchargement et l'installation soient terminés
3. Après une installation réussie, tous les workflows officiels seront visibles dans le tableau de bord

Vous pouvez également installer ou mettre à jour les packages officiels à tout moment depuis **Zotero → Paramètres → Zotero Agents**.

## 2. Configurer un backend

### Backend ACP (recommandé)

C'est l'approche la plus recommandée — tant que vous avez un outil d'agent compatible ACP installé sur votre machine, cela ne nécessite aucune configuration supplémentaire.

1. Ouvrez **Outils → [Gestionnaire de backends](#doc/backends%2Fbackend-manager)**
2. Basculez sur l'onglet **ACP**
3. Sélectionnez votre outil d'agent dans le menu déroulant **Ajouter depuis un préréglage** (Codex / OpenCode / Claude Code, etc.)
4. Le préréglage remplit automatiquement la commande ; cliquez sur **Enregistrer** dans le coin inférieur droit

**Première utilisation d'un outil d'agent ?** Consultez la documentation officielle de l'outil correspondant pour l'installation :

| Agent | Guide d'installation |
|-------|---------------------|
| **OpenCode** | [Documentation opencode.ai](https://opencode.ai/docs) |
| **Codex** | [Documentation OpenAI Codex](https://platform.openai.com/docs) |
| **Claude Code** | [Documentation Anthropic](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Documentation Google](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [Documentation Alibaba Cloud](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ Voir [Configuration du backend ACP](#doc/backends%2Facp) pour plus de détails

### Backend MinerU (pour l'analyse de PDF)

Le workflow MinerU peut convertir des PDF en Markdown, ce qui en fait une étape de prétraitement idéale pour toute analyse littéraire ultérieure. La configuration est simple :

1. Visitez [mineru.net](https://mineru.net) pour créer un compte, et obtenez un jeton API depuis **API → API Management**
2. Ouvrez **Outils → [Gestionnaire de backends](#doc/backends%2Fbackend-manager)**
3. Basculez sur l'onglet **Generic HTTP**, cliquez sur **Ajouter Generic HTTP**
4. Remplissez : Nom d'affichage `MinerU Official` · URL de base `https://mineru.net` · Authentification `bearer` · Jeton d'authentification : collez votre jeton API · Délai d'attente `600000`
5. Cliquez sur **Enregistrer** dans le coin inférieur droit

→ Voir [Guide d'utilisation de MinerU](#doc/workflows%2Fmineru) pour plus de détails

### Alternative : Skill-Runner déployé avec Docker

Si vous avez besoin d'une exécution persistante en arrière-plan ou d'un partage sur le réseau local, vous pouvez [déployer Skill-Runner avec Docker](#doc/backends%2Fskill-runner#recommended-docker-persistent-deployment). Après le déploiement, ajoutez une instance de backend dans l'onglet SkillRunner.

> Pour les instructions détaillées, voir [Gestionnaire de backends](#doc/backends%2Fbackend-manager).

## 3. Workflow complet

Voici un workflow complet de bout en bout. Il est recommandé d'essayer chaque étape dans l'ordre. Commencez par sélectionner un article avec une pièce jointe PDF dans votre bibliothèque.

### Étape 1 : PDF → Markdown (MinerU)

Faites un clic droit sur cet article (ou directement sur sa pièce jointe PDF), et sélectionnez **Zotero Agents → MinerU**. Après un court instant, un fichier `.md` du contenu de l'article sera généré dans le même répertoire que le PDF.

### Étape 2 : Essayer le lecteur Markdown intégré

Trouvez le fichier `.md` nouvellement généré dans la liste des pièces jointes de Zotero et **double-cliquez pour l'ouvrir dans le lecteur intégré** — avec navigation par le plan, recherche, rendu des formules mathématiques et coloration syntaxique du code. Si vous préférez ne pas utiliser le lecteur intégré, vous pouvez le désactiver dans les Préférences et revenir à l'ouverture par défaut du système.

→ Voir [Lecteur Markdown intégré](#doc/markdown-reader) pour plus de détails

### Étape 3 : Exécuter l'analyse littéraire

Faites un clic droit sur cet article (ou directement sur la pièce jointe `.md`), et sélectionnez **Zotero Agents → Literature Analysis**. L'agent générera automatiquement trois artefacts ; une fois terminé, trois notes de pièces jointes apparaîtront sous la notice :

| Note | Contenu |
|------|---------|
| **Digest** | Résumé de l'article — contexte de recherche, méthodes, résultats et conclusions |
| **References** | Références structurées — une liste de citations sous forme de tableau |
| **Citation Analysis** | Rapport d'analyse des citations — contexte de citation et classification des intentions de citation |

→ Voir [Literature Analysis](#doc/workflows%2Fliterature-analysis) pour plus de détails

### Étape 4 : Literature Explainer interactif

Si vous avez des questions sur cet article, faites un clic droit et sélectionnez **Zotero Agents → Literature Explainer**. La barre latérale ouvrira automatiquement le panneau de chat, où vous pourrez converser librement avec l'agent sur le contenu de l'article. Les réponses de l'agent passent par une passerelle de vérification, vous n'avez donc pas à vous soucier des fabrications. Après la conversation, l'enregistrement des questions-réponses sera généré sous forme de notes d'étude.

→ Voir [Literature Explainer](#doc/workflows%2Fliterature-explainer) pour plus de détails

### Étape 5 : Lecture approfondie

Lorsque vous avez besoin de lire de manière approfondie et systématique un article important, faites un clic droit et sélectionnez **Zotero Agents → Deep Reading**. L'agent produira un document HTML autonome et soigné — incluant l'analyse des sections, les concepts clés, les références et les traductions bilingues. Enrichi des informations de votre bibliothèque (si disponibles), ce document portera également le contexte de recherche plus large, les concepts connexes et les questions clés.

→ Voir [Lecture approfondie](#doc/workflows%2Fliterature-deep-reading) pour plus de détails

### Étape 6 : Synthèse de sujets — Des articles individuels à la vue d'ensemble

Une fois que votre bibliothèque a atteint une certaine taille et que les articles pertinents ont tous subi une analyse littéraire et une normalisation des balises, vous pouvez créer une synthèse de sujets.

Exécutez **Créer une synthèse de sujets** depuis le tableau de bord, entrez une description de votre direction de recherche, et l'agent identifiera automatiquement les articles pertinents dans votre bibliothèque et générera un rapport de synthèse extrêmement rigoureux, précis et complet. Ce rapport est entièrement rédigé à partir du contenu de votre bibliothèque, bien plus précis et fiable que les réponses IA génériques.

→ Voir [Synthèse de sujets](#doc/workflows%2Ftopic-synthesis) pour plus de détails

## Prochaines étapes

- **Traitement par lots** : Exécutez [Literature Analysis](#doc/workflows%2Fliterature-analysis) en masse sur les articles de votre bibliothèque pour construire les fondations de la synthèse
- **Système de balises** : Utilisez [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) pour créer un vocabulaire contrôlé et standardiser vos métadonnées
- **Exploration du graphe** : Visualisez votre réseau de citations dans le [Synthesis Workbench](#doc/synthesis%2Findex)
- **Développement personnalisé** : Consultez [Workflows personnalisés](#doc/workflows%2Fcustom%2Findex) pour créer vos propres workflows
- **Signaler des problèmes** : Signalez les problèmes sur [GitHub](https://github.com/leike0813/zotero-agents/issues) ou [Gitee](https://gitee.com/leike0813/zotero-agents/issues)
