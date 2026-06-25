# ACP-Backend-Konfiguration

## Was ist ACP?

ACP (Agent Client Protocol) ist ein Protokoll zur Kommunikation mit Agent-Backends. Zotero Agents kommuniziert über das ACP-Protokoll mit lokal laufenden Agent-Prozessen (wie Codex, Claude Code, OpenCode usw.), um Unterhaltungen und Skill-Ausführung zu ermöglichen.

Das ACP-Backend ist die **empfohlene** Konfigurationsmethode — solange Sie ein ACP-kompatibles Agent-Tool auf Ihrem Rechner installiert haben, können Sie es direkt ohne zusätzliche Konfiguration verwenden.

## Warum ACP an erster Stelle?

- **Kein Konfigurationsaufwand**: Keine zusätzlichen Dienste bereitstellen; verwenden Sie die Agent-Tools, die bereits auf Ihrem Rechner vorhanden sind
- **Automatische Prozessverwaltung**: Das Plugin gibt den Startbefehl in der Konfiguration vor und verwaltet den Agent-Prozesslebenszyklus automatisch
- **Multi-Agent-Unterstützung**: Konfigurieren Sie mehrere verschiedene Agent-Backends gleichzeitig und wechseln Sie nach Bedarf zwischen ihnen
- **Konfigurationsisolierung**: Einige Agenten (wie OpenCode und Codex) unterstützen die Isolierung von Konfigurationsverzeichnissen und Sitzungsperistenzverzeichnissen über Umgebungsvariablen

## Konfigurationsschritte

1. Stellen Sie sicher, dass mindestens ein ACP-kompatibles Agent-CLI-Tool auf Ihrem Rechner installiert ist
2. Öffnen Sie **Werkzeuge → [Backend-Manager](backend-manager)**
3. Wechseln Sie zur Registerkarte **ACP**
4. Wählen Sie Ihr Agent-Tool aus dem Dropdown-Menü **Aus Voreinstellung hinzufügen**, oder klicken Sie auf **ACP hinzufügen**, um manuell zu konfigurieren
5. Füllen Sie die folgenden Felder aus:
   - **Anzeigename**: Ein benutzerfreundlicher Name (z. B. „Mein OpenCode")
   - **Befehl**: Befehl zum Starten des ACP-Backends (Voreinstellungen füllen automatisch aus, aber Sie können auch manuell bearbeiten)
   - **Argumente**: Zusätzliche Argumente für den Befehl (optional)
   - **Umgebungsvariablen**: Zusätzliche Umgebungsvariablen (optional, für Konfigurationsisolierung usw.)
6. Klicken Sie auf **Speichern** in der unteren rechten Ecke

### Verbindungsüberprüfung

Nach dem Speichern erkennt das Plugin automatisch die Fähigkeiten des Backends:
- Prüft, ob der Befehl vorhanden ist
- Stellt eine Verbindung her und initialisiert
- Ruft verfügbare Modelle und Modi ab
- Berechnet einen Konfigurations-Fingerabdruck, um nachfolgende Änderungen zu erkennen

Wenn die Erkennung fehlschlägt, überprüfen Sie, ob das Agent-CLI korrekt installiert ist und das Befehlsformat stimmt.

## Unterstützte Agent-Voreinstellungen

Das Plugin bietet mehrere eingebaute Voreinstellungen, die Sie direkt aus dem Dropdown-Menü **Aus Voreinstellung hinzufügen** auswählen können:

| Voreinstellung | Befehl | Beschreibung |
|--------|---------|-------------|
| **Codex** | `npx codex acp` | Offizieller Coding-Agent von OpenAI |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` | Offizielles CLI von Anthropic |
| **OpenCode** | `npx opencode-ai@latest acp` | Allgemeines Agent-Framework mit Unterstützung für Umgebungsvariablenisolierung |
| **Gemini CLI** | `npx @google/gemini-cli acp` | Google Gemini |
| **Hermes** | `npx hermes acp` | Hermes Agent |
| **Qwen Code** | `qwen-code acp` | Qwen Code |

Sie können nach Auswahl einer Voreinstellung weiterhin jedes Feld manuell bearbeiten.

## Empfehlungen zur Umgebungsvariablenkonfiguration

Einige Agenten unterstützen Konfigurationsisolierung und Sitzungsperistenz über Umgebungsvariablen; fügen Sie diese einfach im Umgebungsvariablen-Editor hinzu:

| Umgebungsvariable | Agent | Zweck |
|---------------------|-------|---------|
| `OPENCODE_CONFIG` | OpenCode | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `OPENCODE_SESSION_DIR` | OpenCode | Ein Sitzungsperistenzverzeichnis festlegen |
| `CODEX_CONFIG_DIR` | Codex | Ein unabhängiges Konfigurationsverzeichnis festlegen |

## Anfragetypen

Das ACP-Backend unterstützt zwei Anfragetypen:
- `acp.prompt.v1` — Konversationsinteraktion (ACP-Chat)
- `acp.skill.run.v1` — Skill-Ausführung (ACP-Skills)

Dasselbe ACP-Backend kann gleichzeitig sowohl für Unterhaltungen als auch für Skill-Ausführungen verwendet werden.

## Sitzungsverwaltung

- Jedes Backend kann mehrere Sitzungen (Unterhaltungen) haben, die dauerhaft in der Plugin-Datenbank gespeichert werden
- Verschiedene ACP-Backends können gleichzeitig laufen, ohne sich gegenseitig zu beeinträchtigen
- Sitzungen können im [ACP-Chat](../sidebar/acp-chat) verwaltet werden

## Nächste Schritte

Nach Abschluss der Konfiguration können Sie:
- Im [Seitenleisten-ACP-Chat](../sidebar/acp-chat) mit dem Backend chatten
- ACP-Skill-Ausführungen im [Dashboard](../dashboard) anzeigen
- Das ACP-Backend zur Ausführung von Aufgaben in der [Workflow-Liste](../workflows/) verwenden
