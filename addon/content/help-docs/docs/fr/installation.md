# Guide d'installation

## Configuration requise

- **Zotero** : 7.0 ou ultérieur (Zotero 9 recommandé)
- **Plateforme** : Windows 10+, macOS 12+, Linux (x86_64 / x86 / ARM64 / ARM)

> **À propos des versions de Zotero** : Ce plugin est développé et testé sur Zotero 9. Zotero 8 est théoriquement entièrement pris en charge (le framework du plugin n'a pas de changements significatifs entre Zotero 8/9) ; Zotero 7 devrait également être pris en charge en théorie mais n'a pas été testé en profondeur en raison de ressources limitées. La maintenance future se concentrera sur Zotero 9. Si vous rencontrez des problèmes sur Zotero 7, veuillez les signaler sur [Issues](https://github.com/leike0813/zotero-agents/issues).

## Installation du plugin

### Depuis GitHub/Gitee Release (recommandé)

1. Visitez [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) ou [Gitee Releases Mirror](https://gitee.com/leike0813/zotero-agents/releases)
2. Téléchargez le dernier fichier `.xpi`
3. Dans Zotero, ouvrez **Outils → Modules complémentaires**
4. Cliquez sur l'icône d'engrenage et sélectionlez **Installer un module complémentaire depuis un fichier…**
5. Sélectionnez le fichier `.xpi` téléchargé

### Compilation depuis les sources

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

Le résultat de la compilation se trouve dans le répertoire `.scaffold/build/`.

## Installation des packages de workflows officiels

Le plugin est livré **sans aucune logique métier intégrée**. Tous les workflows sont fournis via des packages de workflows officiels séparés.

### Méthode 1 : Installation par le menu (recommandé)

1. Après avoir redémarré Zotero, faites un clic droit sur n'importe quelle notice → **Zotero Agents** → **📦 Installer les packages de workflows officiels**
2. Le plugin télécharge automatiquement les derniers packages officiels depuis GitHub / Gitee
3. Une notification de succès apparaît une fois l'opération terminée ; tous les workflows officiels seront alors visibles dans le tableau de bord

### Méthode 2 : Installation depuis les Préférences

1. Ouvrez **Zotero → Paramètres → Zotero Agents**
2. Dans la section **Paramètres des workflows**, cliquez sur **Installer les packages de workflows officiels**
3. Vous pouvez également changer de canal de mise à jour (stable / beta / dev) ici et vérifier les mises à jour

### Mécanisme de mise à jour

- Le plugin vérifie automatiquement les nouvelles versions des packages officiels au démarrage
- Une boîte de dialogue de confirmation apparaît lorsqu'une nouvelle version est disponible
- La liste des workflows est automatiquement rechargée après la mise à jour

Dépôt des packages de workflows officiels : [GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Miroir Gitee](https://gitee.com/leike0813/zotero-agents-workflows)

## Vérification de l'installation

1. Redémarrez Zotero
2. Vous devriez voir l'icône **Zotero Agents** dans la barre d'outils de Zotero
3. Faites un clic droit sur n'importe quelle notice — le sous-menu **Zotero Agents** devrait apparaître (avec les workflows disponibles)

Si le menu contextuel n'affiche qu'une option **📦 Installer les packages de workflows officiels**, les packages officiels n'ont pas encore été installés — suivez les instructions ci-dessus pour les installer. Après une installation réussie, rendez-vous sur [Premiers pas](#doc/getting-started) pour configurer un backend et exécuter votre premier workflow.
