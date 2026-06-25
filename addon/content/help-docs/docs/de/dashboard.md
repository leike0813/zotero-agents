# Dashboard

## Übersicht

Das Dashboard ist das zentrale Überwachungs- und Steuerungspanel für Zotero Agents. Hier können Sie den Aufgabenstatus einsehen, Workflows verwalten, den Verlauf durchsuchen und Laufzeit-Logs inspizieren.

## So öffnen Sie es

- **Symbolleistenschaltfläche**: Klicken Sie auf das Zotero-Agents-Symbol in der Zotero-Werkzeugleiste
- **Menü**: **Extras → Dashboard öffnen**
- **Zotero-Tab**: Über das Menü geöffnet, als eigenständiger Zotero-Tab angezeigt

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_workbench.webp" alt="Zotero Agents Werkzeugleiste Dashboard-Schaltfläche" title="Zotero Agents Werkzeugleiste Dashboard-Schaltfläche" loading="lazy" /><figcaption>Zotero Agents Werkzeugleiste Dashboard-Schaltfläche</figcaption></figure>

## Seiten

### Startseite

Die Standardseite des Dashboards mit folgender Anzeige:

- **Workflow-Liste**: Alle verfügbaren Workflows mit Start- und Einstellungsschaltflächen
- **ACP-Chat-Bereich**: Schnellzugriff auf ACP-Konversationen
- **ACP Skill Runs**: Skill-Run-Status für ACP-Backends
- **Skill-Feedback**: Anzeige der letzten Skill-Run-Feedback-Bewertungen und Kommentare
- **Aufgabenübersicht**: Überblick über aktuell laufende Aufgaben

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_home.webp" alt="Dashboard Startseite" title="Dashboard Startseite" loading="lazy" /><figcaption>Dashboard Startseite</figcaption></figure>

### Workflow-Optionen

Die Seite für Workflow-Parameter-Einstellungen:

- Konfiguration jedes Workflows anzeigen und ändern
- Standardparameter festlegen
- Standard-Backend auswählen

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_workflow-settings.webp" alt="Dashboard Workflow-Optionen-Seite" title="Dashboard Workflow-Optionen-Seite" loading="lazy" /><figcaption>Dashboard Workflow-Optionen-Seite</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_acp-backend.webp" alt="Dashboard ACP-Backend Aufgabenliste" title="Dashboard ACP-Backend Aufgabenliste" loading="lazy" /><figcaption>Dashboard ACP-Backend Aufgabenliste</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skillrunner-backend.webp" alt="Dashboard SkillRunner-Backend Aufgabenliste" title="Dashboard SkillRunner-Backend Aufgabenliste" loading="lazy" /><figcaption>Dashboard SkillRunner-Backend Aufgabenliste</figcaption></figure>

### Produkte

Durchsuchen und Verwalten von Workflow-Produkten:

- Ausgabeartefakte aus Workflow-Ausführungen anzeigen
- Produktordner öffnen
- Produkte in der Vorschau anzeigen und entfernen

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_products.webp" alt="Dashboard Produktspeicher" title="Dashboard Produktspeicher" loading="lazy" /><figcaption>Dashboard Produktspeicher</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skill-feedback.webp" alt="Dashboard Skill-Feedback Speicher" title="Dashboard Skill-Feedback Speicher" loading="lazy" /><figcaption>Dashboard Skill-Feedback Speicher</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_logs.webp" alt="Dashboard Laufzeit-Log-Betrachter" title="Dashboard Laufzeit-Log-Betrachter" loading="lazy" /><figcaption>Dashboard Laufzeit-Log-Betrachter</figcaption></figure>

## Symbolleistenschaltfläche

Die Zotero-Agents-Symbolschaltfläche in der Zotero-Werkzeugleiste unterstützt:

- Linksklick: Dashboard öffnen/umschalten
- Zeigt die Anzahl der laufenden Aufgaben an
- Zeigt ein Popup mit der Liste der laufenden Aufgaben
