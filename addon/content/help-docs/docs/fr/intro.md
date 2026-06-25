# Zotero Agents

Un plugin Zotero pour exécuter des skills d'agents.

<figure class="zs-doc-figure zs-doc-figure--poster"><img src="chrome://zotero-skills/content/help-docs/assets/img/poster.webp" alt="Affiche de l&#39;atelier de recherche Zotero Agents" title="Affiche de l&#39;atelier de recherche Zotero Agents" loading="lazy" /><figcaption>Affiche de l&#39;atelier de recherche Zotero Agents</figcaption></figure>

## Qu'est-ce que Zotero Agents ?

Zotero Agents transforme Zotero en un plan de travail personnel pour la recherche à l'ère des agents intelligents. Il connecte votre bibliothèque de littérature, vos backends d'agents, vos workflows, vos graphes de connaissances et vos outils externes, faisant passer l'analyse littéraire d'un simple question-réponse ponctuel à un processus de recherche durable, auditable et extensible.

Le premier niveau de fonctionnalité repose sur les **workflows enfichables**. Les chercheurs peuvent décomposer les tâches littéraires complexes en processus réutilisables : analyse d'articles, lecture approfondie, analyse des citations, normalisation des balises, recherche bibliographique, synthèse de sujets, génération de documents de revue, et bien plus encore. Les workflows peuvent se connecter à différents backends d'agents ou de services, en tirant parti de la compréhension de contexte étendu, de l'appel d'outils et du raisonnement multi-étapes des agents pour automatiser les flux de travail de gestion et d'analyse littéraires qui, autrement, nécessiteraient des opérations manuelles répétitives, et pour s'étendre au fur et à mesure que les besoins de recherche évoluent.

Le deuxième niveau est la **barre latérale d'assistance**. Elle offre une expérience d'interaction conversationnelle de type agent de codage, prenant en charge la connexion à divers backends d'agents via le protocole ACP, ainsi que l'exécution de workflows spécifiques via le backend Skill-Runner. Vous pouvez demander aux agents de répondre à des questions, d'analyser des articles, de rechercher des travaux connexes, d'ajouter des références à votre bibliothèque en fonction de la notice en cours, de la littérature sélectionnée ou de l'ensemble de la bibliothèque, et de poursuivre les conversations, les confirmations, les corrections et le suivi de la progression des tâches de longue durée.

Le troisième niveau est le **Synthesis Workbench**. Il cible la construction de connaissances à long terme au niveau de la bibliothèque, en consolidant les résumés, les références, les sémantiques de citations, les balises, les concepts et les relations entre sujets générés à partir des analyses d'articles individuels en une plateforme de connaissances unifiée. Les chercheurs peuvent y gérer des réseaux de références, examiner les correspondances de citations, explorer des graphes de citations, organiser la littérature autour de sujets, et utiliser la synthèse de sujets pour structurer la littérature fondamentale, les travaux de pointe, les arguments clés, les divergences méthodologiques, les lacunes de couverture et les orientations futures d'un domaine de recherche. Son objectif est de transformer une lecture approfondie en un matériel structuré adapté aux revues, aux propositions de thèse, aux introductions d'articles et à la conception de feuilles de route de recherche.

Le quatrième niveau est le **Host Bridge**. Grâce au CLI `zotero-bridge` et au service MCP, les agents externes peuvent interagir directement avec la bibliothèque Zotero : lire le contenu des documents, rechercher des notices, ajouter de nouvelles références, invoquer des tâches d'analyse et écrire des résultats structurés. Avec des workflows d'agents comme OpenClaw et Hermes, vous pouvez déléguer la recherche, le filtrage, l'analyse, la synthèse et la rédaction de revues, permettant aux tâches de recherche de longue durée de progresser continuellement en arrière-plan.

La valeur fondamentale de Zotero Agents est de faire de la bibliothèque Zotero un environnement de recherche où les agents peuvent véritablement travailler. Chaque étape de lecture, d'analyse, de révision et de préparation de la rédaction peut être accumulée comme connaissance pour la phase suivante de la recherche.

> **Versions de Zotero prises en charge** : Ce plugin prend en charge Zotero 7 et Zotero 9. Le développement principal et les tests sont effectués sur Zotero 9. Zotero 8 est théoriquement entièrement pris en charge (le framework du plugin est identique entre les versions 8/9). Zotero 7 devrait également fonctionner en théorie mais n'a pas été testé en profondeur ; la maintenance future se concentrera sur Zotero 9. Les utilisateurs de Zotero 7 rencontrant des problèmes doivent les signaler sur [Issues](https://github.com/leike0813/zotero-agents/issues).

:::tip Astuce
Le plugin est livré **sans aucune logique métier intégrée**. Tous les workflows sont fournis via des **packages de workflows officiels** séparés que les utilisateurs doivent télécharger et installer après l'installation du plugin. Consultez le [Guide d'installation](#doc/installation) pour plus de détails.
:::

## Fonctionnalités

- **⚙️ Gestion des backends** — Prend en charge les types de backend ACP, Skill-Runner et Generic HTTP
- **🔧 Système de workflows** — Définissez des pipelines de traitement automatisé multi-étapes
- **📊 Tableau de bord** — Surveillez le statut des tâches, parcourez l'historique et inspectez les journaux
- **🖥️ Panneau latéral** — Interagissez avec les backends sans quitter votre contexte de travail
- **📖 Lecteur Markdown intégré** — Double-cliquez sur les pièces jointes `.md` pour les ouvrir dans Zotero, avec plan, recherche, rendu mathématique et coloration syntaxique du code
- **💬 Chat ACP** — Conversation IA avec la littérature comme contexte
- **🔬 Synthesis Workbench** — Plateforme d'analyse littéraire approfondie
- **🏷️ Gestion des balises** — Vocabulaire de balises contrôlé et balisage automatique
- **📈 Graphe de citations** — Visualisation et analyse des relations de citation
- **📝 Synthèse de sujets** — Analyse automatisée de sujets et génération de rapports

## Liens rapides

- [Guide d'installation](#doc/installation) — Installer le plugin et ses dépendances
- [Premiers pas](#doc/getting-started) — Configurer votre premier backend et exécuter un skill
- [Configuration des backends](#doc/backends%2Findex) — Découvrir les trois types de backend pris en charge

## Documentation

| Section | Description |
|---------|-------------|
| [Guide d'installation](#doc/installation) | Installation du plugin, installation des packages de workflows officiels, déploiement du backend Skill-Runner |
| [Lecteur Markdown intégré](#doc/markdown-reader) | Double-cliquez sur les fichiers `.md` pour les ouvrir dans Zotero, avec plan, recherche et rendu mathématique |
| [Configuration des backends](#doc/backends%2Findex) | Guide de configuration pour les backends ACP, Skill-Runner et Generic HTTP |
| [Workflow](#doc/workflows%2Findex) | Introduction aux workflows et guide d'utilisation |
| [Tableau de bord](#doc/dashboard) | Guide d'utilisation du panneau de monitoring central |
| [Barre latérale et Chat ACP](#doc/sidebar%2Findex) | Panneau latéral et fonctionnalités de conversation |
| [Synthesis Workbench](#doc/synthesis%2Findex) | Guide d'utilisation du banc de synthèse |
| [Préférences](#doc/preferences) | Référence des paramètres du plugin |

## Ressources du projet

- [Dépôt GitHub](https://github.com/leike0813/zotero-agents)
- [Suivi des problèmes](https://github.com/leike0813/zotero-agents/issues)
- [Miroir Gitee](https://gitee.com/leike0813/zotero-agents)
