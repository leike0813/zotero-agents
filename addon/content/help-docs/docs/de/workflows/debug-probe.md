# Debug Probe

## Zweck

Das Debug-Probe-Paket wird hauptsächlich für Workflow-System-Entwicklungstests und Problemdiagnose verwendet. Es enthält mehrere Debug-Only-Workflows, die `applyResult`-Verträge, Sequence Orchestration, interaktive Ausführung und Host-Bridge-Konnektivitätsszenarien abdecken.

Alle Debug-Workflows sind mit `debug_only: true` markiert und nur im Debug-Modus sichtbar.

## Enthaltene Debug-Workflows

### Apply-Vertrags-Debugging

Verschiedene Aufrufkombinationen von `buildRequest` / `applyResult`-Hooks überprüfen:

| Workflow | Beschreibung |
|---------|------|
| Debug: Apply Single Result | Einzelner Job + Ergebnis-Abrufmethode |
| Debug: Apply Single Bundle | Einzelner Job + Bundle-Abrufmethode |
| Debug: Apply Sequence Result | Mehrstufige Sequenz + Ergebnis-Abruf |
| Debug: Apply Sequence Bundle | Mehrstufige Sequenz + Bundle-Abruf |
| Debug: Apply Bundle Then Result | Bundle gefolgt von Ergebnis-Kombinationsaufruf |
| Debug: Apply Result Then Bundle | Ergebnis gefolgt von Bundle-Kombinationsaufruf |

### Sequence-Debugging

Den mehrstufigen Koordinierungsmechanismus der Sequence Orchestration überprüfen:

| Workflow | Beschreibung |
|---------|------|
| Debug Sequence Linear Probe | Lineare Ausführung und Standard-Relaisübergabe (pass_through) überprüfen |
| Debug Sequence Workspace Reuse Probe | Arbeitsbereichsübergreifende Wiederverwendung überprüfen (workspace: reuse-workflow) |
| Debug Sequence Context Isolation Probe | Explizite Relaisfilterung und isolierten Arbeitsbereich überprüfen (workspace: new + handoff selektives Mapping) |

### Interaktives Debugging

Interaktive Workflows überprüfen, die Benutzerrückfragen erfordern:

| Workflow | Beschreibung |
|---------|------|
| Debug: Interactive Choice Probe | Den interaktiven Auswahlablauf überprüfen |
| Debug: Interactive Then Result | Interaktive Ausführung gefolgt von Ergebnis-Abruf |

### Host-Bridge-Debugging

| Workflow | Beschreibung |
|---------|------|
| Debug: Host Bridge Connectivity Probe | Host-Bridge-Konnektivität und Berechtigungen überprüfen |

### Allgemein

| Workflow | Beschreibung |
|---------|------|
| Workflow Debug Probe | Workflow-Vor-Ausführungszustand überprüfen und das Diagnosepanel öffnen |

## Wann verwenden

- Verhalten nach der Entwicklung oder Änderung des Workflow-Systems überprüfen
- Abnormale Workflow-Ausführungsprobleme beheben
- Den Relaismechanismus der Sequence Orchestration überprüfen
- Überprüfen, ob der `applyResult`-Hook-Vertrag den Erwartungen entspricht
- Host-Bridge-Konnektivität und Berechtigungskonfiguration überprüfen

## Abhängigkeiten

- **Backend**: Skill-Runner-Dienst
- Alle mit `debug_only` markiert, erscheinen nur im Debug-Modus

## Nächste Schritte

- [Debugging & Tests](#doc/workflows%2Fcustom%2Fdebugging) — Debugging-Methoden für benutzerdefinierte Workflows
- [Hook-System](#doc/workflows%2Fcustom%2Fhooks) — Hook-API-Signaturen und -Verwendung
