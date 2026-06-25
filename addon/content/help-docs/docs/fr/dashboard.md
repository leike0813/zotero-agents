# Tableau de bord

## Aperçu

Le tableau de bord est le panneau central de surveillance et de contrôle de Zotero Agents. Vous pouvez y consulter le statut des tâches, gérer les workflows, parcourir l'historique et inspecter les journaux d'exécution.

## Comment l'ouvrir

- **Bouton de la barre d'outils** : Cliquez sur l'icône Zotero Agents dans la barre d'outils de Zotero
- **Menu** : **Outils → Ouvrir le tableau de bord**
- **Onglet Zotero** : Ouvert via le menu, affiché comme un onglet indépendant de Zotero

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_workbench.webp" alt="Bouton du tableau de bord Zotero Agents dans la barre d&#39;outils" title="Bouton du tableau de bord Zotero Agents dans la barre d&#39;outils" loading="lazy" /><figcaption>Bouton du tableau de bord Zotero Agents dans la barre d&#39;outils</figcaption></figure>

## Pages

### Accueil

La page par défaut du tableau de bord, affichant :

- **Liste des workflows** : Tous les workflows disponibles, avec des boutons d'exécution et de paramètres
- **Zone de chat ACP** : Accès rapide aux conversations ACP
- **Exécutions de skills ACP** : Statut des exécutions de skills pour les backends ACP
- **Retours sur les skills** : Consulter les évaluations et commentaires récents des exécutions de skills
- **Résumé des tâches** : Vue d'ensemble des tâches en cours d'exécution

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_home.webp" alt="Accueil du tableau de bord" title="Accueil du tableau de bord" loading="lazy" /><figcaption>Accueil du tableau de bord</figcaption></figure>

### Options des workflows

La page de paramètres des workflows :

- Consulter et modifier la configuration de chaque workflow
- Définir les paramètres par défaut
- Sélectionner le backend par défaut

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_workflow-settings.webp" alt="Page des options de workflow du tableau de bord" title="Page des options de workflow du tableau de bord" loading="lazy" /><figcaption>Page des options de workflow du tableau de bord</figcaption></figure>

### Backends

La page de gestion des backends :

- Liste de tous les backends configurés
- Historique des tâches pour chaque backend
- Vues détaillées des backends (varie selon le type)

Vues détaillées des backends :

| Type de backend | Affichage |
|-----------------|-----------|
| Generic HTTP | Tableau des tâches + journaux d'exécution |
| SkillRunner | Tableau des exécutions + zone de statut + zone de conversation + actions de réponse/annulation |
| ACP | Vue des exécutions de skills |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_acp-backend.webp" alt="Liste des tâches du backend ACP dans le tableau de bord" title="Liste des tâches du backend ACP dans le tableau de bord" loading="lazy" /><figcaption>Liste des tâches du backend ACP dans le tableau de bord</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skillrunner-backend.webp" alt="Liste des tâches du backend SkillRunner dans le tableau de bord" title="Liste des tâches du backend SkillRunner dans le tableau de bord" loading="lazy" /><figcaption>Liste des tâches du backend SkillRunner dans le tableau de bord</figcaption></figure>

### Produits

Parcourir et gérer les produits des workflows :

- Consulter les artefacts de sortie des exécutions de workflows
- Ouvrir les dossiers de produits
- Prévisualiser et supprimer des produits

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_products.webp" alt="Stockage des produits du tableau de bord" title="Stockage des produits du tableau de bord" loading="lazy" /><figcaption>Stockage des produits du tableau de bord</figcaption></figure>

## Retours sur les skills

Le panneau de retours sur les skills affiche les retours récents des exécutions de skills :

| Colonne | Description |
|---------|-------------|
| Workflow | Nom du workflow exécuté |
| Backend | Le backend qui a exécuté la tâche |
| Évaluation | Note de l'utilisateur (1–5) |
| Commentaire | Commentaire de retour |
| Horodatage | Moment où le retour a été soumis |

Actions :
- **Filtrer** : Filtrer par note, workflow ou plage de temps
- **Exporter** : Exporter les données de retour pour analyse

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skill-feedback.webp" alt="Stockage des retours sur les skills du tableau de bord" title="Stockage des retours sur les skills du tableau de bord" loading="lazy" /><figcaption>Stockage des retours sur les skills du tableau de bord</figcaption></figure>

## Statut des tâches

| Statut | Description |
|--------|-------------|
| `queued` | En attente d'exécution |
| `running` | En cours d'exécution |
| `waiting_user` | En attente de saisie utilisateur |
| `waiting_auth` | En attente d'autorisation |
| `succeeded` | Exécution réussie |
| `failed` | Exécution échouée |
| `canceled` | Annulée |

## Visionneuse de journaux d'exécution

Le tableau de bord inclut une visionneuse de journaux intégrée :

- Filtrer par backend
- Filtrer par workflow
- Filtrer par niveau de journal
- Filtrer par plage de temps
- Export de diagnostic
- Copie du résumé des problèmes

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_logs.webp" alt="Visionneuse de journaux d&#39;exécution du tableau de bord" title="Visionneuse de journaux d&#39;exécution du tableau de bord" loading="lazy" /><figcaption>Visionneuse de journaux d&#39;exécution du tableau de bord</figcaption></figure>

## Bouton de la barre d'outils

Le bouton d'icône Zotero Agents dans la barre d'outils de Zotero prend en charge :

- Clic gauche : Ouvrir/basculer le tableau de bord
- Affiche le nombre de tâches en cours d'exécution
- Affiche une fenêtre contextuelle avec la liste des tâches en cours
