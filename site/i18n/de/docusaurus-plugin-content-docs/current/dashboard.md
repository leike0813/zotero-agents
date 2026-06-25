# Dashboard

## Übersicht

Das Dashboard ist das zentrale Überwachungs- und Steuerungspanel für Zotero Agents. Hier können Sie den Aufgabenstatus einsehen, Workflows verwalten, den Verlauf durchsuchen und Laufzeit-Logs inspizieren.

## So öffnen Sie es

- **Symbolleistenschaltfläche**: Klicken Sie auf das Zotero-Agents-Symbol in der Zotero-Werkzeugleiste
- **Menü**: **Extras → Dashboard öffnen**
- **Zotero-Tab**: Über das Menü geöffnet, als eigenständiger Zotero-Tab angezeigt

![Zotero Agents Werkzeugleiste Dashboard-Schaltfläche](/img/icon_workbench.png)

## Seiten

### Startseite

Die Standardseite des Dashboards mit folgender Anzeige:

- **Workflow-Liste**: Alle verfügbaren Workflows mit Start- und Einstellungsschaltflächen
- **ACP-Chat-Bereich**: Schnellzugriff auf ACP-Konversationen
- **ACP Skill Runs**: Skill-Run-Status für ACP-Backends
- **Skill-Feedback**: Anzeige der letzten Skill-Run-Feedback-Bewertungen und Kommentare
- **Aufgabenübersicht**: Überblick über aktuell laufende Aufgaben

![Dashboard Startseite](/img/docs/dashboard_home.png)

### Workflow-Optionen

Die Seite für Workflow-Parameter-Einstellungen:

- Konfiguration jedes Workflows anzeigen und ändern
- Standardparameter festlegen
- Standard-Backend auswählen

![Dashboard Workflow-Optionen-Seite](/img/docs/dashboard_workflow-settings.png)

### Backends

Die Backend-Verwaltungsseite:

- Liste aller konfigurierten Backends
- Aufgabenverlauf für jedes Backend
- Backend-Detailansichten (je nach Typ unterschiedlich)

Backend-Detailansichten:

| Backend-Typ | Anzeige |
|-------------|---------|
| Generic HTTP | Aufgabentabelle + Laufzeit-Logs |
| SkillRunner | Run-Tabelle + Statusbereich + Konversationsbereich + Antwort-/Abbruchaktionen |
| ACP | Skill-Run-Ansicht |

![Dashboard ACP-Backend Aufgabenliste](/img/docs/dashboard_acp-backend.png)

![Dashboard SkillRunner-Backend Aufgabenliste](/img/docs/dashboard_skillrunner-backend.png)

### Produkte

Durchsuchen und Verwalten von Workflow-Produkten:

- Ausgabeartefakte aus Workflow-Ausführungen anzeigen
- Produktordner öffnen
- Produkte in der Vorschau anzeigen und entfernen

![Dashboard Produktspeicher](/img/docs/dashboard_products.png)

## Skill-Feedback

Das Skill-Feedback-Panel zeigt die letzten Skill-Run-Feedbacks an:

| Spalte | Beschreibung |
|--------|-------------|
| Workflow | Name des ausgeführten Workflows |
| Backend | Das Backend, das den Run ausgeführt hat |
| Bewertung | Benutzerbewertung (1–5) |
| Kommentar | Feedback-Kommentar |
| Zeitstempel | Zeitpunkt der Feedback-Einreichung |

Aktionen:
- **Filter**: Nach Bewertung, Workflow oder Zeitraum filtern
- **Export**: Feedback-Daten zur Analyse exportieren

![Dashboard Skill-Feedback Speicher](/img/docs/dashboard_skill-feedback.png)

## Aufgabenstatus

| Status | Beschreibung |
|--------|-------------|
| `queued` | Wartet auf Ausführung |
| `running` | Wird gerade ausgeführt |
| `waiting_user` | Wartet auf Benutzereingabe |
| `waiting_auth` | Wartet auf Autorisierung |
| `succeeded` | Ausführung erfolgreich |
| `failed` | Ausführung fehlgeschlagen |
| `canceled` | Abgebrochen |

## Laufzeit-Log-Betrachter

Das Dashboard enthält einen integrierten Log-Betrachter:

- Filterung nach Backend
- Filterung nach Workflow
- Filterung nach Log-Level
- Filterung nach Zeitraum
- Diagnose-Export
- Kopieren der Problemzusammenfassung

![Dashboard Laufzeit-Log-Betrachter](/img/docs/dashboard_logs.png)

## Symbolleistenschaltfläche

Die Zotero-Agents-Symbolschaltfläche in der Zotero-Werkzeugleiste unterstützt:

- Linksklick: Dashboard öffnen/umschalten
- Zeigt die Anzahl der laufenden Aufgaben an
- Zeigt ein Popup mit der Liste der laufenden Aufgaben
