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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP.webp" alt="Page de configuration du backend ACP" title="Page de configuration du backend ACP" loading="lazy" /><figcaption>Page de configuration du backend ACP</figcaption></figure>

### Description des champs

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| **Nom d'affichage** | Oui | Nom d'affichage du backend, utilisé pour l'identifier dans le tableau de bord et la barre latérale |
| **Commande** | Oui | Commande pour démarrer le backend ACP (par exemple, `npx opencode-ai@latest acp`) |
| **Arguments** | Non | Arguments supplémentaires pour la commande, ajoutés un par un via l'éditeur d'arguments |
| **Variables d'environnement** | Non | Variables d'environnement supplémentaires, ajoutées une par une via l'éditeur de variables d'environnement (paires clé-valeur) |

### Préréglages ACP

Il y a un menu déroulant **Ajouter depuis un préréglage** en haut de l'onglet ACP. Après avoir sélectionné un préréglage, le plugin remplit automatiquement la commande et les paramètres courants.

Préréglages intégrés :

| Préréglage | Commande |
|------------|----------|
| **OpenCode** | `npx opencode-ai@latest acp` |
| **Codex** | `npx codex acp` |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` |
| **Gemini CLI** | `npx @google/gemini-cli acp` |
| **Qwen Code** | `qwen-code acp` |

Vous pouvez toujours modifier manuellement n'importe quel champ après avoir sélectionné un préréglage.

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_skillrunner.webp" alt="Page de configuration du backend SkillRunner" title="Page de configuration du backend SkillRunner" loading="lazy" /><figcaption>Page de configuration du backend SkillRunner</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_generic-HTTP.webp" alt="Page de configuration du backend Generic HTTP" title="Page de configuration du backend Generic HTTP" loading="lazy" /><figcaption>Page de configuration du backend Generic HTTP</figcaption></figure>

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

- Utiliser le backend ACP dans le [Chat ACP](#doc/sidebar%2Facp-chat) ou les [Skills ACP](#doc/sidebar%2Facp-skills)
- Gérer les exécutions SkillRunner via l'[Onglet SkillRunner](#doc/sidebar%2Fskillrunner-tab)
- Utiliser les backends configurés pour exécuter des tâches dans la [Liste des workflows](#doc/workflows%2Findex) et le [Tableau de bord](#doc/dashboard)
