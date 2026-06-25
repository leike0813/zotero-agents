# Workflow-Aufruf & -Konfiguration

## Aufrufmethoden

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_play.webp" alt="Run-Workflow-Schaltfläche in der Symbolleiste" title="Run-Workflow-Schaltfläche in der Symbolleiste" loading="lazy" /><figcaption>Run-Workflow-Schaltfläche in der Symbolleiste</figcaption></figure>

### Über das Kontextmenü

1. Wählen Sie einen oder mehrere Einträge in der Zotero-Eintragsliste aus
2. Klicken Sie mit der rechten Maustaste und wählen Sie das Untermenü **Zotero Agents**
3. Wählen Sie einen Workflow aus der Liste
4. Falls ein Konfigurationsdialog erscheint, füllen Sie die Parameter aus und klicken Sie auf Ausführen

### Über das Dashboard

1. Öffnen Sie das **Dashboard** (Symbolleistenschaltfläche oder Menü)
2. Suchen Sie den Ziel-Workflow in der Workflow-Liste auf der Startseite
3. Klicken Sie auf die Schaltfläche **Ausführen**
4. Falls ein Konfigurationsdialog erscheint, füllen Sie die Parameter aus und bestätigen Sie

## Workflow-Einstellungsdialog

Vor dem Ausführen eines Workflows kann ein Einstellungsdialog mit den folgenden Konfigurationsoptionen erscheinen:

### Parametereinstellungen

Zeigt alle vom Workflow deklarierten konfigurierbaren Parameter an, die je nach Workflow-Definition variieren.

### Provider-Optionen

| Option | Beschreibung |
|------|------|
| Backend-Auswahl | Wählen Sie die Backend-Instanz zur Ausführung dieses Workflows |
| Modell-Auswahl | Das zu verwendende KI-Modell (vom Backend bereitgestellt) |
| Moduseinstellungen | Konfiguration des Ausführungsmodus |
| Reasoning Effort | Reasoning-Intensitätsstufe (falls vom Backend unterstützt) |

### Ausführungsmodi

| Modus | Beschreibung |
|------|------|
| `auto` | Automatische Ausführung, keine Benutzereingriffe erforderlich |
| `sync` | Synchrone Ausführung, auf Ergebnisse warten |
| `async` | Asynchrone Ausführung, läuft im Hintergrund |

### SkillRunner-Modi

Für Skill-Runner-Backends:

| Modus | Beschreibung |
|------|------|
| `auto` | Nicht-interaktive Ausführung, geeignet für Skills ohne Benutzereingabe |
| `interactive` | Interaktive Ausführung, kann Benutzereingaben während der Ausführung erfordern |

## Ausführung & Überwachung

- Nach dem Absenden einer Aufgabe können Sie den Ausführungsfortschritt im Dashboard verfolgen
- Echtzeit-Statusaktualisierungen (Warteschlange → läuft → erfolgreich/fehlgeschlagen/abgebrochen)
- Bei interaktiven Workflows können Sie auf Aufgaben antworten, die auf Eingaben warten, in der Seitenleiste
- Nach Abschluss der Ausführung werden die Ergebnisse über Hook-Skripte auf Zotero angewendet

## Hinweise

- Beim ersten Ausführen eines Workflows kann eine Backend-Konfiguration erforderlich sein
- Einige Workflows haben möglicherweise spezielle Eingabeanforderungen (z. B. müssen Anhänge ausgewählt sein)
- Interaktive Workflows erfordern, dass Zotero weiterhin läuft, um Benutzereingaben zu verarbeiten
