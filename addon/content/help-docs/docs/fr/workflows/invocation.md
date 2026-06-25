# Invocation et Configuration des Workflows

## Méthodes d'Invocation

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_play.webp" alt="Bouton de la barre d&#39;outils Exécuter un Workflow" title="Bouton de la barre d&#39;outils Exécuter un Workflow" loading="lazy" /><figcaption>Bouton de la barre d&#39;outils Exécuter un Workflow</figcaption></figure>

### Via le Menu Contextuel

1. Sélectionnez une ou plusieurs notices dans la liste des notices de Zotero
2. Faites un clic droit et sélectionnez le sous-menu **Zotero Agents**
3. Choisissez un workflow dans la liste
4. Si une boîte de dialogue de configuration apparaît, renseignez les paramètres et cliquez sur Exécuter

### Via le Tableau de Bord

1. Ouvrez le **Tableau de Bord** (bouton de la barre d'outils ou menu)
2. Recherchez le workflow cible dans la liste des workflows sur la page d'accueil
3. Cliquez sur le bouton **Exécuter**
4. Si une boîte de dialogue de configuration apparaît, renseignez les paramètres et soumettez

## Boîte de Dialogue des Paramètres du Workflow

Avant d'exécuter un workflow, une boîte de dialogue de paramètres peut apparaître avec les options de configuration suivantes :

### Paramètres

Affiche tous les paramètres configurables déclarés par le workflow, variables selon la définition du workflow.

### Options du Fournisseur

| Option | Description |
|------|------|
| Sélection du backend | Choisir l'instance de backend pour exécuter ce workflow |
| Sélection du modèle | Le modèle d'IA à utiliser (fourni par le backend) |
| Paramètres de mode | Configuration du mode d'exécution |
| Effort de Raisonnement | Niveau d'effort de raisonnement (si pris en charge par le backend) |

### Modes d'Exécution

| Mode | Description |
|------|------|
| `auto` | Exécution automatique, aucune intervention utilisateur requise |
| `sync` | Exécution synchrone, attend les résultats |
| `async` | Exécution asynchrone, s'exécute en arrière-plan |

### Modes SkillRunner

Pour les backends Skill-Runner :

| Mode | Description |
|------|------|
| `auto` | Exécution non interactive, adaptée aux compétences ne nécessitant pas de saisie utilisateur |
| `interactive` | Exécution interactive, peut nécessiter une saisie utilisateur pendant l'exécution |

## Exécution et Supervision

- Une fois une tâche soumise, vous pouvez suivre la progression de l'exécution dans le Tableau de Bord
- Mises à jour du statut en temps réel (en file d'attente → en cours → réussi/échoué/annulé)
- Pour les workflows interactifs, vous pouvez répondre aux tâches en attente de saisie dans la barre latérale
- Une fois l'exécution terminée, les résultats sont appliqués à Zotero via les scripts hook

## Remarques

- L'exécution d'un workflow pour la première fois peut nécessiter une configuration du backend
- Certains workflows peuvent avoir des exigences d'entrée spécifiques (par exemple, des pièces jointes doivent être sélectionnées)
- Les workflows interactifs nécessitent que Zotero reste en cours d'exécution pour gérer les saisies utilisateur
