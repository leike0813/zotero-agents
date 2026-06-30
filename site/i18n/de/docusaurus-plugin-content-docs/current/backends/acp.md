# ACP-Backend-Konfiguration

## Was ist ACP?

ACP (Agent Client Protocol) ist ein Protokoll zur Kommunikation mit Agent-Backends. Zotero Agents kommuniziert über das ACP-Protokoll mit lokal laufenden Agent-Prozessen (wie Codex, Claude Code, OpenCode usw.), um Unterhaltungen und Skill-Ausführung zu ermöglichen.

Das ACP-Backend ist die **empfohlene** Konfigurationsmethode — solange Sie ein ACP-kompatibles Agent-Tool auf Ihrem Rechner installiert haben, können Sie es direkt ohne zusätzliche Konfiguration verwenden.

## Neu bei Agent?

Wenn Sie zum ersten Mal mit Agent-Tools arbeiten und nicht wissen, welches Sie wählen oder wie Sie es installieren sollen, finden Sie hier eine Anleitung:

**[Agent-Einstiegsleitfaden](https://agent.ps5.online)**

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

Das Plugin bietet mehrere integrierte Presets. Nach Klick auf **Aus Preset hinzufügen** wählst du links einen Agent und rechts werden Startoptionen sowie eine schreibgeschützte Konfigurationsvorschau angezeigt.

**Mit npx starten** wechselt den Befehl in die Form `npx <package>` und zeigt einen Hinweis auf die benötigte Installation von Node.js und npm an. Codex und Claude Code verwenden standardmäßig npx, da sie auf den ACP-Adapter angewiesen sind; andere Agents verwenden standardmäßig den bloßen Befehl. Nach Aktivierung von npx wird dem Profil-Anzeigenamen das Suffix `(npm)` angehängt.

**Isolierte Umgebung** ist nur für Agents verfügbar, die Isolierung unterstützen. Nach dem Aktivieren injiziert das Plugin die dokumentierten Isolierungs-Umgebungsvariablen oder Session-Verzeichnis-Argumente in die Vorschau und zeigt einen Hinweis an, dass Agent-Optionen und Authentifizierung in diesem Verzeichnis selbst verwaltet werden müssen. Nach Aktivierung der Isolierung wird dem Profil-Anzeigenamen das Suffix `(Isolated)` angehängt.

![ACP-Preset-Dialog](/img/docs/backends/backend-manager_ACP-preset.png)

| Voreinstellung | Standardbefehl | Beschreibung |
|------|------|------|
| **OpenCode** | `opencode acp` | OpenCode-ACP-Backend; unterstützt isoliertes Konfigurationsverzeichnis über `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | ACP-Adapter für OpenAI Codex |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | ACP-Adapter für Claude Code |
| **Gemini CLI** | `gemini --experimental-acp` | Gemini-CLI-ACP-Modus |
| **Hermes** | `hermes acp` | Hermes-Agent-ACP-Backend |
| **Qwen Code** | `qwen --acp --experimental-skills` | Qwen-Code-ACP-Modus |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub-Copilot-CLI-ACP-Modus |
| **Qoder CLI** | `qodercli --acp` | Qoder-CLI-ACP-Modus; unterstützt isoliertes Konfigurationsverzeichnis über `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor-Agent-ACP-Adapter; unterstützt isoliertes Session-Verzeichnis über `--session-dir` |
| **DeepAgents** | `deepagents-acp` | DeepAgents-ACP-Adapter |
| **Auggie** | `auggie --acp` | Auggie-ACP-Modus |
| **Kilo** | `kilo acp` | Kilo-Code-ACP-Modus |
| **Cline** | `cline --acp` | Cline-ACP-Modus |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy-ACP-Modus |
| **Grok** | `grok agent stdio` | Grok-Agent-Stdio-Modus |

Nur OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code und Hermes Agent wurden getestet. Die Verfügbarkeit anderer ACP-Backends hängt von deren Backend-Implementierungen ab und wird von diesem Plugin nicht garantiert. Bei Problemen kannst du Befehlsargumente und Umgebungsvariablen selbst anpassen; maßgeblich sind das ACP-Protokoll und die offizielle Dokumentation des jeweiligen Backends.

Nach Auswahl eines Presets können Sie weiterhin jedes Feld manuell bearbeiten.

## Empfehlungen zur Umgebungsvariablenkonfiguration

Einige Agenten unterstützen Konfigurationsisolierung und Sitzungsperistenz über Umgebungsvariablen; fügen Sie diese einfach im Umgebungsvariablen-Editor hinzu:

| Umgebungsvariable | Agent | Zweck |
|---------------------|-------|---------|
| `OPENCODE_CONFIG` | OpenCode | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `OPENCODE_SESSION_DIR` | OpenCode | Ein Sitzungsperistenzverzeichnis festlegen |
| `CODEX_CONFIG_DIR` | Codex | Ein unabhängiges Konfigurationsverzeichnis festlegen |

## Kostenlose Modelloptionen

Mehrere Engines bieten **kostenlosen Modellzugriff** — ideal für den Einstieg ohne Bezahlung:

| Engine | Kostenlose Option | Funktionsweise |
|--------|-------------------|----------------|
| **Kilo Code** | Auto Free-Modus | Der integrierte Auto Free-Modus von Kilo Code leitet jede Anfrage automatisch an ein geeignetes kostenloses Modell weiter. In den Kilo Code-Einstellungen aktivieren — kein API-Key erforderlich |
| **OpenCode Zen** | Integrierte kostenlose Modelle | Die [OpenCode Zen](https://opencode.ai/zen)-Edition enthält kostenlosen Modellzugriff ohne API-Abonnement |
| **OpenCode + OpenRouter** | Kostenlose OpenRouter-Modelle | Konfigurieren Sie OpenCode zur Nutzung von [OpenRouter](https://openrouter.ai/) und wählen Sie kostenlose Modelle (z. B. Gemini 2.5 Flash, DeepSeek V3). Ein kostenloses OpenRouter-Konto ist erforderlich |

### Einschränkungen der kostenlosen Stufe

Kostenlose Modelle sind für die gelegentliche Nutzung ausreichend, beachten Sie jedoch folgende Einschränkungen:

| Einschränkung | Auswirkung |
|--------------|------------|
| **Ratenbegrenzung** | Anfragen können gedrosselt werden — je nach Anbieterlast 5–20 Anfragen pro Minute. Stapelverarbeitung wird deutlich verlangsamt |
| **Gleichzeitigkeit** | In der Regel auf eine gleichzeitige Anfrage beschränkt. Mehrere gleichzeitige Workflows können in die Warteschlange gestellt werden oder fehlschlagen |
| **Modellverfügbarkeit** | Kostenlose Modellpools können zu Spitzenzeiten erschöpft sein. Fehler wie „Modell nicht verfügbar" oder „Kapazität überschritten" können auftreten |
| **Modellwechsel** | Anbieter können kostenlose Modelle ohne Vorankündigung austauschen (Upgrade oder Downgrade). Die Ausgabequalität kann zwischen Durchläufen variieren |
| **Keine SLA / Zuverlässigkeit** | Kostenlose Stufen bieten keine Verfügbarkeitsgarantie. Dienste können vorübergehend nicht verfügbar sein oder eingestellt werden |

> Wenn Sie zuverlässige Stapelverarbeitung oder produktive Nutzung benötigen, ziehen Sie einen kostenpflichtigen Plan wie [OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW) (10 $/Monat) oder einen Coding Plan (Bailian, Zhipu usw.) in Betracht. Die Kosten pro Artikel sind im Vergleich zur Zeitersparnis vernachlässigbar.

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
