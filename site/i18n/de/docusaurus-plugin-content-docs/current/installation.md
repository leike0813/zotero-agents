# Installationsleitfaden

## Systemanforderungen

- **Zotero**: 7.0 oder höher (Zotero 9 empfohlen)
- **Plattform**: Windows 10+, macOS 12+, Linux (x86_64 / x86 / ARM64 / ARM)

> **Zu den Zotero-Versionen**: Dieses Plugin wird auf Zotero 9 entwickelt und getestet. Zotero 8 wird theoretisch vollständig unterstützt (das Plugin-Framework weist zwischen Zotero 8/9 keine wesentlichen Änderungen auf); Zotero 7 sollte ebenfalls theoretisch unterstützt werden, wurde jedoch aufgrund begrenzter Ressourcen nicht gründlich getestet. Die zukünftige Wartung wird sich auf Zotero 9 konzentrieren. Wenn Sie unter Zotero 7 auf Probleme stoßen, melden Sie diese bitte auf [Issues](https://github.com/leike0813/zotero-agents/issues).

## Installation des Plugins

### Über GitHub/Gitee Release (empfohlen)

1. Besuchen Sie [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) oder [Gitee Releases Mirror](https://gitee.com/leike0813/zotero-agents/releases)
2. Laden Sie die neueste `.xpi`-Datei herunter
3. Öffnen Sie in Zotero **Extras → Add-ons**
4. Klicken Sie auf das Zahnradsymbol und wählen Sie **Add-on aus Datei installieren...**
5. Wählen Sie die heruntergeladene `.xpi`-Datei aus

### Aus dem Quellcode kompilieren

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

Das Build-Ergebnis befindet sich im Verzeichnis `.scaffold/build/`.

## Installation offizieller Workflow-Pakete

Das Plugin wird **ohne integrierte Geschäftslogik** ausgeliefert. Alle Workflows werden über separate offizielle Workflow-Pakete bereitgestellt.

### Methode 1: Menüinstallation (empfohlen)

1. Starten Sie Zotero neu, klicken Sie mit der rechten Maustaste auf einen beliebigen Eintrag → **Zotero Agents** → **📦 Install Official Workflow Packages**
2. Das Plugin lädt automatisch die neuesten offiziellen Pakete von GitHub / Gitee herunter
3. Nach Abschluss wird eine Erfolgsmeldung angezeigt; alle offiziellen Workflows sind dann im Dashboard sichtbar

### Methode 2: Installation über die Einstellungen

1. Öffnen Sie **Zotero → Einstellungen → Zotero Agents**
2. Klicken Sie im Bereich **Workflow-Einstellungen** auf **Install Official Workflow Packages**
3. Hier können Sie auch den Update-Kanal (stable / beta / dev) wechseln und nach Updates suchen

### Update-Mechanismus

- Das Plugin sucht beim Start automatisch nach neuen Versionen der offiziellen Pakete
- Bei Verfügbarkeit einer neuen Version erscheint ein Bestätigungsdialog
- Nach dem Update wird die Workflow-Liste automatisch neu geladen

Offizielles Workflow-Paket-Repository: [GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Gitee-Mirror](https://gitee.com/leike0813/zotero-agents-workflows)

## Überprüfung der Installation

1. Starten Sie Zotero neu
2. Sie sollten das **Zotero Agents**-Symbol in der Zotero-Werkzeugleiste sehen
3. Klicken Sie mit der rechten Maustaste auf einen beliebigen Eintrag — das **Zotero Agents**-Untermenü sollte erscheinen (mit verfügbaren Workflows)

Wenn das Kontextmenü nur die Option **📦 Install Official Workflow Packages** anzeigt, wurden die offiziellen Pakete noch nicht installiert — folgen Sie den obigen Anweisungen, um sie zu installieren. Nach erfolgreicher Installation fahren Sie mit [Erste Schritte](/getting-started) fort, um ein Backend zu konfigurieren und Ihren ersten Workflow auszuführen.
