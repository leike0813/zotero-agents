# Interactive Literature Explainer

## Objectif

Engager un dialogue multi-tours avec l'IA pour comprendre en profondeur le contenu littéraire. Prend en charge les questions-réponses libres ancrées dans le contexte littéraire, et génère automatiquement des notes d'étude structurées à la fin de la conversation.

:::tip Pas besoin de s'inquiéter des hallucinations
Les réponses de l'IA doivent passer par une **porte de vérification**. Les réponses comportant de l'incertitude sont explicitement signalées, vous pouvez donc discuter en toute confiance des détails de l'article avec l'IA.
:::

## Cas d'Usage

- Rencontrer des concepts ou une terminologie que vous ne comprenez pas en lisant un article
- Vouloir approfondir une partie spécifique de l'article (méthodes, expériences, démonstrations)
- Travailler avec l'IA pour retracer le raisonnement et les contributions de l'article

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | Pièce jointe |
| Types Acceptés | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Limite par parent | Au maximum 1 pièce jointe |

### Méthodes de Déclenchement

- Sélectionner directement une pièce jointe PDF ou Markdown
- Sélectionner la notice parente, et le plugin déploiera automatiquement sa première pièce jointe éligible

## Flux d'Exécution

```
1. Construire la Requête
   └── Téléverser le fichier source vers Skill-Runner
       └── Invoquer skill_id: "literature-explainer"

2. Traitement Skill-Runner
   └── Lancer le mode interactif
       └── Ouvrir le panneau de chat du Tableau de Bord

3. Interaction Utilisateur
   └── Converser avec l'IA dans le Tableau de Bord des Tâches
       └── Envoyer des messages, voir les réponses

4. Fin de la Conversation
   └── L'utilisateur ferme ou annule manuellement
       └── Générer les résultats de la conversation
```

### Flux d'Interaction

1. Après le démarrage du workflow, le Tableau de Bord des Tâches ouvre automatiquement le panneau de chat
2. Saisissez des questions ou des instructions dans la zone de chat
3. Les réponses de l'IA s'affichent en temps réel dans le panneau
4. La conversation peut se poursuivre jusqu'à ce que l'utilisateur choisisse d'y mettre fin
5. La fermeture du panneau déclenche le traitement des résultats

## Durée Estimée

Dépend du nombre de tours de conversation. Le chargement de la littérature et l'initialisation prennent environ 1-2 minutes, après quoi la conversation se déroule en temps réel.

## Recommandation de Modèle

🟡 Des modèles avec une **capacité de recherche web** sont recommandés. Literature Explainer dispose d'un mécanisme intégré de vérification des preuves — si le modèle peut rechercher sur le web pour vérifier les citations et les faits de l'article, la qualité de la vérification s'améliore significativement. Lorsque l'accès au web n'est pas disponible, la fonctionnalité de vérification est fortement limitée, mais le raisonnement et les questions-réponses basés sur le contenu littéraire restent possibles.

## Sorties

Une fois l'exécution terminée, **1 Note d'Étude (Note de Conversation)** est créée sous la notice parente :

- Type : `data-zs-note-kind="conversation"`
- Contenu : Historique des questions-réponses (format HTML), qui peut être conservé comme notes d'étude
- Stratégie de mise à jour : Chaque exécution crée une nouvelle note de conversation (plutôt que d'écraser)

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-explainer_note.webp" alt="Note d&#39;Étude de Literature Explainer" title="Note d&#39;Étude de Literature Explainer" loading="lazy" /><figcaption>Note d&#39;Étude de Literature Explainer</figcaption></figure>

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `language` | string | Langue de conversation | `zh-CN` |

Valeurs disponibles : `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Une saisie personnalisée est également prise en charge.

## Dépendances

- **Backend** : Service Skill-Runner
- **Configuration du Backend** : Configurer un backend de type Skill-Runner dans le Gestionnaire de Backends
- **Compétence** : La compétence `literature-explainer` doit être déployée sur le Skill-Runner

## Workflows Associés

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Générer automatiquement des résumés littéraires (recommandé d'exécuter en premier)
- [Deep Reading](#doc/workflows%2Fliterature-deep-reading) — Générer une vue structurée de lecture approfondie
